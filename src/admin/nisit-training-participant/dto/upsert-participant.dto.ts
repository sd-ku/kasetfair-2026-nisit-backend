import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertNisitTrainingParticipantDto {
    @ApiProperty({
        description: 'Nisit ID of the participant',
        example: '6610401234',
    })
    @IsNotEmpty()
    @IsString()
    nisitId: string;
}
