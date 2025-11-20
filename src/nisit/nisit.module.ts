import { Module } from '@nestjs/common';
import { NisitService } from './nisit.service';
import { NisitController } from './nisit.controller';
import { ConsentModule } from 'src/consent/consent.module';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    PassportModule,
    AuthModule,
    ConsentModule,
  ],
  controllers: [NisitController],
  providers: [NisitService],
  exports: [NisitService],
})
export class NisitModule {}
