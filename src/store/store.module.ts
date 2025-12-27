import { Module } from '@nestjs/common';
import { StoreService } from './services/store.service';
import { StoreDraftService } from './services/store.draft.service';
import { StoreGoodService } from './services/store.good.service';
import { StoreClubInfoService } from './services/store.club-info.service';
import { StoreController } from './controllers/store.controller';
import { GoodController } from './controllers/store.good.controller';
import { StoreDraftController } from './controllers/store.draft.controller';
import { StoreClubInfoController } from './controllers/store.club-info.controller';
import { StoreQuestionController } from './controllers/store.question.controller';
import { StoreRepository } from './repositories/store.repository';
import { StoreDraftRepository } from './repositories/store.draft.repository';
import { StoreGoodRepository } from './repositories/store.good.repository';
import { StoreQuestionRepository } from './repositories/store.question.repository';
import { NisitModule } from 'src/nisit/nisit.module';
import { StoreQuestionService } from './services/store.question.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RegistrationLockGuard } from './guards/registration-lock.guard';

@Module({
  imports: [NisitModule, PrismaModule],
  controllers: [StoreController, StoreClubInfoController, GoodController, StoreDraftController, StoreQuestionController],
  providers: [
    StoreService,
    StoreClubInfoService,
    StoreDraftService,
    StoreGoodService,
    StoreQuestionService,
    StoreRepository,
    StoreDraftRepository,
    StoreGoodRepository,
    StoreQuestionRepository,
    RegistrationLockGuard,
  ],
})
export class StoreModule { }

