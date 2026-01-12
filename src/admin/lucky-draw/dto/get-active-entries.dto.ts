import { IsEnum, IsOptional } from 'class-validator';
import { StoreType } from '@prisma/client';

export class GetActiveEntriesDto {
    @IsOptional()
    @IsEnum(StoreType)
    type?: StoreType;
}
