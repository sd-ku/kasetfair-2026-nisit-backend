// src/store/store.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException
} from '@nestjs/common';
import {
  Nisit,
  Prisma,
  Store,
  StoreState,
  StoreType,
} from '@prisma/client';
import { UpdateDraftStoreRequestDto, UpdateDraftStoreResponseDto, UpdateStoreRequestDto } from '../dto/update-store.dto';
import { StoreResponseDto } from '../dto/store-response.dto';
import { StoreRepository } from '../repositories/store.repository';
import { StoreStatusResponseDto } from '../dto/store-state.dto'
import { StoreMemberStatus } from '@prisma/client'
import { NisitService } from 'src/nisit/nisit.service';
import { StorePendingValidationResponseDto, StoreValidationChecklistItemDto, StoreValidationSectionDto } from '../dto/store-validation.dto';
import { StoreQuestionService } from './store.question.service';

// สมมติใช้ StoreState.Pending เป็นสถานะ "ส่งตรวจแล้ว"
export const READY_FOR_PENDING_STATES: StoreState[] = [StoreState.ProductDetails];
export const PENDING_STATE = StoreState.Pending;

type MemberEmailStatus = {
  email: string
  status: 'joined' | StoreMemberStatus
}

type KnownReqErr = {
  code: string;
  meta?: any;
  message?: string;
};

@Injectable()
export class StoreService {
  constructor(
    protected readonly repo: StoreRepository,
    protected readonly nisitService: NisitService
  ) { }

  async transferStoreAdmin(adminId: string, dto: { transferId?: string }) {
    // หา store ของ admin คนนี้ก่อน + เช็คสิทธิ์ขั้นต้น
    const storeId = await this.ensureStoreAndPermissionIdForNisit(adminId);

    const store = await this.repo.findStoreById(storeId);
    if (!store) {
      throw new NotFoundException('ไม่พบร้านที่ต้องการโอนสิทธิ์');
    }

    // กันเคสมี token แต่ไม่ใช่ admin ร้านนี้
    if (store.storeAdminNisitId !== adminId) {
      throw new ForbiddenException('เฉพาะผู้ดูแลร้านเท่านั้นที่สามารถโอนสิทธิ์ผู้ดูแลได้');
    }

    const transferId = dto.transferId;
    if (!transferId) {
      throw new BadRequestException('กรุณาระบุรหัสนิสิตของผู้ที่จะรับสิทธิ์ผู้ดูแลร้าน');
    }

    if (typeof transferId !== 'string') {
      throw new BadRequestException('ค่า nisitId ต้องเป็นสตริง');
    }

    const storeAdminNisitId = transferId.trim();
    if (!storeAdminNisitId) {
      throw new BadRequestException('ค่า nisitId ไม่สามารถเป็นสตริงว่างได้');
    }

    // กันโอนให้ตัวเอง (จะทำก็ได้ แต่ปกติถือว่าไม่ make sense)
    if (storeAdminNisitId === adminId) {
      throw new BadRequestException('ไม่สามารถโอนสิทธิ์ผู้ดูแลให้ตัวเองได้');
    }

    // เช็คว่าผู้รับสิทธิ์มีตัวตน และอยู่ร้านนี้จริง
    const targetNisit = await this.repo.client.nisit.findUnique({
      where: { nisitId: storeAdminNisitId },
      select: { nisitId: true, storeId: true },
    });

    if (!targetNisit) {
      throw new NotFoundException('ไม่พบนิสิตที่ต้องการโอนสิทธิ์');
    }

    if (targetNisit.storeId !== storeId) {
      throw new BadRequestException('ผู้รับสิทธิ์ต้องเป็นสมาชิกของร้านนี้ก่อน');
    }

    const data: Prisma.StoreUpdateInput = {};
    data.storeAdmin = {
      connect: { nisitId: storeAdminNisitId },
    };
    await this.repo.updateStore(storeId, data);

    return { storeAdminNisitId: transferId };
  }


