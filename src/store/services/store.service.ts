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
  Nisit,
  Prisma,
  Store,
  StoreState,
  StoreType,
} from '@generated/prisma';
import { UpdateDraftStoreRequestDto } from '../dto/update-store.dto';
import { StoreResponseDto } from '../dto/store-response.dto';
import { StoreRepository } from '../repositories/store.repository';
import { StoreStatusResponseDto } from '../dto/store-state.dto'
import { StoreMemberStatus } from '@generated/prisma'
import { NisitService } from 'src/nisit/nisit.service';
import { UpdateClubInfoRequestDto } from '../dto/update-clubInfo.dto';
import { StorePendingValidationResponseDto, StoreValidationChecklistItemDto } from '../dto/store-validation.dto';

// สมมติใช้ StoreState.Pending เป็นสถานะ "ส่งตรวจแล้ว"
export const READY_FOR_PENDING_STATES: StoreState[] = [StoreState.ProductDetails];
export const PENDING_STATE = StoreState.Pending;

type MemberEmailStatus = {
  email: string
  status: 'joined' | StoreMemberStatus
}

@Injectable()
export class StoreService {
  constructor(
    protected readonly repo: StoreRepository,
    protected readonly nisitService: NisitService
  ) {}

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

  protected async getStoreMemberEmailsByStoreId(storeId: number): Promise<MemberEmailStatus[]> {
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

  protected async validateStoreForPending(nisitId: string): Promise<StorePendingValidationResponseDto> {
    const storeSummary = await this.repo.findStoreByNisitId(nisitId);
    if (!storeSummary) {
      throw new NotFoundException('Store not found.');
    }

    const store = await this.repo.findStoreWithValidation(storeSummary.id);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    const isMember = store.members?.some((member) => member.nisitId === nisitId) ?? false;
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this store.');
    }

    const checklist: StoreValidationChecklistItemDto[] = [];

    // 1) สมาชิก >= 3
    const memberCount = store.members?.length ?? 0;
    const membersOk = memberCount >= 3;
    checklist.push({
      key: 'members',
      label: 'สมาชิกลงทะเบียนครบ 3 คน',
      ok: membersOk,
      message: membersOk
        ? undefined
        : 'ต้องมีสมาชิกที่ลงทะเบียนครบอย่างน้อย 3 คน',
    });

    // 2) Club info (เฉพาะร้าน Club)
    let clubInfoOk = true;
    if (store.type === StoreType.Club) {
      clubInfoOk = this.isObjectComplete(store.clubInfo, [
        'clubName',
        'clubApplicationMediaId',
        'leaderFirstName',
        'leaderLastName',
        'leaderEmail',
        'leaderPhone',
        'leaderNisitId',
      ]);
      checklist.push({
        key: 'clubInfo',
        label: 'ข้อมูลชมรมครบถ้วน',
        ok: clubInfoOk,
        message: clubInfoOk
          ? undefined
          : 'กรุณากรอกข้อมูลชมรมและอัปโหลดไฟล์ให้ครบ',
      });
    }

    // 3) Booth / แผนผังบูธ
    const boothOk = Boolean(store.boothMediaId);
    checklist.push({
      key: 'boothMedia',
      label: 'อัปโหลดแผนผังบูธ',
      ok: boothOk,
      message: boothOk ? undefined : 'กรุณาอัปโหลดไฟล์แผนผังบูธ',
    });

    // 4) Goods มีอย่างน้อย 1 รายการ
    const goodsCount = store.goods?.length ?? 0;
    const goodsOk = goodsCount > 0;
    checklist.push({
      key: 'goods',
      label: 'กรอกข้อมูลสินค้า',
      ok: goodsOk,
      message: goodsOk ? undefined : 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ',
    });

    // 5) State ปัจจุบันอยู่ขั้นพร้อมส่ง (เช่น ProductDetails)
    const stateOk = READY_FOR_PENDING_STATES.includes(store.state);
    checklist.push({
      key: 'state',
      label: 'อยู่ในขั้นตอน ProductDetails ก่อนส่งตรวจ',
      ok: stateOk,
      message: stateOk
        ? undefined
        : 'ต้องทำขั้นตอนให้ถึง ProductDetails ก่อนส่งตรวจ',
    });

    const isValid = checklist.every((item) => item.ok);

    return {
      storeId: store.id,
      type: store.type,
      state: store.state,
      isValid,
      checklist,
    };
  }

  // ---------- helpers ----------
  protected async resolveNisit(userSub: string): Promise<Nisit> {
    const identity = await this.repo.findIdentityWithInfoByProviderSub('google', userSub);
    if (!identity?.info) {
      throw new UnauthorizedException('Nisit profile required before accessing store data.');
    }
    return identity.info;
  }

  protected async ensureStoreIdForNisit(nisitId: string): Promise<number> {
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    const store = await this.repo.findStoreByNisitId(nisitId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }
    return store.id;
  }

  protected buildUpdateData(dto: UpdateDraftStoreRequestDto): Prisma.StoreUpdateInput {
    const data: Prisma.StoreUpdateInput = {};
    if (dto.storeName !== undefined) data.storeName = dto.storeName.trim();
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.boothMediaId !== undefined) {
      const boothMediaId =
        typeof dto.boothMediaId === 'string' ? dto.boothMediaId.trim() : null;
      data.boothMedia = boothMediaId
        ? { connect: { id: boothMediaId } }
        : { disconnect: true };
    }
    return data;
  }

  protected mapToResponse(store: Store): StoreResponseDto {
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

  protected transformPrismaError(error: unknown): Error {
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
