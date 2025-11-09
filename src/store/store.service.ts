// src/store/store.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Goods,
  Nisit,
  Prisma,
  Store,
  StoreRole,
  StoreState,
  StoreType,
} from '@generated/prisma';
import {
  CreateStoreRequestDto,
  CreateStoreResponseDto,
  mapToCreateResponse,
} from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreMemberEmailsResponseDto, StoreResponseDto } from './dto/store-response.dto';
import { StoreRepository } from './store.repository';
import { StoreStatusResponseDto } from './dto/store-state.dto'
import { StoreMemberStatus } from '@generated/prisma'
import { NisitService } from 'src/nisit/nisit.service';
import { UpdateClubInfoRequestDto } from './dto/update-clubInfo.dto';
import { CreateGoodDto, GoodsResponseDto, UpdateGoodDto } from './dto/goods.dto';

type MemberEmailStatus = {
  email: string
  status: 'joined' | StoreMemberStatus
}

@Injectable()
export class StoreService {
  constructor(
    private readonly repo: StoreRepository,
    private readonly nisitService: NisitService
  ) {}

  async createForUser(
    nisitId: string,
    myGmail: string,
    createDto: CreateStoreRequestDto
  ): Promise<CreateStoreResponseDto> {
    const nisit = await this.repo.findNisitByNisitId(nisitId);
    if (!nisit) throw new UnauthorizedException('Nisit profile required before accessing store data.');
    if (nisit.storeId) throw new ConflictException('You already have a store assigned.');

    // 1) เตรียมรายการอีเมลสมาชิก (normalize: trim + toLowerCase + unique)
    const raw = [
      ...(createDto.memberGmails ?? []),
      myGmail,
    ]
    const normalized = Array.from(
      new Set(raw.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    );

    if (normalized.length < 3) {
      throw new BadRequestException('At least 3 member emails are required.');
    }

    // 2) ดึง Nisit ของสมาชิกทั้งหมดตามอีเมล
    const found = await this.repo.findNisitsByGmails(normalized);
    const foundMapEmail = new Map(
      found
        .map((x) => {
          const email = (x as any).gmail?.toLowerCase?.() ?? (x as any).email?.toLowerCase?.();
          return email ? [email, x] as const : null;
        })
        .filter(Boolean) as ReadonlyArray<readonly [string, typeof found[number]]>
    );

    // 2.1) ถ้าใครมีร้านอยู่แล้ว → ล้มทั้งรายการ (กติกางาน)
    const alreadyAssigned = found.filter((x) => x.storeId);
    if (alreadyAssigned.length) {
      const list = alreadyAssigned
        .map((x) => ((x as any).gmail ?? (x as any).email))
        .join(', ');
      throw new ConflictException(`Members already assigned to another store: ${list}`);
    }

    // 2.2) ถ้าเจอไม่ครบ → แจ้งรายการที่หายไป
    const registeredEmails = new Set(foundMapEmail.keys());
    const missingEmails = normalized.filter((e) => !registeredEmails.has(e));

    // console.log(missingEmails)

    // เช็ค type ก่อน
    const storeType = createDto.type ?? StoreType.Nisit

    // คำนวณ state ตาม business rule
    let state: StoreState

    if (missingEmails.length > 0) {
      // ยังหา member ไม่ครบ → ยังไม่ผ่าน step แรก
      state = StoreState.CreateStore
    } else if (storeType === StoreType.Club) {
      // Club + สมาชิกครบ → ไปขั้น ClubInfo ก่อน
      state = StoreState.ClubInfo
    } else {
      // Nisit + สมาชิกครบ → ไป StoreDetails ได้เลย
      state = StoreState.StoreDetails
    }

    // 3) เตรียม data สร้างร้าน
    const storeData: Prisma.StoreCreateInput = {
      storeName: createDto.storeName.trim(),
      type: storeType,
      state,

      ...(storeType === StoreType.Club && {
        clubInfo: {
          create: {},
        },
      }),
    }

    const created = await this.repo.createStoreWithMembersAndAttempts({
      storeData,
      memberNisitIds: found.map((x) => x.nisitId),
      missingEmails,
    })

    return mapToCreateResponse(created, missingEmails)

  }

  async updateClubInfo(
    actorNisitId: string,
    dto: UpdateClubInfoRequestDto,
  ) {
    const temp = await this.repo.findStoreByNisitId(actorNisitId)
    if (!temp) throw new NotFoundException('Store not found.');
    const storeId = temp?.id
    
    // 1) เอา store + members + clubInfo จาก repo
    const store = await this.repo.findStoreWithMembersAndClub(storeId);

    if (!store) throw new NotFoundException('Store not found.');
    if (store.type !== StoreType.Club) {
      throw new BadRequestException('Not a club store.');
    }

    // const isMember = store.members.some((m) => m.nisitId === actorNisitId);
    // if (!isMember) {
    //   throw new ForbiddenException('Not your store.');
    // }

    // 2) หา Nisit จาก leaderEmail (ถ้ามีในระบบ)
    // const nisit = await this.repo.findNisitByNisitId(dto.leaderId);

    const payload = {
      clubName: dto.clubName,
      clubApplicationMediaId: dto.clubApplicationMediaId,
      leaderFirstName: dto.leaderFirstName,
      leaderLastName: dto.leaderLastName,
      leaderEmail: dto.leaderEmail?.toLowerCase(),
      leaderPhone: dto.leaderPhone,
      leaderNisitId: dto.leaderNisitId,
    };


    // 3) ทำงานใน transaction ผ่าน prisma client จาก repo
    return this.repo.client.$transaction(async (tx) => {
      let clubInfoId = store.clubInfo?.id;

      if (!clubInfoId) {
        const created = await this.repo.createClubInfoForStore(
          tx,
          store.id,
          payload,
        );
        clubInfoId = created.id;
      } else {
        await this.repo.updateClubInfo(tx, clubInfoId, payload);
      }

      // ดึง store+clubInfo เวอร์ชันล่าสุดหลัง update
      let updated = await this.repo.findStoreWithClubInfoTx(tx, store.id);
      if (!updated) {
        throw new NotFoundException('Store not found after update.');
      }

      // console.log(updated)

      const complete = this.isObjectComplete(updated.clubInfo, [
        "clubName",
        "leaderFirstName",
        "leaderLastName",
        "leaderEmail",
        "leaderPhone",
        "leaderNisitId",
        "clubApplicationMediaId",
      ] as (keyof typeof updated.clubInfo)[]);

      // console.log(complete)

      // ขยับ state เฉพาะกรณี:
      // - เดิมอยู่ CreateStore
      // - และ club info ครบตามเกณฑ์
      if (updated.state === StoreState.ClubInfo && complete) {
        updated = await tx.store.update({
          where: { id: store.id },
          data: { state: StoreState.StoreDetails },
          include: { clubInfo: true },
        });
      }

      return {
        storeId:  updated.id,
        storeName: updated.storeName,
        type: updated.type,
        state: updated.state,
        clubInfo: updated.clubInfo
      };
    });
  }

  // async updateBoothLayoutMediaId() {

  // }

  async getStoreStatus(nisitId: string): Promise<StoreStatusResponseDto> {
    const store = await this.repo.findStoreByNisitId(nisitId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }
    
    const storeStatus = {
      id: store.id,
      storeName: store.storeName,
      type: store.type,
      state: store.state
    }

    return storeStatus
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

  async getStoreMemberEmailsByStoreId(storeId: number): Promise<MemberEmailStatus[]> {
    const store = await this.repo.findStoreById(storeId)
    if (!store) throw new NotFoundException('Store not found')

    // ต้องให้ repo คืน { members: {email}[], memberAttemptEmails: {email,status}[] }
    const memberEmails = await this.repo.findMemberEmailsByStoreId(storeId)
    // ถ้าไม่เจอข้อมูลเลยก็คืนลิสต์ว่าง (ไม่ต้อง throw)
    if (!memberEmails) return []

    const toNorm = (e?: string | null) => e?.trim().toLowerCase() || null

    // 1) เริ่มจาก attempts (ถูกเชิญ)
    const map = new Map<string, MemberEmailStatus>()
    for (const a of memberEmails.memberAttemptEmails ?? []) {
      const email = toNorm(a.email)
      if (!email) continue
      map.set(email, { email, status: a.status })
    }

    // 2) ทับด้วย members (สมาชิกจริง → joined)
    for (const m of memberEmails.members ?? []) {
      const email = toNorm(m.email)
      if (!email) continue
      map.set(email, { email, status: 'joined' })
    }

    // 3) แปลงเป็นอาเรย์ + เรียงตามอีเมล (optional)
    return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email))
  }

