import { Module } from '@nestjs/common';
import { NisitService } from './nisit.service';
import { NisitController } from './nisit.controller';
import { ConsentModule } from 'src/consent/consent.module';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RegistrationLockGuard } from 'src/store/guards/registration-lock.guard';

@Module({
  imports: [
    PassportModule,
    AuthModule,
    ConsentModule,
    PrismaModule,
  ],
  controllers: [NisitController],
  providers: [NisitService, RegistrationLockGuard],
  exports: [NisitService],
})
export class NisitModule { }

