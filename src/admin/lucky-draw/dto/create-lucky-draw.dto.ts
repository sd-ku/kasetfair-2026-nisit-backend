
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLuckyDrawDto {
    @IsString()
    @IsNotEmpty()
    winner: string;
}
