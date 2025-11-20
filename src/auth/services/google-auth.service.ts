// src/auth/google-auth.service.ts
import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { AuthService } from './auth.service';
import { ExchangeDto, ExchangeResponeDto } from '../dto/exchange.dto';

type AppJwtPayload = TokenPayload & { sub?: string; email?: string };

export type ExchangeParams = {
  authHeader?: string;
  body: ExchangeDto;
  res?: Response;
};

@Injectable()
export class GoogleAuthService {
  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(private readonly auth: AuthService) {}

  private resolveAppToken(authHeader?: string, body?: ExchangeDto): string {
    const headerToken = authHeader?.startsWith('Bearer') ? authHeader.slice(7) : undefined;
    const appToken = headerToken ?? body?.id_token;
    if (!appToken) throw new UnauthorizedException('Missing id_token');
    return appToken;
  }

  private async verifyGoogleIdToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email_verified) throw new UnauthorizedException('Google email not verified');
      return payload as AppJwtPayload;
    } catch (err) {
      console.error('verifyGoogleIdToken failed:', err);
      throw new UnauthorizedException('Invalid Google id_token');
    }
  }

  async exchange({ authHeader, body, res }: ExchangeParams): Promise<ExchangeResponeDto> {
    const idToken = this.resolveAppToken(authHeader, body);
    const payload = await this.verifyGoogleIdToken(idToken);

    const providerSub = payload.sub;
    const providerEmail = payload.email?.toLowerCase();
    if (!providerSub || !providerEmail) {
      throw new UnauthorizedException('Missing providerSub/email');
    }

    const gmailIdentity = await this.auth.upsertIdentity('google', providerSub, providerEmail);
    if (!gmailIdentity.providerSub || !gmailIdentity.providerEmail) {
      throw new InternalServerErrorException('User identity incomplete after upsert');
    }

    const nisitInfo = await this.auth.findNisitInfoByProviderSub('google', providerSub);

    this.auth.issueAccessTokenForIdentity(
      {
        providerSub: gmailIdentity.providerSub,
        providerEmail: gmailIdentity.providerEmail,
        nisitId: nisitInfo?.nisitId,
        firstName: nisitInfo?.firstName,
        lastName: nisitInfo?.lastName,
        phone: nisitInfo?.phone,
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
