import { StoreState, StoreType } from '@generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StoreValidationChecklistItemDto {
  @ApiProperty({
    description: 'Machine-friendly key of the requirement.',
    example: 'members',
  })
  key: string;

  @ApiProperty({
    description: 'Short human-readable description.',
    example: 'มีสมาชิกลงทะเบียนครบ 3 คน',
  })
  label: string;

  @ApiProperty({
    description: 'Indicates whether the requirement is satisfied.',
    example: true,
  })
  ok: boolean;

  @ApiPropertyOptional({
    description: 'Additional detail when the requirement fails.',
    example: 'กรุณาเชิญและให้สมาชิกลงทะเบียนให้ครบ 3 คน',
    nullable: true,
  })
  message?: string | null;
}

export class StorePendingValidationResponseDto {
  @ApiProperty({ example: 101 })
  storeId: number;

  @ApiProperty({ enum: StoreType, example: StoreType.Nisit })
  type: StoreType;

  @ApiProperty({ enum: StoreState, example: StoreState.ProductDetails })
  state: StoreState;

  @ApiProperty({
    description: 'True when all checklist items pass validation.',
    example: false,
  })
  isValid: boolean;

  @ApiProperty({
    type: StoreValidationChecklistItemDto,
    isArray: true,
  })
  checklist: StoreValidationChecklistItemDto[];
}
