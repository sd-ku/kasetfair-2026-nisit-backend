// ku-auth.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { KuAuthService } from './ku-auth.service';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import * as crypto from 'crypto';

@Controller('auth/ku')
export class KuAuthController {
  constructor(
    private readonly kuAuthService: KuAuthService,
    private readonly authService: AuthService,
  ) {}

  // In-memory เก็บ state -> code_verifier (dev/demo)
  private stateStore = new Map<string, string>();

  @Get('login')
  async redirectToKu(@Res() res: Response) {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = this.kuAuthService.generateCodeVerifier();
    const codeChallenge = this.kuAuthService.generateCodeChallenge(codeVerifier);

    // เก็บ verifier ผูกกับ state
    this.stateStore.set(state, codeVerifier);

    const url = this.kuAuthService.buildAuthUrl(state, codeChallenge);
    return res.redirect(url);
  }

  @Get('callback')
  async kuCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new HttpException('Missing code or state', HttpStatus.BAD_REQUEST);
    }

    const codeVerifier = this.stateStore.get(state);
    if (!codeVerifier) {
      throw new HttpException('Invalid state', HttpStatus.BAD_REQUEST);
    }
    this.stateStore.delete(state);

    // 1) แลก code เป็น token ของ KU
    const token = await this.kuAuthService.exchangeCodeForToken(
      code,
      codeVerifier,
    );

    // 2) ดึง userinfo จาก KU
    const userInfo = await this.kuAuthService.getUserInfo(token.access_token);

    const kuEmail =
      userInfo.mail ??
      userInfo['google-mail'] ??
      userInfo['office365-mail'];

    const displayName = userInfo.thainame ?? userInfo.cn ?? kuEmail;
    const typePerson = userInfo['type-person'];
    const kuIdcode = userInfo['idcode']; // สมมติ field นี้มี และ unique ต่อ user

    if (!kuEmail) {
      throw new HttpException('No email from KU SSO', HttpStatus.FORBIDDEN);
    }

    // 3) map / สร้าง userIdentity ผ่าน AuthService (provider = 'ku')
    const kuIdentity = await this.authService.upsertKuIdentity({
      providerSub: kuIdcode ?? kuEmail,   // จะใช้ idcode เป็น sub หรือ email ก็เลือกเอา
      providerEmail: kuEmail,
    });

    // 4) ใช้ AuthService ออก access_token + ตั้ง cookie ตามมาตรฐานเดียวกับ Google
    this.authService.issueAccessTokenForIdentity(
      {
        providerSub: kuIdentity.providerSub,
        providerEmail: kuIdentity.providerEmail,
        nisitId: kuIdentity.nisitId,
      },
      res,
    );

    // 5) redirect กลับไปหน้าเว็บของ Next
    return res.redirect(`${process.env.FRONTEND_URL}/home`);
  }
}
