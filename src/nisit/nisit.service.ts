import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Nisit, Prisma } from '@generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNisitRequestDto } from './dto/create-nisit.dto';
import { UpdateNisitDto } from './dto/update-nisit.dto';
import { NisitResponseDto } from './dto/nisit-response.dto';

@Injectable()
export class NisitService {
  constructor(private readonly prisma: PrismaService) {}

  async register(createDto: CreateNisitRequestDto): Promise<NisitResponseDto> {
    
    const data = this.buildCreateData(createDto);
    // console.log(`data info res: ${data}`)

    try {
      const nisit = await this.prisma.nisit.create({ data });
      console.log(`create info res: `)
      console.log(nisit)
      await this.linkPendingIdentities(nisit.email, nisit.nisitId);
      return nisit;
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async getNisitInfoBySubId(providerSub: string): Promise<NisitResponseDto> {
    const nisitInfo = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerSub: { provider: 'google', providerSub },
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
    console.log(dto)
    try {
      return {
        nisitId: dto.nisitId.trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
        email: this.normalizeEmail(dto.email),
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

    return data;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeStringOrUndefined(value?: string) {
    if (value === undefined ) return undefined;
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

  private transformPrismaError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const fields = this.extractConflictFields(error);
        const conflictField = fields || 'specified field';
        return new ConflictException(`Duplicate value for ${conflictField}`);
      }
      if (error.code === 'P2025') {
        return new NotFoundException('Nisit not found');
      }
    }

    return error instanceof Error ? error : new Error('Unknown error');
  }

  private extractConflictFields(error: Prisma.PrismaClientKnownRequestError) {
    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? target
      : typeof target === 'string'
        ? [target]
        : [];

    const fieldMap: Record<string, string> = {
      nisitId: 'nisitId',
      email: 'email',
      phone: 'phone',
    };

    const mapped = fields.map((field) => fieldMap[field] ?? field);
    return mapped.join(', ');
  }
}
