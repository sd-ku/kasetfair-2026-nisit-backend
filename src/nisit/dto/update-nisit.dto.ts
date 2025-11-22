import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsInt } from 'class-validator'
import { Type } from 'class-transformer';

export class UpdateNisitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nisitCardMediaId?: string

  @ApiPropertyOptional({
    description:
      'รหัสประเภทหอพัก (ต้องเป็น id จากตาราง dormitory_type)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number) // สำหรับแปลง string -> number อัตโนมัติเวลารับจาก query/body
  dormitoryTypeId?: number;
}
