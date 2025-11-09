import { IsEnum } from 'class-validator';

export enum MediaPurpose {
  NISIT_CARD = 'nisit-card',
  CLUB_APPLICATION = "club-application",
  STORE_BOOTH_LAYOUT = 'store-booth-layout',
  STORE_GOODS = 'store-goods',
}

export class CreateMediaDto {
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;
}
