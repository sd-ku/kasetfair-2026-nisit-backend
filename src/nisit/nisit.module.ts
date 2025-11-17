import { Module } from '@nestjs/common';
import { NisitService } from './nisit.service';
import { NisitController } from './nisit.controller';
import { AuthService } from 'src/auth/auth.service';
import { ConsentModule } from 'src/consent/consent.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    ConsentModule,
  ],
  controllers: [NisitController],
  providers: [NisitService, AuthService],
  exports: [NisitService],
})
export class NisitModule {}
