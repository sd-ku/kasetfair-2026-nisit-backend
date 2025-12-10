import {
    Controller,
    Get,
    Param,
    UseGuards,
    BadRequestException,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from '../admin.guard';
import { AdminMediaService } from './media.service';

@Controller('api/admin/media')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminMediaController {
    constructor(private readonly adminMediaService: AdminMediaService) { }

    @Get('s3/list')
    async listAllMedia(@Query('prefix') prefix?: string) {
        const objects = await this.adminMediaService.listMediaFromS3({ prefix });
        return objects;
    }

    @Get('s3/:mediaId')
    async getMediaInfo(@Param('mediaId') mediaId: string) {
        const media = await this.adminMediaService.getMediaInfo(mediaId);
        if (!media) {
            throw new BadRequestException('Media not found');
        }
        return media;
    }
}
