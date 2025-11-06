import { ApiProperty } from '@nestjs/swagger';

export class NisitResponseDto {
  @ApiProperty({ example: '6501234567' })
  nisitId: string;

  @ApiProperty({ example: 'Arthit' })
  firstName: string;

  @ApiProperty({ example: 'Kornchai' })
  lastName: string;

  @ApiProperty({ example: '0891234567' })
  phone: string;

  @ApiProperty({ example: 'arthit@ku.th' })
  email: string;

  @ApiProperty({ example: 'https://example.com/card.jpg', nullable: true })
  nisitCardLink: string | null;
}