  async leaveMyStore(nisitId: string): Promise<void> {
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    // 1) หานิสิต + ต้องมีร้าน
    const nisit = await this.repo.findNisitByNisitId(nisitId);
    if (!nisit?.storeId) {
      throw new BadRequestException('คุณยังไม่ได้เป็นสมาชิกของร้าน');
    }

    // 2) โหลดร้าน + สมาชิก (เอาเฉพาะที่จำเป็น)
    const store = await this.repo.client.store.findUnique({
      where: { id: nisit.storeId },
      select: {
        id: true,
        storeAdminNisitId: true,
        members: { select: { nisitId: true } },
        state: true,
      },
    });

    if (!store) {
      throw new BadRequestException('Store not found.');
    }

    const isAdmin = store.storeAdminNisitId === nisit.nisitId;
    const memberCount = store.members.length;

    // 3) ถ้าเป็นแอดมินและยังมีสมาชิกคนอื่นอยู่ ห้ามออก
    //    (ต้องโอนสิทธิ์ก่อน) แต่ถ้าเป็นคนสุดท้าย อนุญาตให้ออกและปิดร้าน
    if (isAdmin && memberCount > 1) {
      throw new BadRequestException(
        'คุณเป็นผู้ดูแลร้าน ไม่สามารถออกจากร้านได้ กรุณาโอนสิทธิ์ผู้ดูแลให้สมาชิกคนอื่นก่อน',
      );
    }

    // 4) ทำทุกอย่างในทรานแซกชันเดียว ป้องกัน race condition
    await this.repo.client.$transaction(async (tx) => {
      // 4.1) เอา nisit ออกจากร้าน
      await tx.nisit.update({
        where: { nisitId: nisit.nisitId },
        data: { storeId: null },
      });

      // 4.2) นับสมาชิกที่เหลือหลังจากออกจริง ๆ (ต้องนับใน tx)
      const remaining = await tx.nisit.count({
        where: { storeId: store.id },
      });

      // 4.3) ถ้าเหลือ 0 → ปิดร้าน (soft delete)
      if (remaining === 0) {
        await tx.store.update({
          where: { id: store.id },
          data: {
            state: StoreState.deleted,
            storeAdmin: { disconnect: true },
          },
        });
      }
    });

    // ไม่มี return อะไรเป็นพิเศษ
  }

