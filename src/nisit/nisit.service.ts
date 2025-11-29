import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Nisit, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConsentService } from 'src/consent/consent.service';
import { CreateNisitRequestDto } from './dto/create-nisit.dto';
import { UpdateNisitDto } from './dto/update-nisit.dto';
import { NisitResponseDto } from './dto/nisit-response.dto';
import { NisitPrismaErrorHandler } from './utils/prismaError';

@Injectable()
export class NisitService extends NisitPrismaErrorHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consentService: ConsentService,
  ) {
    super();
  }

  async register(createDto: CreateNisitRequestDto): Promise<NisitResponseDto> {
    if (!createDto.consentAccepted) {
      throw new BadRequestException(
        'You must accept the consent text before registration.',
      );
    }

    const data = this.buildCreateData(createDto);

    try {
      const nisit = await this.prisma.nisit.upsert({
        where: { nisitId: data.nisitId },
        update: {
          phone: data.phone,
          email: data.email,
          dormitoryTypeId: data.dormitoryTypeId,
          nisitCardMediaId: data.nisitCardMediaId
        },
        create: {
          nisitId: data.nisitId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          dormitoryTypeId: data.dormitoryTypeId,
          nisitCardMediaId: data.nisitCardMediaId,
        }
      });

      await this.consentService.recordNisitConsent({
        nisitId: nisit.nisitId,
        consentTextId: createDto.consentTextId,
        ipAddress: null,
        userAgent: null,
        deviceInfo: null,
      });

      await this.linkPendingIdentities(nisit.email, nisit.nisitId);

      return nisit;
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async getNisitInfoBySubId(providerSub: string): Promise<NisitResponseDto> {
    const nisitInfo = await this.prisma.userIdentity.findFirst({
      where: {
        providerSub
      },
      include: {
        info: true,
      },
    });

    if (!nisitInfo || !nisitInfo?.info) {
      throw new NotFoundException("Nisit not Found");
    }

    const infoRes = this.mapToResponse(nisitInfo.info);
    return infoRes
  }

  async updateInfo(
    nisitId: string,
    updateDto: UpdateNisitDto,
  ): Promise<NisitResponseDto> {
    // if (updateDto.nisitId && updateDto.nisitId !== nisitId) {
    //   throw new BadRequestException('Cannot change nisitId');
    // }

    const data = this.buildUpdateData(updateDto);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    const nisit = await this.prisma.nisit.findUnique({
      where: { nisitId },
    });
    if (!nisit) {
      throw new NotFoundException('Nisit not found');
    }

    if (updateDto.nisitCardMediaId && updateDto.nisitCardMediaId !== nisit.nisitCardMediaId) {
      // ลบรูปเก่าถ้ามี
      if (nisit.nisitCardMediaId) {
        await this.prisma.media.update({
          where: { id: nisit.nisitCardMediaId },
          data: { status: 'DELETE' },
        });
      }
    }

    try {
      const nisit = await this.prisma.nisit.update({
        where: { nisitId },
        data,
      });
      return this.mapToResponse(nisit);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  private mapToResponse(nisit: Nisit): NisitResponseDto {
    try {
      return {
        nisitId: nisit.nisitId,
        firstName: nisit.firstName,
        lastName: nisit.lastName,
        phone: nisit.phone,
        email: nisit.email,
        nisitCardMediaId: nisit.nisitCardMediaId ?? null,
      };
    } catch (error) {
      throw new BadRequestException('Invalid or incomplete Nisit info data');
    }
  }

  private buildCreateData(
    dto: CreateNisitRequestDto,
  ) {
    try {
      return {
        nisitId: dto.nisitId.trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
        email: this.normalizeEmail(dto.email),
        dormitoryTypeId: dto.dormitoryTypeId,
        nisitCardMediaId: this.normalizeStringOrUndefined(dto.nisitCardMediaId),
      };
    } catch (error) {
      console.error(error)
      throw new BadRequestException(error)
    }
  }

  private buildUpdateData(
    dto: UpdateNisitDto,
  ): Prisma.NisitUpdateInput {
    const data: Prisma.NisitUpdateInput = {};

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName.trim();
    }
    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName.trim();
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim();
    }
    if (dto.nisitCardMediaId !== undefined) {
      if (dto.nisitCardMediaId) {
        // มีค่า → ผูก media ตัวใหม่
        data.nisitCardMedia = {
          connect: { id: dto.nisitCardMediaId },
        };
      } else {
        // ส่งมาเป็น "" หรือ null → ถอดความสัมพันธ์ออก
        data.nisitCardMedia = {
          disconnect: true,
        };
      }
    }

    return data;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeStringOrUndefined(value?: string) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private async linkPendingIdentities(email: string, nisitId: string) {
    await this.prisma.userIdentity.updateMany({
      where: {
        provider: 'google',
        providerEmail: email,
        nisitId: null,
      },
      data: { nisitId },
    });
  }


}
