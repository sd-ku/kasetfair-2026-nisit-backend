import { GoodsType, StoreType, StoreState } from '@prisma/client';
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

  // @ApiPropertyOptional({
  //   description: 'Change the store type.',
  //   enum: StoreType,
  // })
  // @IsOptional()
  // @IsEnum(StoreType)
  // type?: StoreType;

  // @ApiPropertyOptional({
  //   description: 'Change the goods type.',
  //   enum: GoodsType,
  // })
  // @IsOptional()
  // @IsEnum(GoodsType)
  // goodType?: GoodsType;

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

  // @ApiPropertyOptional({
  //   description: 'Media ID for the booth image.',
  //   example: 'cmhuynglj0000dkp44jhs41kt',
  //   nullable: true,
  // })
  // @IsOptional()
  // @IsString()
  // boothMediaId?: string | null;
}

export class UpdateDraftStoreResponseDto {
  @ApiProperty({ example: 101 })
  id: number;

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
    description: 'Change the goods type.',
    enum: GoodsType,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(GoodsType)
  goodType: GoodsType | null;

  @ApiProperty({ enum: StoreState, example: StoreState.StoreDetails, readOnly: true })
  state: StoreState;

  @ApiProperty({
    description: 'List of members with their status',
    isArray: true,
    example: [{ email: 'a@ku.th', status: 'Joined' }],
  })
  members: { email: string; status: string }[];

  @ApiPropertyOptional({
    description: 'Media ID for the booth image.',
    example: 'cmhuynglj0000dkp44jhs41kt',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  boothMediaId: string | null;

  @ApiProperty({
    description: 'Nisit ID of the store admin.',
    example: '6400000001',
    readOnly: true,
  })
  storeAdminNisitId: string;
}

export class UpdateStoreRequestDto {
  @ApiPropertyOptional({
    description: 'Update the display name of the store.',
    example: 'Kaset Fair Drinks',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  storeName?: string;

  @ApiPropertyOptional({
    description: 'Complete list of store member emails (minimum 3).',
    example: ['a@ku.th', 'b@ku.th', 'c@ku.th'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3, { message: 'สมาชิกในร้านต้องมีอย่างน้อย 3 คน' })
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

  @ApiPropertyOptional({
    description: 'Change the goods type.',
    enum: GoodsType,
  })
  @IsOptional()
  @IsEnum(GoodsType)
  goodType?: GoodsType;
}
