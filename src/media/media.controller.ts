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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from 'src/prisma/prisma.service';
import { MediaService } from './media.service'
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaPurpose } from './dto/create-media.dto';

@Controller('api/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB ?? 10)) * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateMediaDto,
    @Req() req,
  ) {

    let id = null;
    if (body.purpose == MediaPurpose.NISIT_CARD) {
      id = req.user.userId;
      if (!id) {
        throw new UnauthorizedException("invalid sub id")
      }
    } else {
      id = req.user.nisitId;
      if (!id) {
        throw new UnauthorizedException("invalid nisit id")
      }
    }

    // if (!id) {
    //   throw new UnauthorizedException("invalid id")
    // }

    // const nisitId = req.user.nisitId;
    // if (!nisitId) throw new UnauthorizedException("invalid nisit id");

    if (!file) {
      throw new BadRequestException('File is required');
    }

    const filePath = this.mediaService.saveFileToLocal(body.purpose, file, id);  

    return filePath;
  }
}
