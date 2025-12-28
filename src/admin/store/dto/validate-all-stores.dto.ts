import { ReviewStatus } from '@prisma/client';

export class StoreValidationResultDto {
    storeId: number;
    storeName: string;
    isValid: boolean;
    reviewStatus: ReviewStatus;
    comment?: string;
}

export class ValidateAllStoresResponseDto {
    totalProcessed: number;
    validStores: number;
    invalidStores: number;
    results: StoreValidationResultDto[];
}
