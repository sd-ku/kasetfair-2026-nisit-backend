import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  UseGuards,
  InternalServerErrorException,
  UnauthorizedException,
  Req,
  Query,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from 'src/prisma/prisma.service';
import { MediaService } from './media.service'
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaPurpose } from '@prisma/client';
import { content } from 'googleapis/build/src/apis/content';
import { CreateMediaPresignDto } from './dto/create-presign.dto';
import { ConfirmS3UploadDto } from './dto/confirm-s3-upload.dto';

@Controller('api/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) { }

  @Post('s3/presign')
  async presignUpload(
    @Req() req,
    @Body() body: CreateMediaPresignDto,
  ) {
    // ยังกัน “ต้องล็อกอิน” ผ่าน JwtAuthGuard อยู่เหมือนเดิม
    const user = req.user as { nisitId?: string; sub?: string; email?: string }

    // เอา identity บางอย่างมาเป็น uploaderId ถ้ามี
    const uploaderId: string | null = user.nisitId ?? user.sub ?? null

    const presign = await this.mediaService.generatePresignedUrl(
      uploaderId,
      body.purpose,
      body.fileName,
      body.contentType,
    )

    return presign
  }

  @Post('s3/confirm')
  async confirmS3Upload(
    @Req() req,
    @Body() body: ConfirmS3UploadDto,
  ) {
    // ยังกัน “ต้องล็อกอิน” ผ่าน JwtAuthGuard อยู่เหมือนเดิม
    const user = req.user as { nisitId?: string; sub?: string; email?: string }

    // เอา identity บางอย่างมาเป็น uploaderId ถ้ามี
    const uploaderId: string | null = user.nisitId ?? user.sub ?? null

    const result = await this.mediaService.confirmS3Upload(uploaderId, {
      mediaId: body.mediaId,
      size: body.size,
    })

    return result
  }

  // @Get('s3/list')
  // async listAllMedia(
  //   @Query('prefix') prefix?: string,
  // ) {
  //   const objects = await this.mediaService.listMediaFromS3({ prefix });
  //   return objects;
  // }

  @Delete('s3/:mediaId')
  async deleteMedia(
    @Param('mediaId') mediaId: string,
    @Req() req: any,
  ) {
    const actorId = req.user?.nisitId ?? req.user?.userId ?? null;

    return this.mediaService.deleteMedia({
      mediaId,
      actorId: actorId,
    });
  }

  @Get('s3/:mediaId')
  async getMediaInfo(
    @Param('mediaId') mediaId: string,
    @Req() req: any,
  ) {
    const media = await this.mediaService.getMediaInfo({
      mediaId,
      actorId: req.user?.nisitId ?? req.user?.userId ?? null,
    });
    if (!media) {
      throw new BadRequestException('Media not found');
    }
    return media;
  }
}
