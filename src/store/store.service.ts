// src/store/store.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Nisit,
  Prisma,
  Store,
  StoreRole,
  StoreState,
  StoreType,
} from '@generated/prisma';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreResponseDto } from './dto/store-response.dto';
import { StoreRepository } from './store.repository';

@Injectable()
export class StoreService {
  constructor(private readonly repo: StoreRepository) {}

  async createForUser(nisitId: string, myGmail: string, createDto: CreateStoreDto): Promise<StoreResponseDto> {
    const nisit = await this.repo.findNisitByNisitId(nisitId);
    if (!nisit) throw new UnauthorizedException('Nisit profile required before accessing store data.');
    if (nisit.storeId) throw new ConflictException('You already have a store assigned.');

    // 1) เตรียมรายการอีเมลสมาชิก (normalize: trim + toLowerCase + unique)
    const raw = [
      ...(createDto.memberGmails ?? []),
      ...myGmail,
    ]
    const normalized = Array.from(
      new Set(raw.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    );

    if (normalized.length < 3) {
      throw new BadRequestException('At least 3 member emails are required.');
    }

    // 2) ดึง Nisit ของสมาชิกทั้งหมดตามอีเมล
    const found = await this.repo.findNisitsByGmails(normalized);
    const foundMapEmail = new Map(
      found
        .map((x) => {
          const email = (x as any).gmail?.toLowerCase?.() ?? (x as any).email?.toLowerCase?.();
          return email ? [email, x] as const : null;
        })
        .filter(Boolean) as ReadonlyArray<readonly [string, typeof found[number]]>
    );


    // 2.1) ถ้าใครมีร้านอยู่แล้ว → ล้มทั้งรายการ (กติกางาน)
    const alreadyAssigned = found.filter((x) => x.storeId);
    if (alreadyAssigned.length) {
      const list = alreadyAssigned
        .map((x) => ((x as any).gmail ?? (x as any).email))
        .join(', ');
      throw new ConflictException(`Members already assigned to another store: ${list}`);
    }


    // 2.2) ถ้าเจอไม่ครบ → แจ้งรายการที่หายไป
    const registeredEmails = new Set(foundMapEmail.keys());
    const missingEmails = normalized.filter((e) => !registeredEmails.has(e));


    // 3) เตรียม data สร้างร้าน
    const storeData: Prisma.StoreCreateInput = {
      storeName: createDto.storeName.trim(),
      type: createDto.type ?? StoreType.Nisit,
      state: StoreState.CreateStore,
    };

    const created = await this.repo.createStoreWithMembersAndAttempts({
      storeData,
      memberNisitIds: found.map(x => x.nisitId),
      missingEmails,
    });

    return this.mapToResponse(created);
  }

  async getInfo(userSub: string): Promise<StoreResponseDto> {
    const nisit = await this.resolveNisit(userSub);
    if (!nisit.storeId) {
      throw new NotFoundException('Store not found for current user.');
    }

    const store = await this.repo.findStoreById(nisit.storeId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }
    return this.mapToResponse(store);
  }

  async updateInfo(userSub: string, updateDto: UpdateStoreDto): Promise<StoreResponseDto> {
    const nisit = await this.resolveNisit(userSub);

    if (!nisit.storeId) {
      throw new NotFoundException('Store not found for current user.');
    }
    // if (nisit.storeRole && nisit.storeRole !== StoreRole.Leader) {
    //   throw new ForbiddenException('Only store leaders can update store info.');
    // }

    const data = this.buildUpdateData(updateDto);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }

    try {
      const store = await this.repo.updateStore(nisit.storeId, data);
      return this.mapToResponse(store);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  // ---------- helpers ----------
  private async resolveNisit(userSub: string): Promise<Nisit> {
    const identity = await this.repo.findIdentityWithInfoByProviderSub('google', userSub);
    if (!identity?.info) {
      throw new UnauthorizedException('Nisit profile required before accessing store data.');
    }
    return identity.info;
  }

  private buildUpdateData(dto: UpdateStoreDto): Prisma.StoreUpdateInput {
    const data: Prisma.StoreUpdateInput = {};
    if (dto.storeName !== undefined) data.storeName = dto.storeName.trim();
    if (dto.type !== undefined) data.type = dto.type;
    return data;
  }

  private mapToResponse(store: Store): StoreResponseDto {
    return {
      id: store.id,
      storeName: store.storeName,
      boothNumber: store.boothNumber ?? null,
      type: store.type,
      state: store.state,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  private transformPrismaError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : String(error.meta?.target ?? 'unique constraint');
        return new ConflictException(`Duplicate value for ${target}.`);
      }
    }

    if (error instanceof Error) {
      return error;  // แคบเป็น Error ปกติได้แล้ว
    }

    return new Error('Unknown error');
  }
}
