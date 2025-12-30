import { IsInt, IsOptional } from 'class-validator';

export class MergeReviewStatusDto {
    @IsOptional()
    @IsInt()
    storeId?: number; // ถ้าไม่ระบุ จะ merge ทั้งหมด
}

export class MergeReviewStatusResultDto {
    storeId: number;
    storeName: string;
    previousState: string;
    newState: string;
    reviewStatus: string;
    comment?: string;
    success: boolean;
    error?: string;
}

export class MergeReviewStatusResponseDto {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    results: MergeReviewStatusResultDto[];
}
