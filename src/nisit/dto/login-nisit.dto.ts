import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginNisitRequestDto {
  @ApiProperty({
    description: 'Email used for login.',
    example: 'arthit@example.com',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;
}
