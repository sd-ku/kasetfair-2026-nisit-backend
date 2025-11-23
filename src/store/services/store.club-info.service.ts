import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StoreState, StoreType } from '@generated/prisma';
import { StoreRepository } from '../repositories/store.repository';
import { NisitService } from 'src/nisit/nisit.service';
import { UpdateClubInfoRequestDto } from '../dto/update-clubInfo.dto';
import { CreateClubInfoRequestDto } from '../dto/create-clubInfo.dto';
import { StoreService } from './store.service';

@Injectable()
export class StoreClubInfoService extends StoreService {
  constructor(
    protected readonly repo: StoreRepository,
    protected readonly nisitService: NisitService,
  ) {
    super(repo, nisitService);
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
    if (store.storeAdminNisitId !== actorNisitId) {
      throw new ForbiddenException('You do not have permission to manage this store.');
    }
    if (store.type !== StoreType.Club) {
      throw new BadRequestException('Not a club store.');
    }

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

      const complete = this.isObjectComplete(updated.clubInfo, [
        "clubName",
        "leaderFirstName",
        "leaderLastName",
        "leaderEmail",
        "leaderPhone",
        "leaderNisitId",
      ] as (keyof typeof updated.clubInfo)[]);

      // ขยับ state เฉพาะกรณี:
      // - เดิมอยู่ CreateStore
      // - และ club info ครบตามเกณฑ์
      if (updated.state === StoreState.ClubInfo && complete) {
        updated = await tx.store.update({
          where: { id: store.id },
          data: { state: StoreState.CreateStore },
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

  async createClubInfoFirstTime(
    actorNisitId: string,
    dto: CreateClubInfoRequestDto,
  ) {
    // กันเคสมี store อยู่แล้ว
    const existing = await this.repo.findStoreByNisitId(actorNisitId);
    if (existing) {
      throw new BadRequestException('You already have a store.');
    }
    const storeOwnedByActor = await this.repo.findStoreByAdminNisitId(actorNisitId);
    if (storeOwnedByActor) {
      throw new ConflictException('You are already a store admin.');
    }

    const payload = {
      clubName: dto.clubName,
      clubApplicationMediaId: dto.clubApplicationMediaId,
      leaderFirstName: dto.leaderFirstName,
      leaderLastName: dto.leaderLastName,
      leaderEmail: dto.leaderEmail?.toLowerCase(),
      leaderPhone: dto.leaderPhone,
      leaderNisitId: dto.leaderNisitId,
    };

    return this.repo.client.$transaction(async (tx) => {
      // ให้ repo จัดการสร้าง store + clubInfo ให้เลย
      const { store, clubInfo } = await this.repo.createClubStoreWithInfo(
        tx,
        actorNisitId,
        payload,
      );

      // เช็คว่า club info ครบไหม
      const complete = this.isObjectComplete(clubInfo, [
        'clubName',
        'leaderFirstName',
        'leaderLastName',
        'leaderEmail',
        'leaderPhone',
        'leaderNisitId',
        // 'clubApplicationMediaId',
      ] as (keyof typeof clubInfo)[]);
      
      let finalStore = store
      if (store.state === StoreState.ClubInfo && complete) {
        finalStore = await tx.store.update({
          where: { id: store.id },
          data: { state: StoreState.CreateStore },
          include: { clubInfo: true },
        });
      }

      return finalStore;
    });
  }

  async getClubInfo(
    nisitId: string
  ) {
    const store = await this.repo.findStoreByNisitId(nisitId);
    if (!store) {
      throw new BadRequestException('Store Not Found.');
    }

    const allInfo = await this.repo.findStoreWithMembersAndClub(store.id)

    return allInfo?.clubInfo
  }
}

