import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MediaPurpose } from '@prisma/client';

export class CreateMediaPresignDto {
  @ApiProperty({
    description: 'ประเภทไฟล์ตามการใช้งาน เช่น STORE_GOODS, STORE_LAYOUT',
    enum: MediaPurpose,
  })
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose

  @ApiProperty({
    description: 'ชื่อไฟล์ต้นฉบับ (รวม .png/.jpg)',
    example: 'booth-layout.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  fileName?: string

  @ApiProperty({
    description: 'MIME type ของไฟล์ เช่น image/png',
    example: 'image/png',
    required: false,
  })
  @IsOptional()
  @IsString()
  contentType?: string
}
