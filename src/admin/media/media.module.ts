import { Module } from '@nestjs/common';
import { AdminMediaController } from './media.controller';
import { AdminMediaService } from './media.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    controllers: [AdminMediaController],
    providers: [AdminMediaService, PrismaService],
})
export class AdminMediaModule { }
