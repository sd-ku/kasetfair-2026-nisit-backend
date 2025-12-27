import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateRegistrationSettingsDto {
    @ApiPropertyOptional({
        description: 'Manual lock/unlock registration',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isManuallyLocked?: boolean;

    @ApiPropertyOptional({
        description: 'Registration start time (ISO 8601)',
        example: '2025-01-01T00:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    registrationStart?: string;

    @ApiPropertyOptional({
        description: 'Registration end time (ISO 8601)',
        example: '2025-12-31T23:59:59.999Z',
    })
    @IsOptional()
    @IsDateString()
    registrationEnd?: string;

    @ApiPropertyOptional({
        description: 'Custom lock message',
        example: 'ขณะนี้หมดเวลาลงทะเบียนแล้ว กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย',
    })
    @IsOptional()
    @IsString()
    lockMessage?: string;
}

export class RegistrationSettingsResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    isManuallyLocked: boolean;

    @ApiPropertyOptional()
    registrationStart?: Date;

    @ApiPropertyOptional()
    registrationEnd?: Date;

    @ApiProperty()
    lockMessage: string;

    @ApiProperty()
    isCurrentlyLocked: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
