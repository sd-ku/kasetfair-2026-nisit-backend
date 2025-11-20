import { IsEnum } from 'class-validator';
import { MediaPurpose } from '@generated/prisma';

export class CreateMediaDto {
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;
}
