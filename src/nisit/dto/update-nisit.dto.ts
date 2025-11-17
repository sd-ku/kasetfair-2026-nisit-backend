import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

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
}
