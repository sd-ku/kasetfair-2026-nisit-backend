import { StoreState, StoreType } from '@generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

export class StoreMemberDto {
  @ApiProperty({ example: "aaa@ku.th" })
  email: string;

  @ApiProperty({ example: "approved" })
  status: string;
}

export class StoreResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  storeName: string;

  @ApiProperty()
  boothNumber: string | null;

  @ApiProperty({ enum: StoreType })
  type: StoreType;

  @ApiProperty({ enum: StoreState })
  state: StoreState;

  @ApiProperty()
  storeAdminNisitId: string;

  @ApiProperty({ type: [StoreMemberDto] })
  members: StoreMemberDto[];

  @ApiProperty()
  boothLayoutMediaId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class StoreMemberEmailsResponseDto {
  @ApiProperty({ example: ['a@ku.th', 'b@ku.th', 'c@ku.th'], })
  memberEmails: string[];
}
