import { StoreType } from '@generated/prisma';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateDraftStoreRequestDto {
  @ApiPropertyOptional({
    description: 'Update the display name of the store.',
    example: 'Kaset Fair Drinks',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  storeName?: string;

  @ApiPropertyOptional({
    description: 'Change the store type.',
    enum: StoreType,
  })
  @IsOptional()
  @IsEnum(StoreType)
  type?: StoreType;

  @ApiPropertyOptional({
    description: 'Complete list of store member emails (minimum 3).',
    example: ['a@ku.th', 'b@ku.th', 'c@ku.th'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ArrayUnique((email: string) => (typeof email === 'string' ? email.toLowerCase() : email))
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
          .filter((entry) => entry !== '')
      : value,
  )
  @IsEmail({}, { each: true })
  memberEmails?: string[];

  @ApiPropertyOptional({
    description: 'Media ID for the booth image.',
    example: 'cmhuynglj0000dkp44jhs41kt',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  boothMediaId?: string | null;
}

export class UpdateDraftStoreResponseDto {
  @ApiPropertyOptional({
    description: 'Update the display name of the store.',
    example: 'Kaset Fair Drinks',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  storeName: string;

  @ApiPropertyOptional({
    description: 'Change the store type.',
    enum: StoreType,
  })
  @IsOptional()
  @IsEnum(StoreType)
  type: StoreType;

  @ApiPropertyOptional({
    description: 'Complete list of store member emails (minimum 3).',
    example: ['a@ku.th', 'b@ku.th', 'c@ku.th'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ArrayUnique((email: string) => (typeof email === 'string' ? email.toLowerCase() : email))
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
          .filter((entry) => entry !== '')
      : value,
  )
  @IsEmail({}, { each: true })
  memberEmails: string[];

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['a@ku.th', 'b@ku.th'],
    description: 'Emails of members whose profiles are incomplete',
    readOnly: true,
  })
  missingProfileEmails: string[];

  @ApiPropertyOptional({
    description: 'Media ID for the booth image.',
    example: 'cmhuynglj0000dkp44jhs41kt',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  boothMediaId: string | null;
}

