import { Module } from '@nestjs/common';
import { LuckyDrawService } from './lucky-draw.service';
import { LuckyDrawController } from './lucky-draw.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BoothModule } from '../booth/booth.module';

@Module({
    imports: [PrismaModule, BoothModule],
    controllers: [LuckyDrawController],
    providers: [LuckyDrawService],
})
export class LuckyDrawModule { }

