import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListDormitoryQueryDto {
  @ApiPropertyOptional({
    description: 'Return only active dormitories when true.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
