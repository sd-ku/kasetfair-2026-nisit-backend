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
    readonly prisma: PrismaService,
    readonly jwt: JwtService,
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

  public async findIdentity(provider: string, providerSub: string) {
    if (!provider || !providerSub) throw new UnauthorizedException('Missing provider/providerSub');
    return this.prisma.userIdentity.findUnique({
      where: { provider_providerSub: { provider, providerSub } },
    });
  }

  public async upsertIdentity(provider: string, providerSub: string, providerEmail: string) {
    if (!provider || !providerSub || !providerEmail) throw new UnauthorizedException('Missing provider/sub/email');
    const normalizedEmail = providerEmail.toLowerCase();
    return this.prisma.userIdentity.upsert({
      where: { provider_providerSub: { provider, providerSub } },
      update: { providerEmail: normalizedEmail, emailVerified: true },
      create: { provider, providerSub, providerEmail: normalizedEmail, emailVerified: true },
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

  public mintServerToken(user: { sub: string; nisitId?: string | null; gmail: string; profileComplete: boolean }) {
    return this.jwt.sign(
      {
        sub: String(user.sub),
        nisitId: user.nisitId,
        email: user.gmail,
        profileComplete: user.profileComplete,
        typ: 'access',
      },
      { expiresIn: '1d' },
    );
  }

  public issueAccessTokenForIdentity(
    identity: { providerSub: string; providerEmail: string; nisitId?: string | null },
    res?: Response,
  ) {
    if (!identity.providerSub || !identity.providerEmail) {
      throw new InternalServerErrorException('Identity missing providerSub/providerEmail');
    }

    const accessToken = this.mintServerToken({
      sub: identity.providerSub,
      nisitId: identity.nisitId,
      gmail: identity.providerEmail,
      profileComplete: Boolean(identity.nisitId),
    });

    this.setAuthCookie(res, accessToken);
    res?.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 1000 * 12,
    });

    return accessToken;
  }

  // --- main --------------------------------------------------

  async exchange({ authHeader, body, res }: ExchangeParams): Promise<any> {
    const idToken = this.resolveAppToken(authHeader, body);
    const payload = await this.verifyGoogleIdToken(idToken);

    const providerSub = payload.sub;
    const providerEmail = payload.email?.toLowerCase();
    if (!providerSub || !providerEmail) throw new UnauthorizedException('Missing providerSub/email');

    let gmailIdentity = await this.findIdentity('google', providerSub);
    if (!gmailIdentity || gmailIdentity.providerEmail !== providerEmail) {
      gmailIdentity = await this.upsertIdentity('google', providerSub, providerEmail);
    }

    if (!gmailIdentity.providerSub || !gmailIdentity.providerEmail) {
      throw new InternalServerErrorException('User identity incomplete after upsert');
    }

    this.issueAccessTokenForIdentity(
      {
        providerSub: gmailIdentity.providerSub,
        providerEmail: gmailIdentity.providerEmail,
        nisitId: gmailIdentity.nisitId,
      },
      res,
    );

    return {
      message: 'Exchange successful',
      user: {
        email: gmailIdentity.providerEmail,
        profileComplete: Boolean(gmailIdentity.nisitId),
      },
    };
  }
  
}
