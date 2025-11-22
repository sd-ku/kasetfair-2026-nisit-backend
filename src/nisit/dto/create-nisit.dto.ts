import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNisitRequestDto {
  @ApiProperty({
    description: 'Student ID used as the primary identifier.',
    example: '6501234567',
  })
  @IsString()
  @Length(10, 10, { message: 'nisit_id must be exactly 10 characters' })
  nisitId: string;

  @ApiProperty({ description: 'First name of the student.', example: 'Arthit' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the student.', example: 'Kornchai' })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Thai phone number starting with 0 and 10 digits long.',
    example: '0891234567',
  })
  @IsString()
  @Matches(/^0[0-9]{9}$/, {
    message: 'phone must start with 0 and contain 10 digits',
  })
  phone: string;

  @ApiProperty({ description: 'Primary contact email.', example: 'arthit@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiPropertyOptional({
    description: 'Link to the uploaded student card image.',
    example: 'https://example.com/card.jpg',
  })
  @IsOptional()
  @IsString()
  nisitCardMediaId?: string;

  // ---------- หอพัก ----------

  @ApiProperty({
    description:
      'รหัสประเภทหอพัก (ต้องเป็น id จากตาราง dormitory_type)',
    example: 1,
  })
  @IsInt()
  @Type(() => Number) // สำหรับแปลง string -> number อัตโนมัติเวลารับจาก query/body
  dormitoryTypeId: number;

  // ---------- เพิ่มส่วน consent ----------

  @ApiProperty({
    description:
      'ID ของ consent_text ที่ผู้ใช้ยอมรับ (ต้องเป็น id จากตาราง consent_text)',
    example: '7c86a0fe-8ac4-4a82-90ea-e387f9430df3',
  })
  @IsString()
  consentTextId: string;

  @ApiProperty({
    description: 'ผู้ใช้ยืนยันว่าได้อ่านและยอมรับเงื่อนไขแล้ว (ต้องเป็น true เท่านั้น)',
    example: true,
  })
  @IsBoolean()
  consentAccepted: boolean;
}
