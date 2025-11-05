import { StoreState, StoreType } from '@generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

export class StoreResponseDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 'Kaset Fair Goodies' })
  storeName: string;

  @ApiProperty({ example: 'B12', nullable: true })
  boothNumber: string | null;

  @ApiProperty({ enum: StoreType, example: StoreType.Nisit })
  type: StoreType;

  // @ApiProperty({ enum: StoreState, example: StoreState.StoreDetails })
  @ApiProperty({ enum: StoreState })
  state: StoreState;

  // @ApiProperty({ example: '{ club data }', nullable: true })
  // clubInfo: number | null;

  @ApiProperty({ example: '2025-11-04T12:34:56.789Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-11-04T12:34:56.789Z' })
  updatedAt: Date;
}
