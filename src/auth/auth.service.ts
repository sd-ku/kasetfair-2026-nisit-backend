// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeDto, ExchangeResponeDto } from './dto/exchange.dto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

type AppJwtPayload = TokenPayload & { sub?: string; email?: string };

type ExchangeParams = {
  authHeader?: string;
  body: ExchangeDto;
  res?: Response;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // --- utils -------------------------------------------------

  private resolveAppToken(authHeader?: string, body?: ExchangeDto): string {
    // อนุโลมรับ id_token ผ่าน Authorization: Bearer <id_token> หรือ body.id_token
    const headerToken = authHeader?.startsWith('Bearer') ? authHeader.slice(7) : undefined;
    const appToken = headerToken ?? body?.id_token;
    if (!appToken) throw new UnauthorizedException('Missing id_token');
    return appToken;
  }

  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  private async verifyGoogleIdToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email_verified) throw new UnauthorizedException('Google email not verified');

      // (ออปชัน) บังคับโดเมน
      // if (payload.hd !== 'ku.th') throw new ForbiddenException('Email domain not allowed');

      return payload as AppJwtPayload;
    } catch (err) {
      console.error('verifyGoogleIdToken failed:', err);
      throw new UnauthorizedException('Invalid Google id_token');
    }
  }

  private async findUserIdentityBySub(providerSub: string) {
    return this.prisma.userIdentity.findUnique({
      where: { provider_providerSub: { provider: 'google', providerSub } },
    });
  }

  private async upsertUserIdentityBySub(payload: AppJwtPayload) {
    const providerSub = payload.sub;
    const providerEmail = payload.email?.toLowerCase();
    if (!providerSub || !providerEmail) throw new UnauthorizedException('Missing sub/email');

    return this.prisma.userIdentity.upsert({
      where: { provider_providerSub: { provider: 'google', providerSub } },
      update: { providerEmail },
      create: { provider: 'google', providerSub, providerEmail, emailVerified: true },
    });
  }

  private shouldUseAuthCookie() {
    return process.env.USE_AUTH_COOKIE === 'true';
  }

  public setAuthCookie(res: Response | undefined, accessToken: string) {
    if (!res || !this.shouldUseAuthCookie()) return;
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
  }

  private async getNisitInfoByNisitId(nisitId: string) {
    const nisit = await this.prisma.nisit.findUnique({ where: { nisitId } });
    if (!nisit) throw new UnauthorizedException('Account not linked to Nisit');
    return nisit;
  }

  // คำนวณช่องที่ยังขาด เพื่อส่งกลับไปให้ Next แสดงฟอร์มต่อ
  private computeMissing(nisit: { nisitId?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null }) {
    const missing: string[] = [];
    if (!nisit?.nisitId) missing.push('nisit_id');
    if (!nisit?.firstName) missing.push('first_name');
    if (!nisit?.lastName) missing.push('last_name');
    if (!nisit?.phone) missing.push('phone');
    return missing;
  }

  public mintServerToken(user: { sub: string; nisitId?: string | null, gmail: string, profileComplete: boolean }) {
    return this.jwt.sign(
      {
        sub: String(user.sub),
        nisitId: user.nisitId,
        email: user.gmail,
        profileComplete:
        user.profileComplete,
        typ: 'access'
      },
      { expiresIn: '1d' },
    );
  }

  // --- main --------------------------------------------------

  async exchange({ authHeader, body, res }: ExchangeParams): Promise<any> {
    const idToken = this.resolveAppToken(authHeader, body);
    const payload = await this.verifyGoogleIdToken(idToken);

    const providerSub = payload.sub;
    if (!providerSub) throw new UnauthorizedException('Missing providerSub');

    
    let gmailIdentity = await this.findUserIdentityBySub(providerSub);
    const nisitId = gmailIdentity?.nisitId;
    
    if (!gmailIdentity) {
      gmailIdentity = await this.upsertUserIdentityBySub({...payload, });
    }
    
    if (!gmailIdentity.providerSub || !gmailIdentity.providerEmail) {
      throw new InternalServerErrorException('User identity incomplete after upsert');
    } 

    const accessToken = this.mintServerToken({
      sub: gmailIdentity.providerSub!,
      nisitId: nisitId,
      gmail: gmailIdentity.providerEmail!,
      profileComplete: Boolean(gmailIdentity.nisitId),
    });
    
    console.log(Boolean(gmailIdentity.nisitId))

    this.setAuthCookie(res, accessToken);
    res?.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',               // ให้ path ตรงกับตัวเดิม
      maxAge: 60 * 60 * 1000,  // 1h
    });


    return {
        message: 'Exchange successful',
        user: {
          email: gmailIdentity.providerEmail,
          profileComplete: Boolean(gmailIdentity.nisitId),
        }
    };
  }
}
