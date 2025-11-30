// src/store/store.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  Prisma,
  Store,
  Nisit,
  StoreType,
  StoreState,
} from '@prisma/client';

// Payload สำหรับ clubInfo ที่ใช้ร่วมกันหลายฟังก์ชัน
type ClubInfoPayload = {
  clubName?: string | null;
  clubApplicationMediaId?: string | null;
  leaderFirstName?: string | null;
  leaderLastName?: string | null;
  leaderEmail?: string | null;
  leaderPhone?: string | null;
  leaderNisitId?: string | null;
};

@Injectable()
export class StoreRepository {
  constructor(protected readonly prisma: PrismaService) { }

  get client() {
    return this.prisma;
  }

  // ==============================
  // Nisit / Identity
  // ==============================

  async findNisitIdsInTraining(nisitIds: string[]) {
    return this.prisma.nisitTrainingParticipant.findMany({
      where: { nisitId: { in: nisitIds } },
    });
  }

  async findNisitByNisitId(nisitId: string) {
    return this.prisma.nisit.findUnique({ where: { nisitId } });
  }

  async findIdentityWithInfoByProviderSub(
    provider: string,
    providerSub: string,
  ) {
    return this.prisma.userIdentity.findUnique({
      where: { provider_providerSub: { provider, providerSub } },
      include: { info: true }, // info = Nisit
    });
  }

  async findNisitsByGmails(gmails: string[]) {
    return this.prisma.nisit.findMany({
      where: { email: { in: gmails.map((g) => g.toLowerCase()) } },
      select: { nisitId: true, email: true, storeId: true },
    });
  }

