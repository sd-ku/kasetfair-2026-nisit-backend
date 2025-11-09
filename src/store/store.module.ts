import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { StoreRepository } from './store.repository';
import { NisitService } from 'src/nisit/nisit.service';

@Module({
  controllers: [StoreController],
  providers: [StoreService, StoreRepository, NisitService],
})
export class StoreModule {}
