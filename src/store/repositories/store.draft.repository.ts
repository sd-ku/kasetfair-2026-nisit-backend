import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StoreRepository } from './store.repository';
import {
  Nisit,
  Prisma,
  Store,
  StoreMemberAttemptEmail,
  StoreMemberStatus,
} from '@generated/prisma';

type CreateWithMembersAndAttemptsInput = {
  storeData: Prisma.StoreCreateInput;
  memberNisitIds: string[];
  missingEmails: string[];
};

type StoreWithRelations = Store & {
  members: Nisit[];
  memberAttemptEmails: StoreMemberAttemptEmail[];
};

@Injectable()
export class StoreDraftRepository extends StoreRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createStoreWithMembersAndAttempts(
    input: CreateWithMembersAndAttemptsInput,
  ): Promise<StoreWithRelations> {
    const { storeData, memberNisitIds, missingEmails } = input;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({ data: storeData });

      if (memberNisitIds.length > 0) {
        await tx.nisit.updateMany({
          where: { nisitId: { in: memberNisitIds } },
          data: { storeId: store.id },
        });
      }

      if (missingEmails.length > 0) {
        await tx.storeMemberAttemptEmail.createMany({
          data: missingEmails.map((email) => ({
            storeId: store.id,
            email,
            status: StoreMemberStatus.NotFound,
            invitedAt: now,
          })),
          skipDuplicates: true,
        });
      }

      const full = await tx.store.findUnique({
        where: { id: store.id },
        include: { members: true, memberAttemptEmails: true },
      });

      return full as StoreWithRelations;
    });
  }
}
