// ku-auth.service.ts
import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class KuAuthService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  private readonly clientId = process.env.KU_CLIENT_ID!;
  private readonly clientSecret = process.env.KU_CLIENT_SECRET!;
  private readonly redirectUri = process.env.KU_REDIRECT_URI!;
  private readonly authEndpoint = process.env.KU_AUTH_ENDPOINT!;
  private readonly tokenEndpoint = process.env.KU_TOKEN_ENDPOINT!;
  private readonly userinfoEndpoint = process.env.KU_USERINFO_ENDPOINT!;

  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }

  buildAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.authEndpoint}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, codeVerifier: string) {
    // แลก code จาก KU เป็น token จาก KU token endpoint
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });

    try {
      const res = await axios.post(this.tokenEndpoint, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return res.data as {
        access_token: string;
        id_token?: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
      };
    } catch (err: any) {
      throw new HttpException(
        `KU token exchange failed: ${err.response?.data ?? err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getUserInfo(accessToken: string) {
    try {
      const res = await axios.get(this.userinfoEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return res.data as Record<string, any>;
    } catch (err: any) {
      throw new HttpException(
        `KU userinfo failed: ${err.response?.data ?? err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  public async upsertNisitProfileFromKu(params: {
    nisitId: string;      // userInfo.sub หรือ userInfo.idcode
    firstName?: string;
    lastName?: string;
    gmail: string;
  }) {
    const { nisitId, firstName, lastName, gmail } = params;

    if (!nisitId || !gmail) {
      throw new UnauthorizedException('Missing nisitId or gmail');
    }

    const normalizedGmail = gmail.toLowerCase();

    const nisit = await this.prisma.nisit.upsert({
      where: { nisitId },
      update: {
        email: normalizedGmail,
        // ใช้ undefined เพื่อไม่ overwrite เป็น null ถ้าไม่ได้ส่งมา
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
      },
      create: {
        nisitId,
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        email: normalizedGmail,
      },
    });

    return nisit;
  }

  async checkNisitPrivilege(nisitInfo) {
    // if (nisitInfo['campus'] !== 'B') {
    //   throw new UnauthorizedException('นิสิตวิทยาเขตบางเขนเท่านั้นที่สามารถเข้าถึงระบบนี้ได้');
    // }

    if (nisitInfo['type-person'] !== '3' && nisitInfo['degree'] !== '0') {
      throw new UnauthorizedException('นิสิตปริญญาตรีเท่านั้นที่สามารถเข้าถึงระบบนี้ได้');
    }
  }
}