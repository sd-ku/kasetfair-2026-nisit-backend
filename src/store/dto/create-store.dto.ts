import { StoreState, StoreType } from '@generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  ArrayUnique,
  IsEmail,
  IsEnum,
  IsString,
  Length,
  ValidateNested,
  Matches
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  Store,
} from '@generated/prisma';

export class CreateStoreRequestDto {
  @ApiProperty({
    description: 'Display name for the store.',
    example: 'Kaset Fair Goodies',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 255)
  storeName: string;

  @ApiProperty({
    description: 'Type of the store (Nisit or Club).',
    enum: StoreType,
  })
  @IsEnum(StoreType)
  type: StoreType;

  @ApiProperty({
    description: 'Gmail of Member. at least 2 (sender will added in service)',
    example: ['a@ku.th', 'b@ku.th', 'c@ku.th'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.trim() : v))
      : value
  )
  @IsEmail({}, { each: true })
  // @Matches(/^[A-Za-z0-9._%+-]+@ku\.th$/, {
  //   each: true,
  //   message: 'Each email must end with @ku.th',
  // })
  memberGmails: string[]
}

export class CreateStoreResponseDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 'Kaset Fair Goodies', readOnly: true })
  storeName: string;

  @ApiProperty({ enum: StoreType, example: StoreType.Nisit, readOnly: true })
  type: StoreType;

  @ApiProperty({ enum: StoreState, example: StoreState.StoreDetails, readOnly: true })
  state: StoreState;

  @ApiProperty()
  storeAdminNisitId: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['a@ku.th', 'b@ku.th'],
    description: 'Emails of members whose profiles are incomplete',
    readOnly: true,
  })
  missingProfileEmails: string[];

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-11-04T12:34:56.789Z',
    readOnly: true,
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-11-04T12:34:56.789Z',
    readOnly: true,
  })
  updatedAt: Date;
}

export function mapToCreateResponse(store: Store, missingProfileEmails: string[]): CreateStoreResponseDto {
  return {
    id: store.id,
    storeName: store.storeName,
    type: store.type,
    state: store.state,
    storeAdminNisitId: store.storeAdminNisitId,
    missingProfileEmails: missingProfileEmails,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}