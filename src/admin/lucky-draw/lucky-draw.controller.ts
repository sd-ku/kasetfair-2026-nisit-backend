import { Body, Controller, Get, Post, Patch } from '@nestjs/common';
import { LuckyDrawService } from './lucky-draw.service';
import { CreateLuckyDrawDto } from './dto/create-lucky-draw.dto';
import { GenerateWheelDto } from './dto/generate-wheel.dto';

@Controller('api/admin/lucky-draw')
export class LuckyDrawController {
    constructor(private readonly luckyDrawService: LuckyDrawService) { }

    @Post('winner')
    async create(@Body() createLuckyDrawDto: CreateLuckyDrawDto) {
        const winner = await this.luckyDrawService.create(createLuckyDrawDto);
        // ทำเครื่องหมายว่าร้านนี้ถูกสุ่มไปแล้ว
        await this.luckyDrawService.markAsDrawn(createLuckyDrawDto.winner);
        return winner;
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
