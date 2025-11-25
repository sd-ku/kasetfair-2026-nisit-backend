import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { MediaRepository } from './media.repository';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,       // ธุรกิจหลัก: validate, save, return result
    MediaRepository,    // ดึง/บันทึกข้อมูล Media จาก DB
    PrismaService,      // ใช้ใน Repository
  ],
  exports: [MediaService, MediaRepository],
})
export class MediaModule { }
