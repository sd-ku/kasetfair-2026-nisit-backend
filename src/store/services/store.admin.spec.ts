import { ConflictException, ForbiddenException } from '@nestjs/common';
import { StoreDraftService } from './store.draft.service';
import { StoreService } from './store.service';
import { GoodsType, StoreState, StoreType } from '@generated/prisma';

describe('Store admin handling', () => {
  describe('StoreDraftService.createForUser', () => {
    const baseRequest = {
      storeName: 'Kaset Fair Store',
      type: StoreType.Nisit,
      goodType: GoodsType.Food,
      memberGmails: ['a@ku.th', 'b@ku.th'],
    };
    const baseStore = {
      id: 1,
      storeName: baseRequest.storeName,
      type: baseRequest.type,
      goodType: baseRequest.goodType,
      state: StoreState.CreateStore,
      storeAdminNisitId: '123',
      members: [],
      memberAttemptEmails: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let draftRepo: any;
    let draftService: StoreDraftService;

    beforeEach(() => {
      draftRepo = {
        findNisitByNisitId: jest.fn(),
        findStoreByAdminNisitId: jest.fn(),
        findNisitsByGmails: jest.fn(),
        createStoreWithMembersAndAttempts: jest.fn(),
      };
      draftService = new StoreDraftService(draftRepo as any, {} as any);
    });

    it('assigns the creator as store admin on creation', async () => {
      draftRepo.findNisitByNisitId.mockResolvedValue({
        nisitId: '123',
        email: 'me@ku.th',
        storeId: null,
      });
      draftRepo.findStoreByAdminNisitId.mockResolvedValue(null);
      draftRepo.findNisitsByGmails.mockResolvedValue([
        { nisitId: '123', email: 'me@ku.th', storeId: null },
        { nisitId: '456', email: 'a@ku.th', storeId: null },
        { nisitId: '789', email: 'b@ku.th', storeId: null },
      ]);
      draftRepo.createStoreWithMembersAndAttempts.mockImplementation(async ({ storeData }) => {
        expect(storeData.storeAdmin).toEqual({ connect: { nisitId: '123' } });
        return baseStore;
      });

      const result = await draftService.createForUser('123', 'me@ku.th', baseRequest);

      expect(result.storeAdminNisitId).toBe('123');
      expect(draftRepo.createStoreWithMembersAndAttempts).toHaveBeenCalled();
    });

    it('rejects creation when nisit already administers another store', async () => {
      draftRepo.findNisitByNisitId.mockResolvedValue({
        nisitId: '123',
        email: 'me@ku.th',
        storeId: null,
      });
      draftRepo.findStoreByAdminNisitId.mockResolvedValue({ id: 99 });

      await expect(
        draftService.createForUser('123', 'me@ku.th', baseRequest),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('StoreService', () => {
    it('prevents non-admins from updating a store', async () => {
      const repo = {
        findStoreByNisitId: jest.fn().mockResolvedValue({
          id: 1,
          storeAdminNisitId: 'owner-1',
        }),
      };
      const service = new StoreService(repo as any, {} as any);

      await expect(
        service.updateStore('not-owner', {} as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns storeAdminNisitId in store status responses', async () => {
      const repo = {
        findStoreByNisitId: jest.fn().mockResolvedValue({
          id: 5,
          storeName: 'My Store',
          type: StoreType.Nisit,
          state: StoreState.StoreDetails,
          storeAdminNisitId: 'owner-5',
        }),
      };
      const service = new StoreService(repo as any, {} as any);

      const status = await service.getStoreStatus('owner-5');

      expect(status.storeAdminNisitId).toBe('owner-5');
    });
  });
});
