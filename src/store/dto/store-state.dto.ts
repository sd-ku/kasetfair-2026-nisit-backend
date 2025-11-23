import { GoodsType, StoreState, StoreType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class StoreStatusResponseDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 'Kaset Fair Goodies', readOnly: true })
  storeName: string;

  @ApiProperty({ enum: StoreType, example: StoreType.Nisit, readOnly: true })
  type: StoreType;

  @ApiProperty({ enum: GoodsType, example: GoodsType.Food, nullable: true, readOnly: true })
  goodType: GoodsType | null;

  @ApiProperty({ enum: StoreState, example: StoreState.StoreDetails, readOnly: true })
  state: StoreState;

  @ApiProperty({ example: '6400000001', readOnly: true })
  storeAdminNisitId: string;
}
