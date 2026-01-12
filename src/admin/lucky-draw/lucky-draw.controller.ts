import { Body, Controller, Get, Post, Patch, HttpException, HttpStatus, Query } from '@nestjs/common';
import { LuckyDrawService } from './lucky-draw.service';
import { CreateLuckyDrawDto } from './dto/create-lucky-draw.dto';
import { GenerateWheelDto } from './dto/generate-wheel.dto';
import { GetActiveEntriesDto } from './dto/get-active-entries.dto';
import { BoothService } from '../booth/booth.service';

@Controller('api/admin/lucky-draw')
export class LuckyDrawController {
    constructor(
        private readonly luckyDrawService: LuckyDrawService,
        private readonly boothService: BoothService,
    ) { }

    @Post('winner')
    async create(@Body() createLuckyDrawDto: CreateLuckyDrawDto) {
        // ทำเครื่องหมายว่าร้านนี้ถูกสุ่มไปแล้ว และดึง storeId
        const { storeId, luckyDrawEntryId } = await this.luckyDrawService.markAsDrawn(createLuckyDrawDto.winner);

        // ถ้าไม่ได้ storeId แสดงว่า format ไม่ถูกต้อง
        if (!storeId) {
            throw new HttpException(
                'รูปแบบชื่อผู้ชนะไม่ถูกต้อง (ต้องเป็น "ID. ชื่อร้าน")',
                HttpStatus.BAD_REQUEST
            );
        }

        // บันทึก winner ก่อน (เก็บไว้ก่อนแม้ assign ไม่สำเร็จ)
        const winner = await this.luckyDrawService.create(createLuckyDrawDto);

        // พยายาม assign booth
        let boothAssignment: any = null;
        let assignmentError: string | null = null;

        try {
            boothAssignment = await this.boothService.createAssignment({
                storeId,
                luckyDrawEntryId: luckyDrawEntryId ?? undefined,
            });
        } catch (error: any) {
            // เก็บ error message แต่ไม่ throw
            assignmentError = error.message || 'ไม่สามารถ assign booth ได้';
            console.warn(`Winner saved but booth assignment failed: ${assignmentError}`);
        }

        return {
            ...winner,
            boothAssignment,
            assignmentError, // ส่ง error กลับไปให้ frontend รู้
            message: assignmentError
                ? `บันทึกผู้ชนะเรียบร้อย แต่ยังไม่สามารถ assign booth ได้: ${assignmentError}`
                : 'บันทึกผู้ชนะและ assign booth เรียบร้อย'
        };
    }

    @Get('winners')
    findAll() {
        return this.luckyDrawService.findAll();
    }

    /* สร้าง entries สำหรับวงล้อ */
    @Post('generate-wheel')
    generateWheel(@Body() generateWheelDto: GenerateWheelDto) {
        return this.luckyDrawService.generateWheel(generateWheelDto);
    }

    @Get('active-entries')
    getActiveEntries(@Query() query: GetActiveEntriesDto) {
        return this.luckyDrawService.getActiveEntries(query.type);
    }

    @Post('reset')
    resetWheel() {
        return this.luckyDrawService.resetWheel();
    }

    @Get('entries')
    getAllEntries() {
        return this.luckyDrawService.getAllEntries();
    }

    /**
     * ตรวจสอบว่ามี booth ว่างหรือไม่
     * GET /api/admin/lucky-draw/check-booth-availability
     */
    @Get('check-booth-availability')
    async checkBoothAvailability() {
        return this.luckyDrawService.checkBoothAvailability();
    }
}

