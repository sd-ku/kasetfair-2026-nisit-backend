import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Media, MediaPurpose, MediaStatus } from '@prisma/client';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { MediaRepository } from './media.repository';
import type { MediaWithStoreAdmin } from './media.repository';
import {
  S3Client,
  ListObjectsV2Command,
  _Object as S3Object,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ACCEPT = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

// โฟลเดอร์หลักเก็บไฟล์บนเครื่อง: <project>/upload
const UPLOAD_ROOT = path.join(process.cwd(), 'upload'); // path จริงบนเครื่อง

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly mediaRepository: MediaRepository,
  ) {
    this.bucket = process.env.S3_BUCKET_NAME ?? '';
    if (!this.bucket) {
      throw new Error('S3_BUCKET_NAME is not configured');
    }

    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('S3_ACCESS_KEY or S3_SECRET_KEY is not configured');
    }

    this.s3 = new S3Client({
      region: process.env.S3_REGION ?? 'ap-southeast-1',
      endpoint: process.env.S3_ENDPOINT ?? 'https://s3.sa.ku.ac.th',
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  public async listMediaFromS3(params?: {
    prefix?: string;   // เช่น "upload/store/goods/"
    maxKeys?: number;
  }): Promise<
    Array<{
      key: string;
      size?: number;
      lastModified?: Date;
    }>
  > {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: params?.prefix,
      MaxKeys: params?.maxKeys ?? 1000,
    });

    const res = await this.s3.send(command);

    const objects: S3Object[] = res.Contents ?? [];

    // filter ให้เอาเฉพาะไฟล์รูป (ตามนามสกุล)
    const imageObjects = objects.filter((obj) =>
      obj.Key?.match(/\.(png|jpe?g|gif|webp|bmp)$/i),
    );

    return imageObjects.map((obj) => ({
      key: obj.Key!,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  }

  public async generatePresignedUrl(
    uploaderId: string | null,
    purpose: MediaPurpose,
    fileName?: string,
    contentType?: string,
  ) {
    // 1) หา storeId เฉพาะ purpose ที่ต้องการจริง ๆ
    let storeId: number | undefined = undefined

    const needsStore =
      purpose === MediaPurpose.STORE_LAYOUT ||
      purpose === MediaPurpose.STORE_GOODS
      // purpose === MediaPurpose.CLUB_APPLICATION

    if (needsStore) {
      if (!uploaderId) {
        throw new BadRequestException("uploaderId is required for store-related media")
      }

      storeId = await this.mediaRepository.findStoreIdByNisitId(uploaderId)

      if (!storeId) {
        throw new BadRequestException("No store found for this uploader")
      }
    }

    // 2) resolve folder
    const folder = this.resolveFolderFromPurpose(purpose, {
      uploaderId: uploaderId ?? undefined,
      storeId,
    })

    // 3) สร้าง key
    const uuid = crypto.randomUUID()
    const ext = fileName?.includes(".") ? fileName.split(".").pop() : undefined
    const key = ext ? `${folder}/${uuid}.${ext}` : `${folder}/${uuid}`

    // 4) create media record
    const media = await this.mediaRepository.create({
      id: uuid,
      provider: "s3",
      bucket: this.bucket,
      key,
      originalName: fileName ?? null,
      mimeType: contentType ?? "application/octet-stream",
      purpose,
      status: MediaStatus.UPLOADING,
      createdBy: uploaderId ?? undefined,
    })

    // 5) presigned URL
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType ?? "application/octet-stream",
    })

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 300, // 5 minutes
    })

    return {
      mediaId: media.id,
      uploadUrl,
      key,
    }
  }

  async getPresignedGetUrl(key: string) {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, cmd, { expiresIn: 60 * 10 }); // 10 นาที
  }

  public async confirmS3Upload(
    uploaderId: string | null,
    params: { mediaId: string; size?: number },
  ) {
    const { mediaId, size } = params

    const media = await this.mediaRepository.findById(mediaId)
    if (!media) {
      throw new NotFoundException('Media not found')
    }

    // กัน confirm มั่ว
    if (media.status === MediaStatus.DELETE) {
      throw new BadRequestException('Media is marked for deletion')
    }

    if (media.status === MediaStatus.FAILED) {
      throw new BadRequestException('Media upload has failed')
    }

    // idempotent: ถ้าเคย UPLOADED แล้วก็คืนเดิมไปเลย
    if (media.status === MediaStatus.UPLOADED) {
      return media
    }

    if (media.status !== MediaStatus.UPLOADING) {
      throw new BadRequestException('Media is not in UPLOADING state')
    }

    // ถ้าอยากกันเคสคนอื่นมา confirm ไฟล์เรา:
    // - ทำเฉพาะตอนที่มี uploaderId (เช่นหลังสมัคร / เคสที่มี identity ชัด)
    // - ถ้าเป็นเคส register ที่เราไม่อยาก strict ก็ปล่อยได้ (uploaderId = null)
    if (uploaderId && media.createdBy && media.createdBy !== uploaderId) {
      throw new ForbiddenException('You are not the owner of this media')
    }

    const updateData = {
      status: MediaStatus.UPLOADED,
      size: size ?? media.size,
      link: `${process.env.S3_ENDPOINT}/${this.bucket}/${media.key}`,
      createdBy: uploaderId ?? media.createdBy,
    }

    const updated = await this.mediaRepository.update(mediaId, updateData)

    return updated
  }

  private async checkPrivilegeToDeleteMedia(media: MediaWithStoreAdmin, actorId: string) {
    // ตัวอย่างการเช็คสิทธิ์ลบ media ตาม purpose
    // ในที่นี้สมมติว่าเฉพาะ uploader เท่านั้นที่ลบได้
    // ถ้ามี requirement อื่น ๆ ก็เพิ่มเงื่อนไขตรงนี้
    switch (media.purpose) {
      case MediaPurpose.NISIT_CARD: {
        if (media.createdBy !== actorId) {
          throw new ForbiddenException('You do not have permission to delete this media');
        }
        break;
      }
      case MediaPurpose.STORE_LAYOUT: {
        const store = media.storeBooth;
        if (!store || store.storeAdminNisitId !== actorId) {
          throw new ForbiddenException('You do not have permission to delete this media');
        }
        break;
      }
      case MediaPurpose.STORE_GOODS: {
        const storeIdFromGood = media.good?.storeId;

        const actorStoreId = await this.mediaRepository.findStoreIdByNisitId(actorId);
        const isMember = !!actorStoreId && actorStoreId === storeIdFromGood;
        const isAdmin = media.storeBooth?.storeAdminNisitId === actorId;

        if (!isMember && !isAdmin) {
          throw new ForbiddenException('You do not have permission to delete this media');
        }
        break;
      }
      case MediaPurpose.CLUB_APPLICATION: {
        if (media.storeBooth?.storeAdminNisitId !== actorId) {
          throw new ForbiddenException('You do not have permission to delete this media');
        }
        break;
      }
      default:
        break;
    }
  }

  private async checkPrivilegeToAccessMedia(media: MediaWithStoreAdmin, actorId: string) {
    // ตัวอย่างการเช็คสิทธิ์เข้าถึง media ตาม purpose
    // ในที่นี้สมมติว่าเฉพาะ uploader เท่านั้นที่เข้าถึงได้
    switch (media.purpose) {
      case MediaPurpose.NISIT_CARD: {
        if (!media.createdBy) {
          await this.mediaRepository.update(media.id, {
            createdBy: actorId
          });
        } else {
          if (media.createdBy !== actorId) {
            throw new ForbiddenException('You do not have permission to access this media');
          }
        }
        break;
      }
      case MediaPurpose.STORE_LAYOUT: {
        const storeId = media.storeBooth?.id;

        const actorStoreId = await this.mediaRepository.findStoreIdByNisitId(actorId);
        const isMember = !!actorStoreId && actorStoreId === storeId;

        if (!isMember) {
          throw new ForbiddenException('You do not have permission to delete this media');
        }
        break;
      }
      case MediaPurpose.STORE_GOODS: {
        const storeIdFromGood = media.good?.storeId;
        const actorStoreId = await this.mediaRepository.findStoreIdByNisitId(actorId);
        const isMember = !!actorStoreId && actorStoreId === storeIdFromGood;
        if (!isMember) {
          throw new ForbiddenException('You do not have permission to access this media');
        }
        break;
      }
      case MediaPurpose.CLUB_APPLICATION: {
        const storeId = media.storeBooth?.id;
        const actorStoreId = await this.mediaRepository.findStoreIdByNisitId(actorId);
        const isMember = !!actorStoreId && actorStoreId === storeId;
        if (!isMember) {
          throw new ForbiddenException('You do not have permission to access this media');
        }
        break;
      }
      default:
        break;
    }
  }

  async deleteMedia(params: { mediaId: string; actorId: string }) {
    const { mediaId, actorId } = params;

    if (!actorId) {
      throw new BadRequestException('actorId is required to delete media');
    }

    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // await this.checkPrivilegeToDeleteMedia(media, actorId);

    if (media.status === MediaStatus.DELETE) {
      // media ถูกลบไปแล้ว
      return media;
    }

    // ลบไฟล์ออกจาก S3 จริง ๆ
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: media.key!,
      }),
    );

    // mark เป็น deleted ไว้เป็นประวัติ
    return this.mediaRepository.update(mediaId, {
      status: MediaStatus.DELETE,
    });
  }

  async getMediaInfo(params: { mediaId: string; actorId: string }) {
    const { mediaId, actorId } = params;

    if (!actorId) {
      throw new BadRequestException('actorId is required to access media');
    }

    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    if (!media.key) {
      throw new InternalServerErrorException('Media key is missing');
    }

    await this.checkPrivilegeToAccessMedia(media, actorId);
    if (media.status === MediaStatus.DELETE) {
      throw new NotFoundException('Media not found');
    }

    return {
      id: media?.id,
      size: media?.size,
      mimeType: media?.mimeType,
      originalName: media?.originalName,
      link: await this.getPresignedGetUrl(media.key),
    };
  }

  private resolveFolderFromPurpose(
    purpose: MediaPurpose,
    params: {
      uploaderId?: string;
      storeId?: number;
  } = {},
  ): string {
    const { uploaderId, storeId } = params

    switch (purpose) {
      case MediaPurpose.NISIT_CARD: {
        return `nisit`
      }

      case MediaPurpose.CLUB_APPLICATION: {
        // if (!storeId) {
        //   throw new BadRequestException('storeId is required for CLUB_APPLICATION media')
        // }
        return `store/club-app`
      }

      case MediaPurpose.STORE_LAYOUT: {
        if (!storeId) {
          throw new BadRequestException('storeId is required for STORE_LAYOUT media')
        }
        return `store/${storeId}/layout`
      }

      case MediaPurpose.STORE_GOODS: {
        if (!storeId) {
          throw new BadRequestException('storeId is required for STORE_GOODS media')
        }
        return `store/${storeId}/goods`
      }

      default:
        throw new BadRequestException('Unknown media purpose')
    }
  }
}
