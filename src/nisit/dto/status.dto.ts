import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class getAuthStatusRequestDto {
    sub: string
    gmail: string
}

export class getAuthStatusResponeDto {
    sub: string
    gmail: string
    profileComplete: boolean
}