import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class Nisitepository {
  constructor(readonly prisma: PrismaService) {}

  async (language: string, isActive: boolean) {
    return this.prisma.consentText.findFirst({
      where: { 
        language: language,
        active: isActive
      },
      orderBy: { version: 'desc' },
    });
  }
}
