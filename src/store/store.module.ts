import { Module } from '@nestjs/common';
import { StoreService } from './services/store.service';
import { StoreDraftService } from './services/store.draft.service';
import { StoreGoodService } from './services/store.good.service';
import { StoreController } from './controllers/store.controller';
import { GoodController } from './controllers/store.good.controller';
import { StoreDraftController } from './controllers/store.draft.controller';
import { StoreRepository } from './repositories/store.repository';
import { StoreDraftRepository } from './repositories/store.draft.repository';
import { StoreGoodRepository } from './repositories/store.good.repository';
import { NisitService } from 'src/nisit/nisit.service';

@Module({
  controllers: [StoreController, GoodController, StoreDraftController],
  providers: [
    StoreService,
    StoreDraftService,
    StoreGoodService,
    StoreRepository,
    StoreDraftRepository,
    StoreGoodRepository,
    NisitService,
  ],
})
export class StoreModule {}
