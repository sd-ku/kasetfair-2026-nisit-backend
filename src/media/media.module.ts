import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { GoogleDriveProvider } from './provider/google-drive.provider';

@Module({
  controllers: [MediaController],
  providers: [MediaService, GoogleDriveProvider],
})
export class MediaModule {}
