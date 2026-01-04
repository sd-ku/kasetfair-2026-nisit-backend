import { IsString, IsEnum, IsArray, IsOptional, IsInt, Min, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BoothZone, BoothAssignmentStatus } from '@prisma/client';

// ----- Import Booth DTOs -----

export class BoothRangeDto {
    @IsString()
    @Matches(/^[A-Z]+$/, { message: 'prefix ต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์ใหญ่' })
    prefix: string;

    @IsInt()
    @Min(1)
    start: number;

    @IsInt()
    @Min(1)
    end: number;

    @IsEnum(BoothZone)
    zone: BoothZone;
}

export class BoothListDto {
    @IsArray()
    @IsString({ each: true })
    boothNumbers: string[]; // เช่น ["M1", "M2", "M5", "M10"]

    @IsEnum(BoothZone)
    zone: BoothZone;
}

export class ImportBoothRangeDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BoothRangeDto)
    ranges: BoothRangeDto[];
}

export class ImportBoothListDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BoothListDto)
    lists: BoothListDto[];
}

// ----- Create Assignment DTO -----

export class CreateBoothAssignmentDto {
    @IsInt()
    storeId: number;

    @IsInt()
    @IsOptional()
    luckyDrawEntryId?: number;
}

// ----- Manual Assignment DTO -----

export class ManualAssignBoothDto {
    @IsInt()
    storeId: number;

    @IsString()
    @IsOptional()
    note?: string; // หมายเหตุ เช่น "Assigned manually by admin"
}

export class BatchAssignBoothDto {
    @IsArray()
    @IsInt({ each: true })
    storeIds: number[]; // รายการ storeId ที่ต้องการ assign

    @IsString()
    @IsOptional()
    note?: string;
}


// ----- Verify Assignment DTO -----

export class VerifyBoothAssignmentDto {
    @IsString()
    barcode: string; // เช่น "20065105035316"

    @IsInt()
    assignmentId: number;
}

export class VerifyByStoreIdDto {
    @IsString()
    barcode: string;

    @IsInt()
    storeId: number;
}

// ----- Forfeit Assignment DTO -----

export class ForfeitBoothAssignmentDto {
    @IsInt()
    assignmentId: number;

    @IsString()
    @IsOptional()
    reason?: string;
}

// ----- Response DTOs -----

export class BoothResponseDto {
    id: number;
    boothNumber: string;
    zone: BoothZone;
    assignOrder: number;
    isAssigned: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class BoothAssignmentResponseDto {
    id: number;
    boothId: number;
    booth: BoothResponseDto;
    storeId: number;
    storeName: string;
    drawOrder: number;
    status: BoothAssignmentStatus;
    verifiedByNisitId?: string;
    verifiedAt?: Date;
    forfeitedAt?: Date;
    forfeitReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

export class BoothStatsDto {
    zone: BoothZone;
    total: number;
    assigned: number;
    pending: number;
    confirmed: number;
    forfeited: number;
    available: number;
}

export class NextBoothInfoDto {
    zone: BoothZone;
    nextBooth: BoothResponseDto | null;
    currentDrawOrder: number;
}
