import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNisitRequestDto {
  @ApiProperty({
    description: 'Student ID used as the primary identifier.',
    example: '6501234567',
  })
  @IsString()
  @Length(10, 10, { message: 'nisit_id must be exactly 10 characters' })
  nisitId: string;

  @ApiProperty({ description: 'First name of the student.', example: 'Arthit' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the student.', example: 'Kornchai' })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Thai phone number starting with 0 and 10 digits long.',
    example: '0891234567',
  })
  @IsString()
  @Matches(/^0[0-9]{9}$/, {
    message: 'phone must start with 0 and contain 10 digits',
  })
  phone: string;

  @ApiProperty({ description: 'Primary contact email.', example: 'arthit@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiPropertyOptional({
    description: 'Link to the uploaded student card image.',
    example: 'https://example.com/card.jpg',
  })
  @IsOptional()
  @IsString()
  nisitCardLink?: string;
}