  async getMyStore(nisitId: string): Promise<StoreResponseDto> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const store = await this.repo.client.store.findUnique({
      where: { id: storeId },
      include: {
        members: { select: { email: true } },
        memberAttemptEmails: {
          select: { email: true, status: true },
          orderBy: { email: 'asc' },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    if (!store.storeAdminNisitId) {
      throw new BadRequestException(
        'ร้านนี้ไม่มีผู้ดูแล กรุณาออกจากร้านเพื่อสร้างร้านใหม่'
      );
    }

    const mergeStoreMembers = this.mergeStoreMembers(
      store.members ?? [],
      store.memberAttemptEmails ?? [],
    );
    const memberStatus = await this.checkNisitEligibility(store.members.map(m => m.email), store.id)

    return {
      id: store.id,
      storeName: store.storeName,
      boothNumber: store.boothNumber ?? null,
      goodType: store.goodType ?? null,
      type: store.type,
      state: store.state,
      storeAdminNisitId: store.storeAdminNisitId,
      members: memberStatus,
      boothLayoutMediaId: store.boothMediaId ?? null,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  async updateStore(nisitId: string, dto: UpdateStoreRequestDto): Promise<StoreResponseDto> {
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    const storeId = await this.ensureStoreAndPermissionIdForNisit(nisitId);
    const store = await this.repo.findStoreById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    if (store.storeAdminNisitId !== nisitId) {
      throw new ForbiddenException('เฉพาะผู้ดูแลร้านเท่านั้นที่สามารถแก้ไขร้านได้');
    }

    const updateData = this.buildUpdateData(dto);
    const shouldUpdateMembers = Array.isArray(dto.memberEmails);
    let foundMembers: Awaited<ReturnType<typeof this.repo.findNisitsByGmails>> = [];
    let missingEmails: string[] = [];
    let emailStatus: Array<{ email: string; status: StoreMemberStatus }> = [];

    if (shouldUpdateMembers) {
      const actor = await this.repo.findNisitByNisitId(nisitId);
      if (!actor?.email) {
        throw new UnauthorizedException('ต้องมีข้อมูลโปรไฟล์นิสิตก่อนเข้าถึงข้อมูลร้านค้า');
      }

      let normalizedMemberEmails = this.normalizeEmailsList(dto.memberEmails ?? []);
      normalizedMemberEmails = this.ensureEmailIncluded(normalizedMemberEmails, actor.email);

      if (normalizedMemberEmails.length < 3) {
        throw new BadRequestException('ต้องมีสมาชิกอย่างน้อย 3 คน');
      }

      // ใช้ checkNisitEligibility เช็คสิทธิ์
      emailStatus = await this.checkNisitEligibility(normalizedMemberEmails, storeId);

      // แยกสมาชิกที่ Joined (ผ่านเกณฑ์) กับที่ไม่ผ่าน
      const joinedEmails = emailStatus
        .filter((s) => s.status === StoreMemberStatus.Joined)
        .map((s) => s.email);

      const otherEmails = emailStatus
        .filter((s) => s.status !== StoreMemberStatus.Joined)
        .map((s) => s.email);

      // ดึงข้อมูล nisitId สำหรับคนที่ Joined เพื่อเอาไปผูกกับร้าน
      if (joinedEmails.length > 0) {
        foundMembers = await this.repo.findNisitsByGmails(joinedEmails);
      }

      // คนที่ไม่ผ่านเกณฑ์ ให้เก็บลง attempt (ตาม logic เดิม)
      missingEmails = otherEmails;
    }

    if (!shouldUpdateMembers && Object.keys(updateData).length === 0) {
      throw new BadRequestException('ไม่มีข้อมูลที่ต้องการอัปเดต');
    }

    try {
      const updatedStore = await this.repo.client.$transaction(async (tx) => {
        if (Object.keys(updateData).length) {
          await tx.store.update({ where: { id: storeId }, data: updateData });
        }

        if (shouldUpdateMembers) {
          await this.syncMembersAndAttemptsTx(tx, {
            storeId,
            foundMembers,
            missingEmails,
          });
        }

        return tx.store.findUnique({
          where: { id: storeId },
          include: {
            members: { select: { email: true } },
            memberAttemptEmails: {
              select: { email: true, status: true },
              orderBy: { email: 'asc' },
            },
          },
        });
      });

      if (!updatedStore) {
        throw new NotFoundException('Store not found after update.');
      }

      if (!updatedStore.storeAdminNisitId) {
        throw new BadRequestException(
          'ร้านนี้ไม่มีผู้ดูแล กรุณาออกจากร้านเพื่อสร้างร้านใหม่'
        );
      }

      // ถ้ามีการอัปเดตสมาชิก ให้ใช้ผลลัพธ์จาก checkNisitEligibility
      // ถ้าไม่มีการอัปเดตสมาชิก ให้ใช้ข้อมูลจาก DB
      const membersResponse = shouldUpdateMembers
        ? emailStatus.sort((a, b) => a.email.localeCompare(b.email))
        : this.mergeStoreMembers(
          updatedStore.members ?? [],
          updatedStore.memberAttemptEmails ?? [],
        );

      return {
        id: updatedStore.id,
        storeName: updatedStore.storeName,
        boothNumber: updatedStore.boothNumber ?? null,
        goodType: updatedStore.goodType ?? null,
        type: updatedStore.type,
        state: updatedStore.state,
        storeAdminNisitId: updatedStore.storeAdminNisitId!,
        members: membersResponse,
        boothLayoutMediaId: updatedStore.boothMediaId ?? null,
        createdAt: updatedStore.createdAt,
        updatedAt: updatedStore.updatedAt,
      };
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async getStoreStatus(nisitId: string): Promise<StoreStatusResponseDto> {
    const store = await this.repo.findStoreByNisitId(nisitId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    if (!store.storeAdminNisitId) {
      throw new NotFoundException("ไม่เจอผู้ดูแลร้าน กรุณาออกจากร้านเพื่อสร้างร้านใหม่")
    }

    const storeStatus = {
      id: store.id,
      storeName: store.storeName,
      type: store.type,
      goodType: store.goodType ?? null,
      state: store.state,
      storeAdminNisitId: store.storeAdminNisitId,
    }

    return storeStatus
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

  async validateStoreForPending(
    nisitId: string,
  ): Promise<StorePendingValidationResponseDto> {
    const storeSummary = await this.repo.findStoreByNisitId(nisitId);
    if (!storeSummary) {
      throw new NotFoundException('Store not found.');
    }

    const store = await this.repo.findStoreWithValidation(storeSummary.id);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    const isMember =
      store.members?.some((member) => member.nisitId === nisitId) ?? false;
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this store.');
    }

    const sections: StoreValidationSectionDto[] = [];

    // ============= 1) Members =============
    {
      const memberCount = store.members?.length ?? 0;
      const membersOk = memberCount >= 3;

      const memberInTraining = await this.repo.findNisitIdsInTraining(store.members?.map((member) => member.nisitId) ?? []);
      const haveTraining = memberInTraining.length > 0;

      sections.push({
        key: 'members',
        label: 'สมาชิกในร้าน',
        ok: membersOk && haveTraining,
        items: [
          {
            key: 'members-count',
            label: 'สมาชิกลงทะเบียนครบ 3 คน',
            ok: membersOk,
            message: membersOk
              ? undefined
              : 'ต้องมีสมาชิกที่ลงทะเบียนครบอย่างน้อย 3 คน',
          },
          {
            key: 'member-in-training-count',
            label: 'สมาชิกผ่านการอบรม',
            ok: haveTraining,
            message: haveTraining
              ? undefined
              : 'ต้องมีสมาชิกอย่างน้อย 1 คนที่ผ่านการอบรม',
          },
        ],
      });
    }

    // ============= 2) Club Info (เฉพาะ Club) =============
    if (store.type === StoreType.Club) {
      const clubInfoOk = this.isObjectComplete(store.clubInfo, [
        'clubName',
        'clubApplicationMediaId',
        'leaderFirstName',
        'leaderLastName',
        'leaderEmail',
        'leaderPhone',
        'leaderNisitId',
      ]);

      sections.push({
        key: 'clubInfo',
        label: 'ข้อมูลชมรม',
        ok: clubInfoOk,
        items: [
          {
            key: 'club-info-complete',
            label: 'ข้อมูลชมรมครบถ้วน',
            ok: clubInfoOk,
            message: clubInfoOk
              ? undefined
              : 'กรุณากรอกข้อมูลชมรมและอัปโหลดไฟล์ให้ครบ',
          },
        ],
      });
    }

    // ============= 3) Store Detail =============
    {
      const detailItems: StoreValidationChecklistItemDto[] = [];

      // 1) goodType
      const goodTypeOk = Boolean(store.goodType);
      detailItems.push({
        key: 'goodType',
        label: 'ประเภทร้านค้า',
        ok: goodTypeOk,
        message: goodTypeOk ? undefined : 'กรุณาเลือกประเภทสินค้าที่จะขาย',
      });

      // 2) booth
      const boothOk = Boolean(store.boothMediaId);
      detailItems.push({
        key: 'boothMedia',
        label: 'อัปโหลดแผนผังบูธ',
        ok: boothOk,
        message: boothOk ? undefined : 'กรุณาอัปโหลดไฟล์แผนผังบูธ',
      });

      const activeQuestions = await this.repo.listActiveQuestions();
      const questionsOk = store.questionAnswers.length == activeQuestions.length;
      detailItems.push({
        key: 'questions',
        label: 'คำถามการจัดการร้านค้า',
        ok: questionsOk,
      });

      const detailOk = detailItems.every((i) => i.ok);

      sections.push({
        key: 'storeDetail',
        label: 'ข้อมูลร้านค้า',
        ok: detailOk,
        items: detailItems,
      });

    }

    // ============= 4) Goods =============
    {
      const goodsCount = store.goods?.length ?? 0;
      const goodsOk = goodsCount > 0;

      sections.push({
        key: 'goods',
        label: 'สินค้า',
        ok: goodsOk,
        items: [
          {
            key: 'goods-exists',
            label: 'กรอกข้อมูลสินค้า',
            ok: goodsOk,
            message: goodsOk ? undefined : 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ',
          },
        ],
      });
    }

    // สรุปภาพรวมว่า valid มั้ย
    const isValid = sections.every((section) => section.ok);

    return {
      store: {
        id: store.id,
        storeName: store.storeName,
        type: store.type,
        state: store.state,
        boothNumber: store.boothNumber,
        storeAdminNisitId: store.storeAdminNisitId,
      },
      isValid,
      sections,
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

  protected async ensureStoreAndPermissionIdForNisit(nisitId: string): Promise<number> {
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    const store = await this.repo.findStoreByNisitId(nisitId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }
    if (store.storeAdminNisitId !== nisitId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์จัดการร้านค้านี้');
    }
    return store.id;
  }

  protected buildUpdateData(dto: UpdateStoreRequestDto): Prisma.StoreUpdateInput {
    const data: Prisma.StoreUpdateInput = {};
    if (dto.storeName !== undefined) data.storeName = dto.storeName.trim();
    if (dto.goodType !== undefined) data.goodType = dto.goodType;
    if (dto.boothMediaId !== undefined) {
      const boothMediaId =
        typeof dto.boothMediaId === 'string' ? dto.boothMediaId.trim() : null;
      data.boothMedia = boothMediaId
        ? { connect: { id: boothMediaId } }
        : { disconnect: true };
    }
    return data;
  }

  protected normalizeEmailsList(values: string[]): string[] {
    return Array.from(
      new Set(
        (values ?? [])
          .map((email) => (typeof email === 'string' ? email.trim().toLowerCase() : ''))
          .filter((email) => email.length > 0),
      ),
    );
  }

  protected ensureEmailIncluded(existing: string[], actorEmail: string): string[] {
    const normalized = actorEmail.trim().toLowerCase();
    if (!normalized) {
      return existing;
    }
    if (existing.includes(normalized)) {
      return existing;
    }
    return [...existing, normalized];
  }

  protected async syncMembersAndAttemptsTx(
    tx: Prisma.TransactionClient,
    params: {
      storeId: number;
      foundMembers: Array<{ nisitId: string; email: string | null; storeId: number | null }>;
      missingEmails: string[];
    },
  ): Promise<void> {
    const desiredMemberIds = new Set(params.foundMembers.map((member) => member.nisitId));
    const currentMembers = await tx.nisit.findMany({
      where: { storeId: params.storeId },
      select: { nisitId: true },
    });

    const membersToRemove = currentMembers
      .filter((member) => !desiredMemberIds.has(member.nisitId))
      .map((member) => member.nisitId);

    if (membersToRemove.length) {
      await tx.nisit.updateMany({
        where: { nisitId: { in: membersToRemove } },
        data: { storeId: null },
      });
    }

    const membersToAttach = params.foundMembers
      .filter((member) => member.storeId !== params.storeId)
      .map((member) => member.nisitId);

    if (membersToAttach.length) {
      await tx.nisit.updateMany({
        where: { nisitId: { in: membersToAttach } },
        data: { storeId: params.storeId },
      });
    }

    const attempts = await tx.storeMemberAttemptEmail.findMany({
      where: { storeId: params.storeId },
      select: { id: true, email: true },
    });

    const missingSet = new Set(
      params.missingEmails.map((email) => email.trim().toLowerCase()).filter((email) => email.length > 0),
    );

    const attemptsToDelete = attempts
      .filter((attempt) => {
        const normalized = attempt.email?.trim().toLowerCase();
        return !normalized || !missingSet.has(normalized);
      })
      .map((attempt) => attempt.id);

    if (attemptsToDelete.length) {
      await tx.storeMemberAttemptEmail.deleteMany({
        where: { id: { in: attemptsToDelete } },
      });
    }

    const existingAttemptEmails = new Set(
      attempts.map((attempt) => attempt.email?.trim().toLowerCase()).filter((email) => email && email.length > 0) as string[],
    );

    const attemptsToCreate = params.missingEmails.filter((email) => !existingAttemptEmails.has(email));
    if (attemptsToCreate.length) {
      const now = new Date();
      await tx.storeMemberAttemptEmail.createMany({
        data: attemptsToCreate.map((email) => ({
          storeId: params.storeId,
          email,
          status: StoreMemberStatus.NotFound,
          invitedAt: now,
        })),
      });
    }
  }

  protected extractTargets(error: KnownReqErr): string[] {
    const out: string[] = [];
    const m = error.meta ?? {};

    // Prisma ชอบใส่ target ได้หลายรูปแบบ ขอสแกนหลายจุด
    const candidates: any[] = [
      m.target,                 // string | string[] | { fields: string[] } (บาง adapter)
      m.fields,                 // บางเวอร์ชัน
      m.field_name,             // บางกรณี P2003
      m.constraint?.fields,     // adapter pg
    ].filter(Boolean);

    for (const c of candidates) {
      if (Array.isArray(c)) out.push(...c.map(String));
      else if (typeof c === 'string') out.push(c);
      else if (c && Array.isArray(c.fields)) out.push(...c.fields.map(String));
    }

    // เผื่อไม่มี meta ที่มีประโยชน์ ลองเดาด้วย constraint name / message
    const raw = (m?.constraint?.name as string | undefined) ?? error.message ?? '';
    // ดึง field แบบง่าย ๆ จากชื่อ index เช่น "store_storeName_key"
    if (raw) {
      const lower = raw.toLowerCase();
      if (lower.includes('storename')) out.push('storeName');
      if (lower.includes('boothnumber')) out.push('boothNumber');
      if (lower.includes('storeadminnisitid')) out.push('storeAdminNisitId');
    }

    // normalize + unique
    return Array.from(new Set(out.map((t) => String(t).trim())));
  }

  protected transformPrismaError(error: unknown): Error {
    // จัดการเฉพาะ Prisma error ที่รู้จักก่อน
    if (this.isPrismaKnownRequestError(error)) {
      switch (error.code) {
        // unique constraint
        case 'P2002': {
          const targets = this.extractTargets(error).map((t) => t.toLowerCase());

          if (targets.some((t) => t.includes('storename'))) {
            // ข้อความ user-facing
            return new BadRequestException('มีชื่อร้านนี้อยู่ในระบบแล้ว โปรดใช้ชื่ออื่น');
          }
          if (targets.some((t) => t.includes('boothnumber'))) {
            return new BadRequestException('หมายเลขบูธนี้ถูกใช้แล้ว โปรดเลือกหมายเลขอื่น');
          }
          if (targets.some((t) => t.includes('storeadminnisitid'))) {
            // ธรรมชาติเป็น conflict ของความเป็นเอกลักษณ์
            return new ConflictException('ผู้ใช้นี้เป็นผู้ดูแลร้านอื่นอยู่แล้ว');
          }

          // ฟิลด์อื่น ๆ
          const label = targets.length ? targets.join(', ') : 'unique field';
          return new ConflictException(`ข้อมูลซ้ำในฟิลด์: ${label}`);
        }
        // record not found
        case 'P2025': {
          const cause = (error.meta?.cause as string | undefined) ?? 'Record not found';
          return new NotFoundException(cause);
        }

        default:
          // Prisma error แต่เราไม่แมปเฉพาะ → ให้เป็น 500 DB error ไป
          return new InternalServerErrorException('Database error occurred.');
      }
    }

    // ไม่ใช่ Prisma แต่เป็น Error ปกติ → ปล่อยผ่าน
    if (this.isStandardError(error)) {
      return error;
    }

    // ไม่รู้ก็ห่อเป็น 500 ให้เลย
    return new InternalServerErrorException('Unknown error');
  }

  private mergeStoreMembers(
    members: Array<{ email: string | null }> = [],
    attempts: Array<{ email: string | null; status: StoreMemberStatus }> = [],
  ): StoreResponseDto['members'] {
    const normalize = (value?: string | null) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed.toLowerCase() : null;
    };

    const result = new Map<string, StoreResponseDto['members'][number]>();

    for (const attempt of attempts ?? []) {
      const normalized = normalize(attempt.email);
      if (!normalized) continue;
      const original = attempt.email?.trim() ?? normalized;
      result.set(normalized, {
        email: original,
        status: attempt.status,
      });
    }

    for (const member of members ?? []) {
      const normalized = normalize(member.email);
      if (!normalized) continue;
      const original = member.email?.trim() ?? normalized;
      result.set(normalized, {
        email: original,
        status: StoreMemberStatus.Joined,
      });
    }

    return Array.from(result.values()).sort((a, b) => a.email.localeCompare(b.email));
  }

  protected isObjectComplete<T extends Record<string, any>>(
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

  private isStandardError(
    error: unknown,
  ): error is Error {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error
    );
  }

  private isPrismaKnownRequestError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
    );
  }

  /**
   * เช็คว่า nisit แต่ละคนมีสิทธิ์เข้าร่วมร้านหรือไม่
   * @param emails - รายการอีเมลของ nisit ที่ต้องการเช็ค
   * @returns รายการสถานะของแต่ละอีเมล
   * 
   * สถานะที่เป็นไปได้:
   * - NotFound: ไม่เจอข้อมูลใน database
   * - ProfileNotComplete: profile ไม่ครบ (ไม่มี email, phone, หรือ dormitoryTypeId)
   * - DuplicateStore: อยู่ในร้านอื่นแล้ว
   * - Joined: เข้าร่วมร้านได้
   */
  async checkNisitEligibility(
    emails: string[],
    currentStoreId?: number,
  ): Promise<Array<{ email: string; status: StoreMemberStatus }>> {
    // Normalize emails
    const normalizedEmails = this.normalizeEmailsList(emails);

    if (normalizedEmails.length === 0) {
      return [];
    }

    // หา nisit ทั้งหมดที่มีอีเมลตรงกับที่ระบุ
    const nisits = await this.repo.client.nisit.findMany({
      where: {
        email: {
          in: normalizedEmails,
        },
      },
      select: {
        firstName: true,
        lastName: true,
        nisitId: true,
        email: true,
        phone: true,
        dormitoryTypeId: true,
        nisitCardMediaId: true,
        storeId: true,
      },
    });

    // สร้าง Map เพื่อเก็บผลลัพธ์
    const resultMap = new Map<string, StoreMemberStatus>();

    // เช็คแต่ละ nisit ที่เจอ
    for (const nisit of nisits) {
      const normalizedEmail = nisit.email.trim().toLowerCase();

      // 1. เช็คว่าอยู่ในร้านอื่นหรือไม่
      if (nisit.storeId !== null && nisit.storeId !== currentStoreId) {
        resultMap.set(normalizedEmail, StoreMemberStatus.DuplicateStore);
        continue;
      }

      // 2. เช็คว่า profile ครบหรือไม่
      if (!nisit.firstName || !nisit.lastName || !nisit.phone ||
        !nisit.email || !nisit.dormitoryTypeId || !nisit.nisitCardMediaId) {
        resultMap.set(normalizedEmail, StoreMemberStatus.ProfileNotCompleted);
        continue;
      }

      // 3. ถ้าผ่านทุกเงื่อนไข = สามารถเข้าร่วมได้
      resultMap.set(normalizedEmail, StoreMemberStatus.Joined);
    }

    // สร้างผลลัพธ์สุดท้าย โดยเช็คทุกอีเมลที่ส่งมา
    const results = normalizedEmails.map((email) => {
      const status = resultMap.get(email) || StoreMemberStatus.NotFound;
      return { email, status };
    });

    return results;
  }
}



