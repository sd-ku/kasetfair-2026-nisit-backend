// media.controller.ts
import {
  Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Body
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GoogleDriveProvider } from './provider/google-drive.provider';
import { PrismaService } from 'src/prisma/prisma.service';

const ACCEPT = new Set(['image/jpeg','image/png','image/webp','application/pdf']);

@Controller('api/media')
export class MediaController {
  constructor(
    private gdrive: GoogleDriveProvider,
    private prisma: PrismaService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB ?? 10)) * 1024 * 1024 },
  }))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    if (!file) throw new BadRequestException('No file');
    if (!ACCEPT.has(file.mimetype)) throw new BadRequestException('Unsupported type');

    const drive = this.gdrive.client();
    const folderId = process.env.DRIVE_NISIT_CARD_FLODER_ID!;
    const filename = `${Date.now()}-${file.originalname}`.replace(/\s+/g,'_');

    // อัปโหลดแบบ one-shot จาก buffer
    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        // ถ้า Shared Drive:
        // parents: [folderId]
      },
      media: {
        mimeType: file.mimetype,
        body: BufferToStream(file.buffer),
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    // const fileId = res.data.id!;
    // let publicUrl: string | null = null;
    // if (process.env.PUBLIC_READ === 'true') {
    //   await drive.permissions.create({
    //     fileId,
    //     requestBody: { role: 'reader', type: 'anyone' },
    //     supportsAllDrives: true,
    //   });
    //   publicUrl = `https://drive.google.com/uc?id=${fileId}&export=view`;

    const fileId = res.data.id;
    const fileUrl = `https://drive.google.com/uc?id=${fileId}&export=view`;

    const data = await this.prisma.nisit.update({
      where: { nisitId: body.nisitId },
      data: { nisitCardLink: fileUrl },
    });
    return { ok: true, nisitId: data.nisitId, fileId, url: data.nisitCardLink };
  }
}

// helper: แปลง Buffer → Readable
import { Readable } from 'stream';
function BufferToStream(buf: Buffer) {
  const stream = new Readable();
  stream.push(buf);
  stream.push(null);
  return stream;
}
