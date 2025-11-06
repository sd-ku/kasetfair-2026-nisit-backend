import { StoreState, StoreType } from '@generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StoreStatusResponseDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 'Kaset Fair Goodies', readOnly: true })
  storeName: string;

  @ApiProperty({ enum: StoreType, example: StoreType.Nisit, readOnly: true })
  type: StoreType;

  @ApiProperty({ enum: StoreState, example: StoreState.StoreDetails, readOnly: true })
  state: StoreState;
}