  // ---------- Goods CRUD ----------

  async listGoods(nisitId: string): Promise<GoodsResponseDto[]> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const goods = await this.repo.findGoodsByStoreId(storeId);
    return goods.map((good) => this.mapGoodResponse(good));
  }

  async createGood(nisitId: string, dto: CreateGoodDto): Promise<GoodsResponseDto> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const payload: Prisma.GoodsUncheckedCreateInput = {
      name: dto.name.trim(),
      type: dto.type,
      price: dto.price,
      storeId,
      goodMediaId: this.normalizeNullableString(dto.goodMediaId) ?? null,
    };

    try {
      const good = await this.repo.createGood(payload);
      return this.mapGoodResponse(good);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async getGood(nisitId: string, goodId: string): Promise<GoodsResponseDto> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const good = await this.ensureGoodBelongsToStore(goodId, storeId);
    return this.mapGoodResponse(good);
  }

  async updateGood(
    nisitId: string,
    goodId: string,
    dto: UpdateGoodDto
  ): Promise<GoodsResponseDto> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    await this.ensureGoodBelongsToStore(goodId, storeId);

    const data: Prisma.GoodsUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.goodMediaId !== undefined) {
      data.goodMediaId = this.normalizeNullableString(dto.goodMediaId);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }

    try {
      const updated = await this.repo.updateGood(goodId, data);
      return this.mapGoodResponse(updated);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async deleteGood(nisitId: string, goodId: string): Promise<void> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    await this.ensureGoodBelongsToStore(goodId, storeId);
    try {
      await this.repo.deleteGood(goodId);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  // async getStoreMemberStatus(nisitId: string): Promise<StoreMemberEmailsResponseDto> {
  //   const store = await this.repo.findStoreByNisitId(nisitId);
  //   if (!store) {
  //     throw new NotFoundException('Store not found.');
  //   }
  // }
    
  //   const storeStatus = {
  //     id: store.id,
  //     storeName: store.storeName,
  //     type: store.type,
  //     state: store.state
  //   }

  //   return storeStatus
  // }

  async updateStoreInfo(userSub: string, updateDto: UpdateStoreDto): Promise<StoreResponseDto> {
    const nisit = await this.resolveNisit(userSub);

    if (!nisit.storeId) {
      throw new NotFoundException('Store not found for current user.');
    }
    // if (nisit.storeRole && nisit.storeRole !== StoreRole.Leader) {
    //   throw new ForbiddenException('Only store leaders can update store info.');
    // }

    const data = this.buildUpdateData(updateDto);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }

    try {
      const store = await this.repo.updateStore(nisit.storeId, data);
      return this.mapToResponse(store);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  // ---------- helpers ----------
  private async resolveNisit(userSub: string): Promise<Nisit> {
    const identity = await this.repo.findIdentityWithInfoByProviderSub('google', userSub);
    if (!identity?.info) {
      throw new UnauthorizedException('Nisit profile required before accessing store data.');
    }
    return identity.info;
  }

  private async ensureStoreIdForNisit(nisitId: string): Promise<number> {
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    const store = await this.repo.findStoreByNisitId(nisitId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }
    return store.id;
  }

  private async ensureGoodBelongsToStore(goodId: string, storeId: number): Promise<Goods> {
    const good = await this.repo.findGoodById(goodId);
    if (!good || good.storeId !== storeId) {
      throw new NotFoundException('Good not found.');
    }
    return good;
  }

  private buildUpdateData(dto: UpdateStoreDto): Prisma.StoreUpdateInput {
    const data: Prisma.StoreUpdateInput = {};
    if (dto.storeName !== undefined) data.storeName = dto.storeName.trim();
    if (dto.type !== undefined) data.type = dto.type;
    return data;
  }

  private mapToResponse(store: Store): StoreResponseDto {
    return {
      id: store.id,
      storeName: store.storeName,
      boothNumber: store.boothNumber ?? null,
      type: store.type,
      state: store.state,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  private mapGoodResponse(good: Goods): GoodsResponseDto {
    return {
      id: good.id,
      name: good.name,
      type: good.type,
      price: good.price.toString(),
      storeId: good.storeId,
      goodMediaId: good.goodMediaId ?? null,
      createdAt: good.createdAt,
      updatedAt: good.updatedAt,
    };
  }

  private transformPrismaError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : String(error.meta?.target ?? 'unique constraint');
        return new ConflictException(`Duplicate value for ${target}.`);
      }
    }

    if (error instanceof Error) {
      return error;  // แคบเป็น Error ปกติได้แล้ว
    }

    return new Error('Unknown error');
  }

  private normalizeNullableString(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isObjectComplete<T extends Record<string, any>>(
    obj?: T | null,
    requiredFields?: (keyof T)[]
  ): boolean {
    if (!obj) return false;

    // ถ้าระบุ requiredFields → ใช้เฉพาะ field นั้น
    // ถ้าไม่ระบุ → เช็คทุก key ของ object
    const fields = requiredFields ?? (Object.keys(obj) as (keyof T)[]);

    return fields.every((key) => {
      const value = obj[key];
      if (value === null || value === undefined) return false;

      // ตัดกรณีเป็น string ว่างออก
      if (typeof value === 'string' && value.trim() === '') return false;

      return true;
    });
  }
}
