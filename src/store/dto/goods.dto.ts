import { GoodsType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateGoodDto {
  @ApiProperty({
    description: 'Display name of the good.',
    example: 'Signature Milk Tea',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'Category of the good.',
    enum: GoodsType,
    example: GoodsType.Food,
  })
  @IsEnum(GoodsType)
  type: GoodsType;

  @ApiProperty({
    description: 'Unit price in THB (supports 2 decimal places).',
    example: 89.5,
    minimum: 0,
    type: Number,
  })
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Existing media id referencing the uploaded good image.',
    example: 'clpg5w0v10001x7xk95s7y4v3',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  goodMediaId?: string | null;
}

export class UpdateGoodDto extends PartialType(CreateGoodDto) {}

export class GoodsResponseDto {
  @ApiProperty({ example: 'clpg5w0v10001x7xk95s7y4v3' })
  id: string;

  @ApiProperty({ example: 'Signature Milk Tea' })
  name: string;

  @ApiProperty({ enum: GoodsType, example: GoodsType.Food })
  type: GoodsType;

  @ApiProperty({
    description: 'Price represented as a string to preserve precision.',
    example: '89.50',
  })
  price: string;

  @ApiProperty({ example: 42 })
  storeId: number;

  @ApiPropertyOptional({
    description: 'Media id referencing the uploaded good image, if available.',
    example: 'clpg5w0v10001x7xk95s7y4v3',
    nullable: true,
  })
  goodMediaId: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
