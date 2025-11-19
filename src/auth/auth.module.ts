import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { KuAuthController } from './controllers/ku-auth.controller';
import { KuAuthService } from './services/ku-auth.service';
import { GoogleAuthService } from './services/google-auth.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController, KuAuthController],
  providers: [JwtStrategy, AuthService, KuAuthService, GoogleAuthService],
  exports: [AuthService, GoogleAuthService],
})
export class AuthModule {}
