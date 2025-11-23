import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreGoodRepository } from '../repositories/store.good.repository';
import { NisitService } from 'src/nisit/nisit.service';
import { GoodsResponseDto, CreateGoodDto, UpdateGoodDto } from '../dto/goods.dto';
import { Goods } from '@prisma/client';

@Injectable()
export class StoreGoodService extends StoreService {
  constructor(
    private readonly goodsRepo: StoreGoodRepository,
    nisitService: NisitService,
  ) {
    super(goodsRepo, nisitService);
  }

  async listGoods(nisitId: string): Promise<GoodsResponseDto[]> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const goods = await this.goodsRepo.findGoodsByStoreId(storeId);
    return goods.map((good) => this.mapGoodResponse(good));
  }

  async createGood(nisitId: string, dto: CreateGoodDto): Promise<GoodsResponseDto> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const payload = {
      storeId,
      name: dto.name.trim(),
      type: dto.type,
      price: dto.price,
      goodMediaId: dto.goodMediaId ? dto.goodMediaId.trim() : undefined,
    };

    try {
      const good = await this.goodsRepo.createGood(payload);
      return this.mapGoodResponse(good);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async getGood(nisitId: string, goodId: string): Promise<GoodsResponseDto> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const good = await this.ensureGoodBelongsToStore(goodId, storeId);
    return this.mapGoodResponse(good);
  }

  async updateGood(
    nisitId: string,
    goodId: string,
    dto: UpdateGoodDto,
  ): Promise<GoodsResponseDto> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    await this.ensureGoodBelongsToStore(goodId, storeId);

    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.price !== undefined) {
      if (dto.price < 0) {
        throw new BadRequestException('Price must be non-negative.');
      }
      data.price = dto.price;
    }
    if (dto.goodMediaId !== undefined) {
      data.goodMediaId = dto.goodMediaId ? dto.goodMediaId.trim() : null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }

    try {
      const updated = await this.goodsRepo.updateGood(goodId, data);
      return this.mapGoodResponse(updated);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async deleteGood(nisitId: string, goodId: string): Promise<void> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    await this.ensureGoodBelongsToStore(goodId, storeId);
    try {
      await this.goodsRepo.deleteGood(goodId);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  private async ensureGoodBelongsToStore(goodId: string, storeId: number): Promise<Goods> {
    const good = await this.goodsRepo.findGoodById(goodId);
    if (!good || good.storeId !== storeId) {
      throw new NotFoundException('Good not found.');
    }
    return good;
  }

  private mapGoodResponse(good: Goods): GoodsResponseDto {
    return {
      id: good.id,
      name: good.name,
      type: good.type,
      price: good.price.toString(),
      storeId: good.storeId,
      goodMediaId: good.goodMediaId ?? null,
      createdAt: good.createdAt,
      updatedAt: good.updatedAt,
    };
  }
}
