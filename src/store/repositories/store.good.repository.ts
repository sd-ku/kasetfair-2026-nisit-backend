import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StoreRepository } from './store.repository';
import { Goods, Prisma } from '@prisma/client';

@Injectable()
export class StoreGoodRepository extends StoreRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findGoodsByStoreId(storeId: number): Promise<Goods[]> {
    return this.prisma.goods.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findGoodById(id: string): Promise<Goods | null> {
    return this.prisma.goods.findUnique({ where: { id } });
  }

  async createGood(data: Prisma.GoodsUncheckedCreateInput): Promise<Goods> {
    return this.prisma.goods.create({ data });
  }

  async updateGood(id: string, data: Prisma.GoodsUncheckedUpdateInput): Promise<Goods> {
    return this.prisma.goods.update({
      where: { id },
      data,
    });
  }

  async deleteGood(id: string): Promise<void> {
    await this.prisma.goods.delete({ where: { id } });
  }
}