  async findNisitByEmail(email: string) {
    return this.prisma.nisit.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  // ==============================
  // Store CRUD / Query
  // ==============================

  async createStore(data: Prisma.StoreCreateInput) {
    return this.prisma.store.create({ data });
  }

  async updateStore(storeId: number, data: Prisma.StoreUpdateInput) {
    return this.prisma.store.update({ where: { id: storeId }, data });
  }

  async findStoreById(storeId: number) {
    return this.prisma.store.findUnique({ where: { id: storeId } });
  }

  async findStoreByAdminNisitId(nisitId: string) {
    return this.prisma.store.findUnique({
      where: { storeAdminNisitId: nisitId },
    });
  }

  async findStoreByNisitId(nisitId: string) {
    const row = await this.prisma.nisit.findUnique({
      where: { nisitId },
      select: {
        store: {
          select: {
            id: true,
            storeName: true,
            boothNumber: true,
            type: true,
            goodType: true,
            state: true,
            storeAdminNisitId: true,
          },
        },
      },
    });

    return row?.store ?? null;
  }

  async findMemberEmailsByStoreId(storeId: number) {
    const row = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        members: { select: { email: true } },
        memberAttemptEmails: {
          select: { email: true, status: true },
          orderBy: { email: 'asc' },
        },
      },
    });

    if (!row) return null;
    return row;
  }

  async findMemberNisitIdsByStoreId(storeId: number) {
    const row = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        members: { select: { nisitId: true } },
      },
    });

    if (!row) return null;
    return row.members.map((m) => m.nisitId);
  }

  async findBoothMediaIdByStoreId(storeId: number) {
    const row = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        boothMediaId: true,
      },
    });

    return row?.boothMediaId ?? null;
  }

  async findStoreWithValidation(storeId: number) {
    return this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        members: true,
        clubInfo: true,
        goods: true,
        questionAnswers: true,
      },
    });
  }

  // ==============================
  // Club / ClubInfo
  // ==============================

  async findStoreWithMembersAndClub(storeId: number) {
    return this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        members: true,
        clubInfo: true,
      },
    });
  }

  async createClubInfoForStore(
    tx: Prisma.TransactionClient,
    storeId: number,
    data: ClubInfoPayload,
  ) {
    return tx.clubInfo.create({
      data: {
        storeId,
        clubName: data.clubName ?? undefined,
        clubApplicationMediaId: data.clubApplicationMediaId ?? undefined,
        leaderFirstName: data.leaderFirstName ?? undefined,
        leaderLastName: data.leaderLastName ?? undefined,
        leaderEmail: data.leaderEmail ?? undefined,
        leaderPhone: data.leaderPhone ?? undefined,
        leaderNisitId: data.leaderNisitId ?? undefined,
      },
    });
  }

  async updateClubInfo(
    tx: Prisma.TransactionClient,
    clubInfoId: string,
    data: ClubInfoPayload,
  ) {
    return tx.clubInfo.update({
      where: { id: clubInfoId },
      data: {
        clubName: data.clubName ?? undefined,
        clubApplicationMediaId: data.clubApplicationMediaId ?? undefined,
        leaderFirstName: data.leaderFirstName ?? undefined,
        leaderLastName: data.leaderLastName ?? undefined,
        leaderEmail: data.leaderEmail ?? undefined,
        leaderPhone: data.leaderPhone ?? undefined,
        leaderNisitId: data.leaderNisitId ?? undefined,
      },
    });
  }

  async findStoreWithClubInfoTx(
    tx: Prisma.TransactionClient,
    storeId: number,
  ) {
    return tx.store.findUnique({
      where: { id: storeId },
      include: { clubInfo: true },
    });
  }

  async findClubInfoByStoreId(storeId: number) {
    return this.prisma.store.findUnique({
      where: { id: storeId },
      include: { clubInfo: true },
    });
  }

  async createClubStoreWithInfo(
    tx: Prisma.TransactionClient,
    actorNisitId: string,
    payload: ClubInfoPayload,
  ) {
    const store = await tx.store.create({
      data: {
        storeName: payload.clubName ?? 'ชมรมยังไม่ตั้งชื่อ',
        type: StoreType.Club,
        state: StoreState.ClubInfo,
        storeAdmin: {
          connect: { nisitId: actorNisitId },
        },
        members: {
          connect: [{ nisitId: actorNisitId }],
        },
      },
    });

    const clubInfo = await tx.clubInfo.create({
      data: {
        clubName: payload.clubName ?? null,
        leaderFirstName: payload.leaderFirstName ?? null,
        leaderLastName: payload.leaderLastName ?? null,
        leaderEmail: payload.leaderEmail ?? null,
        leaderPhone: payload.leaderPhone ?? null,
        leaderNisitId: payload.leaderNisitId ?? null,
        store: {
          connect: { id: store.id },
        },
        ...(payload.clubApplicationMediaId && {
          clubApplicationMedia: {
            connect: { id: payload.clubApplicationMediaId },
          },
        }),
      },
    });

    return { store, clubInfo };
  }

  // ==============================
  // Nisit <-> Store linking
  // ==============================

  async linkNisitAsLeader(
    nisitId: string,
    storeId: number,
    storeRole: any, // TODO: ถ้ามี role column ค่อย map ลงไป
  ) {
    return this.prisma.nisit.update({
      where: { nisitId },
      data: { storeId },
    });
  }

  async createWithLeaderAndMembers(
    storeData: Prisma.StoreCreateInput,
    leaderNisitId: string,
    memberNisitIds: string[],
  ): Promise<Store> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.store.create({ data: storeData });

      // Leader
      await tx.nisit.update({
        where: { nisitId: leaderNisitId },
        data: { storeId: created.id },
      });

      // Members
      if (memberNisitIds.length) {
        await Promise.all(
          memberNisitIds.map((id) =>
            tx.nisit.update({
              where: { nisitId: id },
              data: { storeId: created.id },
            }),
          ),
        );
      }

      return created;
    });
  }

  async createStoreAndLinkLeader(
    data: Prisma.StoreCreateInput,
    nisitId: string,
    storeRole: any, // ไว้เผื่อในอนาคต
  ): Promise<Store> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.store.create({ data });

      await tx.nisit.update({
        where: { nisitId },
        data: { storeId: created.id },
      });

      return created;
    });
  }

  async listActiveQuestions() {
    return this.prisma.storeQuestionTemplate.findMany({
      where: { isActive: true },
    });
  }
}
