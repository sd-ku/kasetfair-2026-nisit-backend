import { IsEnum, IsOptional } from 'class-validator';
import { StoreState } from '@prisma/client';

export class GenerateWheelDto {
    @IsOptional()
    @IsEnum(StoreState)
    state?: StoreState;
}

export class GenerateWheelResponseDto {
    wheelPath: string;
    totalStores: number;
    entries: string[];  // รายชื่อร้านทั้งหมด
}
