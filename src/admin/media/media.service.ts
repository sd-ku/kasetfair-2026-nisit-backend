import {
    Injectable,
    NotFoundException,
    InternalServerErrorException,
} from '@nestjs/common';
import { MediaStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
    GetObjectCommand,
    _Object as S3Object
} from '@aws-sdk/client-s3';

@Injectable()
export class AdminMediaService {
    private readonly s3: S3Client;
    private readonly bucket: string;

    constructor(private readonly prisma: PrismaService) {
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
            region: 'sa',
            endpoint: process.env.S3_ENDPOINT ?? 'https://s3.sa.ku.ac.th',
            forcePathStyle: true,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    /**
     * Get media info for admin - bypasses privilege checks
     */
    async getMediaInfo(mediaId: string) {
        const media = await this.prisma.media.findUnique({
            where: { id: mediaId },
        });

        if (!media) {
            throw new NotFoundException('Media not found');
        }
        if (!media.key) {
            throw new InternalServerErrorException('Media key is missing');
        }

        // Admin can see deleted media too, but we'll mark it
        const isDeleted = media.status === MediaStatus.DELETE;

        return {
            id: media.id,
            provider: media.provider,
            bucket: media.bucket,
            key: media.key,
            externalId: media.externalId,
            size: media.size,
            mimeType: media.mimeType,
            originalName: media.originalName,
            purpose: media.purpose,
            status: media.status,
            createdBy: media.createdBy,
            createdAt: media.createdAt,
            isDeleted,
            link: await this.getPresignedGetUrl(media.key),
        };
    }

    /**
     * List all media from S3
     */
    async listMediaFromS3(params?: {
        prefix?: string;
        maxKeys?: number;
    }) {
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: params?.prefix,
                MaxKeys: params?.maxKeys ?? 1000,
            });

            const res = await this.s3.send(command);

            const objects: S3Object[] = res.Contents ?? [];

            const imageObjects = objects.filter((obj) =>
                obj.Key?.match(/\.(png|jpe?g|gif|webp|bmp)$/i),
            );

            return imageObjects.map((obj) => ({
                key: obj.Key!,
                size: obj.Size,
                lastModified: obj.LastModified,
            }));
        } catch (err) {
            console.error('S3 list error >>>', err);
            throw err; // หรือโยน BadRequestException ใหม่ก็ได้
        }
    }

    /**
     * Generate presigned GET URL for accessing media
     */
    private async getPresignedGetUrl(key: string): Promise<string> {
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        return getSignedUrl(this.s3, command, { expiresIn: 3600 });
    }
}
