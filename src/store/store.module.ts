import { Module } from '@nestjs/common';
import { StoreService } from './services/store.service';
import { StoreDraftService } from './services/store.draft.service';
import { StoreGoodService } from './services/store.good.service';
import { StoreClubInfoService } from './services/store.club-info.service';
import { StoreController } from './controllers/store.controller';
import { GoodController } from './controllers/store.good.controller';
import { StoreDraftController } from './controllers/store.draft.controller';
import { StoreClubInfoController } from './controllers/store.club-info.controller';
import { StoreRepository } from './repositories/store.repository';
import { StoreDraftRepository } from './repositories/store.draft.repository';
import { StoreGoodRepository } from './repositories/store.good.repository';
import { NisitModule } from 'src/nisit/nisit.module';

@Module({
  imports: [NisitModule],
  controllers: [StoreController, StoreClubInfoController, GoodController, StoreDraftController],
  providers: [
    StoreService,
    StoreClubInfoService,
    StoreDraftService,
    StoreGoodService,
    StoreRepository,
    StoreDraftRepository,
    StoreGoodRepository,
  ],
})
export class StoreModule {}
