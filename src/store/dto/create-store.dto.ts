import { StoreType } from '@generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  Length,
  ValidateNested,
  Matches
} from 'class-validator';

export class CreateStoreDto {
  @ApiProperty({
    description: 'Display name for the store.',
    example: 'Kaset Fair Goodies',
  })
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
    description: 'Gmail of Member. at least 3',
    example: ['a@ku.th', 'b@ku.th', 'c@ku.th'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayMinSize(3)
  @IsEmail({}, { each: true })
  @Matches(/^[A-Za-z0-9._%+-]+@ku\.th$/, {
    each: true,
    message: 'Each email must end with @ku.th',
  })
  memberGmails: string[]
}
