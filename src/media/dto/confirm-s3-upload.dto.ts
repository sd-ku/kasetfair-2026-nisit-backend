// src/media/dto/confirm-s3-upload.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class ConfirmS3UploadDto {
  @ApiProperty({
    description: 'mediaId ที่ได้จากขั้นตอน /presign',
    example: 'c2f5a7c4-8b1a-4c7a-b9a1-2f3c9f0d9e12',
  })
  @IsString()
  mediaId: string

  @ApiPropertyOptional({
    description: 'ขนาดไฟล์ (bytes) ที่ client รู้หลังอัปโหลดเสร็จ',
    example: 123456,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  size?: number
}
