import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
} from '@nestjs/common';
import { MediaPurpose } from './dto/create-media.dto';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { MediaRepository } from './media.repository';

const ACCEPT = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

// โฟลเดอร์หลักเก็บไฟล์บนเครื่อง: <project>/upload
const UPLOAD_ROOT = path.join(process.cwd(), 'upload'); // path จริงบนเครื่อง

@Injectable()
export class MediaService {
  constructor(
    private readonly mediaRepository: MediaRepository,
  ) {}

  async saveFileToLocal(
    purpose: MediaPurpose,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    if (!ACCEPT.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    // 1) หา sub-folder จาก purpose (เป็น path ย่อย ไม่ใช่ URL, ไม่ต้องมี / นำหน้า)
    const subdir = this.resolveFolderFromPurpose(purpose); // เช่น "nisit", "store/layout"
    const dir = path.join(UPLOAD_ROOT, subdir);            // <project>/upload/nisit

    // 2) สร้างโฟลเดอร์ถ้ายังไม่มี
    try {
      await fsp.mkdir(dir, { recursive: true });
    } catch (err) {
      throw new InternalServerErrorException('Cannot prepare upload directory');
    }

    // 3) ตั้งชื่อไฟล์
    const safeOriginal = file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}-${safeOriginal}`;
    const filepath = path.join(dir, filename); // ✅ ตรงนี้คือ path "ไฟล์"

    // 4) เขียนไฟล์ลงเครื่อง
    try {
      await fsp.writeFile(filepath, file.buffer);
    } catch (err: any) {
      throw new InternalServerErrorException(`Failed to save file: ${err.message}`);
    }

    // 5) public URL ให้ frontend ใช้ (mapping กับ static serve)
    // สมมติ main.ts ทำ app.use('/upload', express.static(<project>/upload))
    const publicLink = `/upload/${subdir}/${filename}`.replace(/\\/g, '/');

    // 6) เซฟลง DB
    const media = await this.mediaRepository.create({
      provider: 'local',
      externalId: filename,
      mimeType: file.mimetype,
      link: publicLink,
      createdBy: userId,
    });

    return {
      id: media.id,
      // link: media.link,
    };
  }

  private resolveFolderFromPurpose(purpose: MediaPurpose): string {
    switch (purpose) {
      case MediaPurpose.NISIT_CARD:
        return 'nisit';
      case MediaPurpose.STORE_BOOTH_LAYOUT:
        return 'store/layout';
      case MediaPurpose.STORE_GOODS:
        return 'store/goods';
      default:
        throw new BadRequestException('Unknown media purpose');
    }
  }
}
