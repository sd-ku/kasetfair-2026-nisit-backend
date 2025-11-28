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
import { KuAuthService } from '../services/ku-auth.service';
import { AuthService } from '../services/auth.service';
import type { Response, Request } from 'express';
import * as crypto from 'crypto';

@Controller('auth/ku')
export class KuAuthController {
  constructor(
    private readonly kuAuthService: KuAuthService,
    private readonly authService: AuthService,
  ) { }



  @Get('login')
  async redirectToKu(@Res() res: Response) {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = this.kuAuthService.generateCodeVerifier();
    const codeChallenge = this.kuAuthService.generateCodeChallenge(codeVerifier);

    // เก็บ verifier ผูกกับ state
    this.kuAuthService.storeState(state, codeVerifier);

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

    const codeVerifier = this.kuAuthService.retrieveVerifier(state);
    if (!codeVerifier) {
      throw new HttpException('Invalid state', HttpStatus.BAD_REQUEST);
    }

    // 1) แลก code เป็น token ของ KU
    const token = await this.kuAuthService.exchangeCodeForToken(
      code,
      codeVerifier,
    );

    // 2) ดึง userinfo จาก KU
    let userInfo = await this.kuAuthService.getUserInfo(token.access_token);

    const idCode = userInfo['idcode'];
    if (!idCode) {
      throw new HttpException('No idCode from KU SSO', HttpStatus.FORBIDDEN);
    }
    await this.kuAuthService.checkNisitPrivilege(userInfo);

    const kuEmail =
      userInfo['google-mail'] ??
      userInfo['office365-mail'];

    const kuIdcode = userInfo['idcode']; // สมมติ field นี้มี และ unique ต่อ user

    if (!kuEmail) {
      throw new HttpException('No email from KU SSO', HttpStatus.FORBIDDEN);
    }

    userInfo = await this.kuAuthService.upsertNisitProfileFromKu({
      nisitId: idCode,
      firstName: userInfo['first-name'],
      lastName: userInfo['last-name'],
      gmail: userInfo['google-mail'],
    });

    // 3) map / สร้าง userIdentity ผ่าน AuthService (provider = 'ku')
    const providerSub = kuIdcode ?? userInfo['uid'];
    const kuIdentity = await this.authService.upsertIdentity('ku', providerSub, kuEmail, kuIdcode);

    // 4) ใช้ AuthService ออก access_token + ตั้ง cookie ตามมาตรฐานเดียวกับ Google
    this.authService.issueAccessTokenForIdentity(
      {
        providerSub: kuIdentity.providerSub,
        nisitId: kuIdentity.nisitId,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        phone: userInfo.phone,
        providerEmail: kuIdentity.providerEmail,
      },
      res,
    );

    // 5) redirect กลับไปหน้าเว็บของ Next
    return res.redirect(`${process.env.FRONTEND_URL}/home`);
  }
}
