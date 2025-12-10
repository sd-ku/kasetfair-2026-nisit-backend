import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StoreState } from '@prisma/client';

export class UpdateStoreStatusDto {
    @ApiProperty({
        description: 'Target state of the store',
        enum: StoreState,
        example: StoreState.Validated,
    })
    @IsNotEmpty()
    @IsEnum(StoreState)
    targetState: StoreState;
}
