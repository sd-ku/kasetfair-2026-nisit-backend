// src/auth/dto/exchange.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExchangeDto {
  @ApiPropertyOptional({
    description: 'Google ID token used during the exchange flow.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2MzQ1NiJ9...',
  })
  @IsOptional()
  @IsString()
  id_token?: string;
}

export class ExchangeResponeDto {
  message: string
  user: {
      email: string
      profileComplete: boolean
  }
}

