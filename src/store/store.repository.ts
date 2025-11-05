// src/store/store.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  Prisma,
  Store,
  Nisit,
  StoreMemberAttemptEmail,
  StoreMemberStatus
} from '@generated/prisma';

type CreateWithMembersAndAttemptsInput = {
  storeData: Prisma.StoreCreateInput;
  memberNisitIds: string[];   // คนที่สมัครแล้ว
  missingEmails: string[];    // คนที่ยังไม่สมัคร
};

type StoreWithRelations = Store & {
  members: Nisit[];
  memberAttemptEmails: StoreMemberAttemptEmail[];
};


@Injectable()
export class StoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Nisit / Identity ----------
  async findNisitByNisitId(nisitId: string) {
    return this.prisma.nisit.findUnique({ where: { nisitId } });
  }

  async findIdentityWithInfoByProviderSub(provider: string, providerSub: string) {
    return this.prisma.userIdentity.findUnique({
      where: { provider_providerSub: { provider, providerSub } },
      include: { info: true }, // info = Nisit
    });
  }

  async findNisitsByGmails(gmails: string[]) {
    return this.prisma.nisit.findMany({
      where: { email: { in: gmails } }, // <-- ปรับเป็น email ถ้าคอลัมน์ชื่อ email
      select: { nisitId: true, email: true, storeId: true },
    });
  }


  // ---------- Store CRUD ----------
  async createStore(data: Prisma.StoreCreateInput) {
    return this.prisma.store.create({ data });
  }

  async updateStore(storeId: number, data: Prisma.StoreUpdateInput) {
    return this.prisma.store.update({ where: { id: storeId }, data });
  }

  async findStoreById(storeId: number) {
    return this.prisma.store.findUnique({ where: { id: storeId } });
  }

  // ---------- Nisit <-> Store linking ----------
  async linkNisitAsLeader(nisitId: string, storeId: number, storeRole: any) {
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

  async createStoreWithMembersAndAttempts(
    input: CreateWithMembersAndAttemptsInput
  ): Promise<StoreWithRelations> {
    const { storeData, memberNisitIds, missingEmails } = input;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1) create store
      const store = await tx.store.create({ data: storeData });

      // 2) link registered members → set storeId
      if (memberNisitIds.length > 0) {
        await tx.nisit.updateMany({
          where: { nisitId: { in: memberNisitIds } },
          data: { storeId: store.id },
        });
      }

      // 3) write attempts for missing (unique: [storeId,email])
      if (missingEmails.length > 0) {
        await tx.storeMemberAttemptEmail.createMany({
          data: missingEmails.map((email) => ({
            storeId: store.id,
            email,
            status: StoreMemberStatus.Invited,
            invitedAt: now,
          })),
          skipDuplicates: true,
        });
      }

      // 4) คืนผลพร้อม relations
      const full = await tx.store.findUnique({
        where: { id: store.id },
        include: { members: true, memberAttemptEmails: true },
      });

      // full ไม่ควรเป็น null ทันทีหลัง create
      return full as StoreWithRelations;
    });
  }

  // async createWithdMembers(
  //   storeData: Prisma.StoreCreateInput,
  //   memberNisitIds: string[],
  // ): Promise<Store> {
  //   return this.prisma.$transaction(async (tx) => {
  //     const created = await tx.store.create({ data: storeData });

  //     // Members
  //     if (memberNisitIds.length) {
  //       await Promise.all(
  //         memberNisitIds.map((id) =>
  //           tx.nisit.update({
  //             where: { nisitId: id },
  //             data: { storeId: created.id },
  //           }),
  //         ),
  //       );
  //     }

  //     return created;
  //   });
  // }

  // ---------- Transaction helpers ----------
  async createStoreAndLinkLeader(
    data: Prisma.StoreCreateInput,
    nisitId: string,
    storeRole: any
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
}
