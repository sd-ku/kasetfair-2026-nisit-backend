import { ApiProperty } from '@nestjs/swagger';

export class DormitoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'หอในชาย 1' })
  label: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 1, nullable: true, required: false })
  order: number | null;
}
