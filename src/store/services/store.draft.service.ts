import { Injectable, BadRequestException, ConflictException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { StoreService, READY_FOR_PENDING_STATES, PENDING_STATE } from './store.service';
import { StoreDraftRepository } from '../repositories/store.draft.repository';
import { NisitService } from 'src/nisit/nisit.service';
import { CreateStoreRequestDto, CreateStoreResponseDto, mapToCreateResponse } from '../dto/create-store.dto';
import { GoodsType, Prisma, Store, StoreMemberStatus, StoreState, StoreType } from '@generated/prisma';
import { UpdateDraftStoreRequestDto, UpdateDraftStoreResponseDto } from '../dto/update-store.dto';
import { StoreResponseDto } from '../dto/store-response.dto';
import { StorePendingValidationResponseDto } from '../dto/store-validation.dto';
import { StoreStatusResponseDto } from '../dto/store-state.dto'

@Injectable()
export class StoreDraftService extends StoreService {
  constructor(
    private readonly draftRepo: StoreDraftRepository,
    nisitService: NisitService,
  ) {
    super(draftRepo, nisitService);
  }

  async createForUser(
    nisitId: string,
    myGmail: string,
    createDto: CreateStoreRequestDto,
  ): Promise<CreateStoreResponseDto> {
    const nisit = await this.draftRepo.findNisitByNisitId(nisitId);
    if (!nisit) throw new UnauthorizedException('Nisit profile required before accessing store data.');
    if (nisit.storeId) throw new ConflictException('You already have a store assigned.');
    const existingOwnedStore = await this.draftRepo.findStoreByAdminNisitId(nisitId);
    if (existingOwnedStore) {
      throw new ConflictException('You are already a store admin.');
    }

    const raw = [
      ...(createDto.memberGmails ?? []),
      myGmail,
    ];
    const normalized = Array.from(
      new Set(raw.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    );

    if (normalized.length < 3) {
      throw new BadRequestException('At least 3 member emails are required.');
    }

    // หารายชื่อนิสิตที่ส่งมาว่าสมัครหรือยัง
    const found = await this.draftRepo.findNisitsByGmails(normalized);
    const foundMapEmail = new Map(
      found
        .map((x) => {
          const email = (x as any).gmail?.toLowerCase?.() ?? (x as any).email?.toLowerCase?.();
          return email ? [email, x] as const : null;
        })
        .filter(Boolean) as ReadonlyArray<readonly [string, typeof found[number]]>,
    );

    const alreadyAssigned = found.filter((x) => x.storeId);
    if (alreadyAssigned.length) {
      const list = alreadyAssigned
        .map((x) => ((x as any).gmail ?? (x as any).email))
        .join(', ');
      throw new ConflictException(`Members already assigned to another store: ${list}`);
    }

    const registeredEmails = new Set(foundMapEmail.keys());
    const missingEmails = normalized.filter((e) => !registeredEmails.has(e));

    const storeType = createDto.type ?? StoreType.Nisit;

    let state: StoreState;
    if (missingEmails.length > 0) {
      state = StoreState.CreateStore;
    } else {
      state = StoreState.Pending;
    }

    // รวมข้อมูลเพื่อสร้างร้าน
    const storeData = {
      storeName: createDto.storeName.trim(),
      type: storeType,
      // goodType: createDto.goodType ?? GoodsType.Food,
      state,
      storeAdmin: {
        connect: { nisitId }, // 👈 ใช้ relation connect
      },
      ...(storeType === StoreType.Club && {
        clubInfo: {
          create: {},
        },
      }),
    };

    try {
      const created = await this.draftRepo.createStoreWithMembersAndAttempts({
        storeData,
        memberNisitIds: found.map((x) => x.nisitId),
        missingEmails,
      });
      
      return mapToCreateResponse(created, missingEmails);
    } catch(err) {
      throw this.transformPrismaError(err);
    }
  }

  async updateMyDraftStore(nisitId: string, dto: UpdateDraftStoreRequestDto): Promise<UpdateDraftStoreResponseDto> {
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    if ((dto as any)?.storeAdminNisitId !== undefined) {
      throw new ForbiddenException('Store admin cannot be changed.');
    }

    const storeId = await this.ensureStoreAndPermissionIdForNisit(nisitId);
    const store = await this.draftRepo.findStoreById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    const updateData = this.buildUpdateData(dto);
    const shouldUpdateMembers = Array.isArray(dto.memberEmails);
    let normalizedMemberEmails: string[] = [];
    let missingEmails: string[] = [];
    let foundMembers: Awaited<ReturnType<typeof this.draftRepo.findNisitsByGmails>> = [];

    if (shouldUpdateMembers) {
      const actor = await this.draftRepo.findNisitByNisitId(nisitId);
      if (!actor?.email) {
        throw new UnauthorizedException('Nisit profile required before accessing store data.');
      }

      normalizedMemberEmails = this.normalizeEmailsList(dto.memberEmails ?? []);
      normalizedMemberEmails = this.ensureEmailIncluded(normalizedMemberEmails, actor.email);

      if (normalizedMemberEmails.length < 3) {
        throw new BadRequestException('At least 3 member emails are required.');
      }

      foundMembers = await this.draftRepo.findNisitsByGmails(normalizedMemberEmails);
      const conflicts = foundMembers.filter(
        (member) => member.storeId && member.storeId !== storeId,
      );
      if (conflicts.length) {
        const list = conflicts.map((member) => member.email).join(', ');
        throw new ConflictException(`Members already assigned to another store: ${list}`);
      }

      const foundMap = new Map(
        foundMembers.map((member) => [member.email?.toLowerCase(), member]),
      );
      missingEmails = normalizedMemberEmails.filter((email) => !foundMap.has(email));

      const stateAfterMembers = this.resolveStateAfterMemberUpdate(store, missingEmails.length === 0);
      if (stateAfterMembers) {
        updateData.state = stateAfterMembers;
      }
    }

    // if (dto.boothMediaId !== undefined) {
    //   const boothMediaId =
    //     typeof dto.boothMediaId === 'string' ? dto.boothMediaId.trim() : null;
    //   if (boothMediaId) {
    //     updateData.state = StoreState.ProductDetails;
    //   }
    // }

    if (!shouldUpdateMembers && Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }

    try {
      await this.draftRepo.client.$transaction(async (tx) => {
        if (shouldUpdateMembers) {
          await this.syncMembersAndAttemptsTx(tx, {
            storeId,
            foundMembers,
            missingEmails,
          });
        }

        if (Object.keys(updateData).length > 0) {
          await tx.store.update({
            where: { id: storeId },
            data: updateData,
          });
          return;
        }

        const current = await tx.store.findUnique({ where: { id: storeId } });
        if (!current) {
          throw new NotFoundException('Store not found after update.');
        }
      });

      return this.buildDraftUpdateResponse(storeId);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async getStoreDraft(store: StoreStatusResponseDto, nisitId: number) {

    if (!store) throw new NotFoundException('Store not found');
    const state = store.state
    if (!state) {
      throw new UnauthorizedException('Missing state context.')
    }

    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.')
    }

    if (state == "CreateStore") {
      const memberEmails = await this.getStoreMemberEmailsByStoreId(store.id)
      const storeDraft = {
        ...store,
        memberEmails: memberEmails
      }
      return storeDraft
    } else if (state == "ClubInfo" && store.type == StoreType.Club) {
      const clubInfo = await this.repo.findClubInfoByStoreId(store.id)
      const storeDraft = {
        ...store,
        clubInfo: clubInfo?.clubInfo
      }
      return storeDraft
    } else if (state == "StoreDetails") {
      const layoutMediaId = await this.repo.findBoothMediaIdByStoreId(store.id)
      const storeDraft = {
        ...store,
        boothMediaId: layoutMediaId
      }
      return storeDraft
    } else if (state == "ProductDetails") {
      const storeDraft = {
        ...store,
      }
      return storeDraft;
    }
  }

  private resolveStateAfterMemberUpdate(store: Store, noMissingMembers: boolean): StoreState | undefined {
    if (!noMissingMembers) {
      return store.state === StoreState.CreateStore ? StoreState.CreateStore : undefined;
    }

    if (store.state === StoreState.CreateStore) {
      // return store.type === StoreType.Club ? StoreState.ClubInfo : StoreState.StoreDetails;
      return StoreState.Pending;
    }

    return undefined;
  }

  private async buildDraftUpdateResponse(storeId: number): Promise<UpdateDraftStoreResponseDto> {
    const store = await this.draftRepo.client.store.findUnique({
      where: { id: storeId },
      select: {
        storeName: true,
        type: true,
        goodType: true,
        boothMediaId: true,
        storeAdminNisitId: true,
        members: { select: { email: true } },
        memberAttemptEmails: { select: { email: true, status: true } },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? null;
    const memberMap = new Map<string, string>();
    const missingMap = new Map<string, string>();

    const pushMember = (value?: string | null) => {
      const normalized = normalize(value);
      if (!normalized) return;
      if (!memberMap.has(normalized)) {
        memberMap.set(normalized, value?.trim() ?? normalized);
      }
    };

    for (const member of store.members ?? []) {
      pushMember(member.email);
    }

    for (const attempt of store.memberAttemptEmails ?? []) {
      pushMember(attempt.email);
      if (attempt.status === StoreMemberStatus.NotFound) {
        const normalized = normalize(attempt.email);
        if (normalized && !missingMap.has(normalized)) {
          missingMap.set(normalized, attempt.email?.trim() ?? normalized);
        }
      }
    }

    const sorter = (a: string, b: string) => a.localeCompare(b);

    return {
      storeName: store.storeName,
      type: store.type,
      goodType: store.goodType ?? null,
      memberEmails: Array.from(memberMap.values()).sort(sorter),
      missingProfileEmails: Array.from(missingMap.values()).sort(sorter),
      boothMediaId: store.boothMediaId ?? null,
      storeAdminNisitId: store.storeAdminNisitId!,
    };
  }
}
