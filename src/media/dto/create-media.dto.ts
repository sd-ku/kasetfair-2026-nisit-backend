import { IsEnum } from 'class-validator';
import { MediaPurpose } from '@prisma/client';

export class CreateMediaDto {
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;
}
