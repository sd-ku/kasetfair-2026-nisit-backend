import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DormitoryType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDormitoryDto } from './dto/create-dormitory.dto';
import { UpdateDormitoryDto } from './dto/update-dormitory.dto';
import { DormitoryResponseDto } from './dto/dormitory-response.dto';

@Injectable()
export class DormitoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDormitoryDto): Promise<DormitoryResponseDto> {
    try {
      const dormitory = await this.prisma.dormitoryType.create({
        data: {
          label: this.normalizeLabel(dto.label),
          isActive: dto.isActive ?? true,
          order: dto.order ?? null,
        },
      });

      return this.mapToResponse(dormitory);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async findAll(activeOnly?: boolean): Promise<DormitoryResponseDto[]> {
    const dormitories = await this.prisma.dormitoryType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    return dormitories.map((dormitory) => this.mapToResponse(dormitory));
  }

  async findOne(id: number): Promise<DormitoryResponseDto> {
    const dormitory = await this.prisma.dormitoryType.findUnique({
      where: { id },
    });

    if (!dormitory) {
      throw new NotFoundException('Dormitory not found');
    }

    return this.mapToResponse(dormitory);
  }

  async update(
    id: number,
    dto: UpdateDormitoryDto,
  ): Promise<DormitoryResponseDto> {
    const data = this.buildUpdateData(dto);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    try {
      const updated = await this.prisma.dormitoryType.update({
        where: { id },
        data,
      });
      return this.mapToResponse(updated);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async remove(id: number): Promise<DormitoryResponseDto> {
    try {
      const deleted = await this.prisma.dormitoryType.delete({
        where: { id },
      });
      return this.mapToResponse(deleted);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  private buildUpdateData(
    dto: UpdateDormitoryDto,
  ): Prisma.DormitoryTypeUpdateInput {
    const data: Prisma.DormitoryTypeUpdateInput = {};

    if (dto.label !== undefined) {
      data.label = this.normalizeLabel(dto.label);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.order !== undefined) {
      data.order = dto.order;
    }

    return data;
  }

  private mapToResponse(dormitory: DormitoryType): DormitoryResponseDto {
    return {
      id: dormitory.id,
      label: dormitory.label,
      isActive: dormitory.isActive,
      order: dormitory.order ?? null,
    };
  }

  private normalizeLabel(label: string) {
    return label.trim();
  }

  private transformPrismaError(error: unknown): Error {
    if (this.isPrismaKnownRequestError(error)) {
      if (error.code === 'P2002') {
        return new ConflictException('Dormitory label already exists');
      }
      if (error.code === 'P2025') {
        return new NotFoundException('Dormitory not found');
      }
    }

    return this.isStandardError(error) ? error : new Error('Unknown error');
  }

  private isPrismaKnownRequestError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
    );
  }

  private isStandardError(error: unknown): error is Error {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error
    );
  }
}
