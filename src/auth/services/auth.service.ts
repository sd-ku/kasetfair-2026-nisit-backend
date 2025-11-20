// src/auth/services/auth.service.ts
import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    readonly prisma: PrismaService,
    readonly jwt: JwtService,
  ) {}

  public async findIdentity(provider: string, providerSub: string) {
    if (!provider || !providerSub) throw new UnauthorizedException('Missing provider/providerSub');
    return this.prisma.userIdentity.findUnique({
      where: { provider_providerSub: { provider, providerSub } },
    });
  }

  public async findNisitInfoByProviderSub(provider: string, providerSub: string) {
    if (!provider || !providerSub) {
      throw new UnauthorizedException('Missing provider/providerSub');
    }

    const identity = await this.prisma.userIdentity.findUnique({
      where: { provider_providerSub: { provider, providerSub } },
      select: {
        info: {
          select: {
            // ตรงนี้ให้ตรงกับ model Nisit ของมึงจริงๆ
            nisitId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    // ให้รีเทิร์นเฉพาะ info (Nisit) หรือ null
    return identity?.info;
  }


  public async upsertIdentity(
    provider: string,
    providerSub: string,
    providerEmail: string,
    nisitId?: string,
  ) {
    if (!provider || !providerSub || !providerEmail) {
      throw new UnauthorizedException('Missing provider/sub/email');
    }
    const normalizedEmail = providerEmail.toLowerCase();
    return this.prisma.userIdentity.upsert({
      where: { provider_providerSub: { provider, providerSub } },
      update: { 
        providerEmail: normalizedEmail, 
        emailVerified: true,
        nisitId: nisitId 
      },
      create: { 
        provider,
        providerSub, 
        providerEmail: normalizedEmail, 
        emailVerified: true, 
        nisitId
      },
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

  public mintServerToken(
    user: { 
      sub: string;
      nisitId?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      email: string;
      profileComplete: boolean
    },
  ): string {
    return this.jwt.sign(
      {
        sub: String(user.sub),
        nisitId: user.nisitId,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        profileComplete: user.profileComplete,
        typ: 'access',
      },
      { expiresIn: '1d' },
    );
  }

  public issueAccessTokenForIdentity(
    identity: {
      providerSub: string;
      nisitId?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      providerEmail: string;
    },
    res?: Response,
  ) {
    if (!identity.providerSub || !identity.providerEmail) {
      throw new InternalServerErrorException('Identity missing providerSub/providerEmail');
    }

    const accessToken = this.mintServerToken({
      sub: identity.providerSub,
      nisitId: identity.nisitId,
      firstName: identity.firstName,
      lastName: identity.lastName,
      phone: identity.phone,
      email: identity.providerEmail,
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
}
