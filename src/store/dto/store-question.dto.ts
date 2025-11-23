import { StoreQuestionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class StoreQuestionOptionDto {
  @ApiProperty({ example: 'paper', description: 'Machine friendly option value.' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ example: 'Paper', description: 'Human readable label.' })
  @IsString()
  @IsNotEmpty()
  label: string;
}

export class StoreQuestionTemplateDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'waste_types' })
  key: string;

  @ApiProperty({ example: 'What waste types do you handle?' })
  label: string;

  @ApiPropertyOptional({ example: 'Select all that apply.', nullable: true })
  description: string | null;

  @ApiProperty({ enum: StoreQuestionType, example: StoreQuestionType.MULTI_SELECT })
  type: StoreQuestionType;

  @ApiPropertyOptional({
    type: [StoreQuestionOptionDto],
    description: 'Only for SINGLE_SELECT or MULTI_SELECT.',
    nullable: true,
  })
  options?: StoreQuestionOptionDto[] | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: 1, nullable: true })
  order: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class StoreQuestionAnswerResponseDto {
  @ApiProperty({ example: 1 })
  questionId: number;

  @ApiProperty({ example: 'waste_types' })
  questionKey: string;

  @ApiProperty({ example: 123 })
  storeId: number;

  @ApiProperty({
    description: 'Raw JSON value saved for the question.',
    examples: [{ text: 'Long description' }, { value: 'paper' }, { values: ['paper', 'plastic'] }],
  })
  value: Record<string, any>;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class StoreQuestionWithAnswerDto {
  @ApiProperty({ type: StoreQuestionTemplateDto })
  template: StoreQuestionTemplateDto;

  @ApiPropertyOptional({
    type: StoreQuestionAnswerResponseDto,
    nullable: true,
  })
  answer: StoreQuestionAnswerResponseDto | null;
}

export class UpsertStoreQuestionAnswerDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id: number;

  @ApiPropertyOptional({
    description: 'TEXT answer content.',
    example: 'We separate and recycle plastic bottles.',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'SINGLE_SELECT chosen option value.',
    example: 'paper',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'MULTI_SELECT chosen option values.',
    example: ['paper', 'plastic'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class UpsertStoreQuestionAnswersDto {
  @ApiProperty({ type: [UpsertStoreQuestionAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertStoreQuestionAnswerDto)
  answers: UpsertStoreQuestionAnswerDto[];
}

export class CreateStoreQuestionTemplateDto {
  @ApiProperty({ example: 'waste_types' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'What waste types do you handle?' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ example: 'Select all that apply.', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ enum: StoreQuestionType })
  @IsEnum(StoreQuestionType)
  type: StoreQuestionType;

  @ApiPropertyOptional({
    type: [StoreQuestionOptionDto],
    description: 'Required when type is SINGLE_SELECT or MULTI_SELECT.',
    nullable: true,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StoreQuestionOptionDto)
  options?: StoreQuestionOptionDto[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  order?: number | null;
}

export class UpdateStoreQuestionTemplateDto extends PartialType(
  OmitType(CreateStoreQuestionTemplateDto, ['key'] as const),
) {}
