import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLuckyDrawDto } from './dto/create-lucky-draw.dto';
import { GenerateWheelDto, GenerateWheelResponseDto } from './dto/generate-wheel.dto';

@Injectable()
export class LuckyDrawService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async create(createLuckyDrawDto: CreateLuckyDrawDto) {
        return this.prisma.luckyDraw.create({
            data: {
                winner: createLuckyDrawDto.winner,
            },
        });
    }

    async findAll() {
        return this.prisma.luckyDraw.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * สร้าง/อัพเดท wheel entries จาก stores ใน database
     * ใช้สำหรับโหลดรายชื่อร้านเข้าวงล้อ
     */
    async generateWheel(generateWheelDto: GenerateWheelDto): Promise<GenerateWheelResponseDto> {
        // Step 1: Query stores from database
        const stores = await this.prisma.store.findMany({
            where: generateWheelDto.state ? {
                state: generateWheelDto.state
            } : undefined,
            select: {
                id: true,
                storeName: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        if (stores.length === 0) {
            throw new HttpException(
                'ไม่พบร้านค้าที่ตรงตามเงื่อนไข',
                HttpStatus.NOT_FOUND
            );
        }

        // Step 2: Clear existing entries and create new ones
        await this.prisma.luckyDrawEntry.deleteMany({});

        await this.prisma.luckyDrawEntry.createMany({
            data: stores.map(store => ({
                storeId: store.id,
                storeName: store.storeName,
            })),
        });

        // Step 3: Return entries for frontend
        const entries = stores.map(store => `${store.id}. ${store.storeName}`);

        return {
            wheelPath: '', // ไม่ใช้ API แล้ว ส่งค่าว่างไป
            totalStores: stores.length,
            entries: entries, // ส่ง entries กลับไปให้ frontend
        };
    }

    /**
     * ดึง entries ทั้งหมดที่ยังไม่ถูกสุ่ม
     * ใช้สำหรับกรณี refresh หน้า
     */
    async getActiveEntries() {
        const entries = await this.prisma.luckyDrawEntry.findMany({
            where: {
                isDrawn: false,
            },
            orderBy: {
                storeId: 'asc',
            },
        });

        return entries.map(entry => `${entry.storeId}. ${entry.storeName}`);
    }

    /**
     * ทำเครื่องหมายว่าร้านนี้ถูกสุ่มไปแล้ว
     * เรียกเมื่อมีผู้ชนะ
     * @returns storeId และ luckyDrawEntryId สำหรับสร้าง booth assignment
     */
    async markAsDrawn(winnerText: string): Promise<{ storeId: number | null; luckyDrawEntryId: number | null }> {
        // Extract store ID from winner text (format: "123. Store Name")
        const match = winnerText.match(/^(\d+)\./);
        if (!match) {
            return { storeId: null, luckyDrawEntryId: null }; // ถ้า format ไม่ตรง ข้าม
        }

        const storeId = parseInt(match[1]);

        // หา entry ที่ตรงกัน
        const entry = await this.prisma.luckyDrawEntry.findFirst({
            where: {
                storeId: storeId,
                isDrawn: false,
            },
        });

        if (!entry) {
            return { storeId, luckyDrawEntryId: null };
        }

        // อัพเดท entry
        await this.prisma.luckyDrawEntry.update({
            where: { id: entry.id },
            data: {
                isDrawn: true,
                drawnAt: new Date(),
            },
        });

        return { storeId, luckyDrawEntryId: entry.id };
    }

    /**
     * Reset ทุกอย่าง เริ่มต้นใหม่
     */
    async resetWheel() {
        await this.prisma.luckyDrawEntry.deleteMany({});
        return { message: 'Wheel reset successfully' };
    }

    /**
     * ดึงข้อมูล entries ทั้งหมด (ทั้งที่ถูกสุ่มและยังไม่ถูกสุ่ม)
     * ใช้สำหรับแสดงรายการผู้มีสิทธิ์จับฉลาก
     */
    async getAllEntries() {
        return this.prisma.luckyDrawEntry.findMany({
            orderBy: [
                { isDrawn: 'asc' },  // ยังไม่ถูกสุ่มก่อน
                { storeId: 'asc' },
            ],
        });
    }
}
