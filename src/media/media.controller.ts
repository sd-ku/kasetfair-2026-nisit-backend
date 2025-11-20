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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from 'src/prisma/prisma.service';
import { MediaService } from './media.service'
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaPurpose } from '@generated/prisma';
import { content } from 'googleapis/build/src/apis/content';
import { CreateMediaPresignDto } from './dto/create-presign.dto';
import { ConfirmS3UploadDto } from './dto/confirm-s3-upload.dto';

@Controller('api/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  @Post('s3/presign')
  async presignUpload(
    @Req() req,
    @Body() body: CreateMediaPresignDto,
  ) {
    const actorNisitId = req.user.nisitId;
    if (!actorNisitId) {
      throw new UnauthorizedException("invalid nisit id")
    }

    const presign = await this.mediaService.generatePresignedUrl(
      actorNisitId,
      body.purpose,
      body.fileName,
      body.contentType,
    );

    return presign;
  }

  @Post('s3/confirm')
  async confirmS3Upload(
    @Req() req,
    @Body() body: ConfirmS3UploadDto,
  ) {
    const actorNisitId = req.user?.nisitId
    if (!actorNisitId) {
      throw new UnauthorizedException('invalid nisit id')
    }

    const result = await this.mediaService.confirmS3Upload(actorNisitId, {
      mediaId: body.mediaId,
      size: body.size,
    })

    return result
  }

  @Get('s3/list')
  async listAllMedia(
    @Query('prefix') prefix?: string,
  ) {
    const objects = await this.mediaService.listMediaFromS3({ prefix });
    return objects;
  }
}
