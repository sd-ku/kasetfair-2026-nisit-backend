import { Body, Controller, Get, Post, Patch } from '@nestjs/common';
import { LuckyDrawService } from './lucky-draw.service';
import { CreateLuckyDrawDto } from './dto/create-lucky-draw.dto';
import { GenerateWheelDto } from './dto/generate-wheel.dto';
import { BoothService } from '../booth/booth.service';

@Controller('api/admin/lucky-draw')
export class LuckyDrawController {
    constructor(
        private readonly luckyDrawService: LuckyDrawService,
        private readonly boothService: BoothService,
    ) { }

    @Post('winner')
    async create(@Body() createLuckyDrawDto: CreateLuckyDrawDto) {
        const winner = await this.luckyDrawService.create(createLuckyDrawDto);

        // ทำเครื่องหมายว่าร้านนี้ถูกสุ่มไปแล้ว
        const { storeId, luckyDrawEntryId } = await this.luckyDrawService.markAsDrawn(createLuckyDrawDto.winner);

        // สร้าง booth assignment ถ้าได้ storeId
        let boothAssignment: any = null;
        if (storeId) {
            try {
                boothAssignment = await this.boothService.createAssignment({
                    storeId,
                    luckyDrawEntryId: luckyDrawEntryId ?? undefined,
                });
            } catch (error) {
                // Log error แต่ไม่ throw - เพื่อให้บันทึกผู้ชนะได้แม้ assign booth ไม่สำเร็จ
                console.error('Failed to create booth assignment:', error);
            }
        }

        return {
            ...winner,
            boothAssignment,
        };
    }

    @Get('winners')
    findAll() {
        return this.luckyDrawService.findAll();
    }

    @Post('generate-wheel')
    generateWheel(@Body() generateWheelDto: GenerateWheelDto) {
        return this.luckyDrawService.generateWheel(generateWheelDto);
    }

    @Get('active-entries')
    getActiveEntries() {
        return this.luckyDrawService.getActiveEntries();
    }

    @Post('reset')
    resetWheel() {
        return this.luckyDrawService.resetWheel();
    }
}

