import { Module } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';
import { Consent } from './entities/consent.entity';
import { ConsentRepository } from './consent.repository';

@Module({
  controllers: [ConsentController],
  providers: [ConsentService, ConsentRepository],
  exports: [ConsentService],
})
export class ConsentModule {}
