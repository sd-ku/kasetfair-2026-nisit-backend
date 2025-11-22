import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDormitoryDto {
  @ApiProperty({
    description: 'Human readable dormitory name.',
    example: 'หอในชาย 1',
  })
  @IsString()
  @MaxLength(255)
  label: string;

  @ApiPropertyOptional({
    description: 'Whether this dormitory type is active.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Ordering number used for sorting.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  order?: number;
}
