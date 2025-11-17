import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConsentRepository {
  constructor(readonly prisma: PrismaService) {}

  async findConsentByLanguageAndStatus(language: string, isActive: boolean) {
    return this.prisma.consentText.findFirst({
      where: { 
        language: language,
        active: isActive
      },
      orderBy: { version: 'desc' },
    });
  }

  async findConsentTextById(consentTextId: string) {
    return this.prisma.consentText.findUnique({
      where: { id: consentTextId },
    });
  }

  async recordNisitConsent(data: {
    nisitId: string;
    consentTextId: string;
    accepted: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceInfo?: string | null;
  }) {
    return this.prisma.userConsent.create({
      data,
    });
  }
}