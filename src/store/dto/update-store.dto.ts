import { StoreState, StoreType } from '@generated/prisma';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateDraftStoreDto {
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
  description: 'Media ID for the booth image.',
  example: 'cmhuynglj0000dkp44jhs41kt',
})
  @IsOptional()
  @IsString()
  boothMediaId?: string;
}
