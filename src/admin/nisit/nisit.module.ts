import { Module } from '@nestjs/common';
import { NisitController } from './nisit.controller';
import { NisitService } from './nisit.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [NisitController],
    providers: [NisitService],
    exports: [NisitService],
})
export class AdminNisitModule { }
