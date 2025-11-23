import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  Prisma,
  Store,
  Nisit,
  Media,
} from '@prisma/client';

export type MediaWithStoreAdmin = Prisma.MediaGetPayload<{
  include: {
    storeBooth: {
      select: {
        id: true;
        storeAdminNisitId: true
      };
    };
    good: {
      select: { storeId: true };
    };
  };
}>;

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * สร้าง media ใหม่หลังอัปโหลดสำเร็จ
   */
  async create(data: Prisma.MediaCreateInput): Promise<Media> {
    return this.prisma.media.create({ data });
  }

  /**
   * ค้นหา media ด้วย id
   */
  async findById(id: string): Promise<MediaWithStoreAdmin | null> {
    return this.prisma.media.findUnique({
      where: { id },
      include: {
        storeBooth: {
          select: {
            id: true,
            storeAdminNisitId: true
          },
        },
        good: {
          select: { storeId: true },
        },
      },
    });
  }

  /**
   * ค้นหา media ทั้งหมดของผู้ใช้คนหนึ่ง
   */
  async findAllByUser(createdBy: string): Promise<Media[]> {
    return this.prisma.media.findMany({
      where: { createdBy },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * อัปเดตข้อมูล media (เช่น เปลี่ยนสถานะเป็น ACTIVE หรือเพิ่ม purpose)
   */
  async update(id: string, data: Prisma.MediaUpdateInput): Promise<Media> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(`Media ${id} not found`);
    return this.prisma.media.update({ where: { id }, data });
  }

  /**
   * ลบ media ออกจากระบบ (soft delete ได้ถ้ามี field deletedAt)
   */
  async delete(id: string): Promise<Media> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(`Media ${id} not found`);
    return this.prisma.media.delete({ where: { id } });
  }

  /**
   * ล้าง media ที่ยังไม่ได้ผูกกับ entity (orphan) เกิน N ชั่วโมง
   * ใช้สำหรับ cron cleanup
   */
  async findOrphanOlderThan(hours: number): Promise<Media[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.prisma.media.findMany({
      where: {
        createdAt: { lt: cutoff },
        storeBooth: null,
        nisitCardOwner: null,
      },
    });
  }

  async findStoreByAdminNisitId(nisitId: string) {
    return this.prisma.store.findUnique({
      where: { storeAdminNisitId: nisitId },
    });
  }

  async findStoreIdByNisitId(nisitId: string) {
    const storeId = await this.prisma.nisit.findUnique({
      where: { nisitId },
      select: {
        store: {
          select: {
            id: true,
          },
        },
      },
    });

    return storeId?.store?.id;
  }
}
