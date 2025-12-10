import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class BulkUpsertNisitTrainingParticipantDto {
    @ApiProperty({
        description: 'Array of Nisit IDs to upsert',
        example: ['6810505555', '6511045153', '6410100485'],
        type: [String],
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    nisitIds: string[];
}
