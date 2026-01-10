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
        // Query จาก LuckyDrawEntry ที่ isDrawn = true โดยตรง
        // ดีกว่าการ query จาก LuckyDraw แล้วค่อย loop หา entry (N+1 problem)
        const drawnEntries = await this.prisma.luckyDrawEntry.findMany({
            where: {
                isDrawn: true,
            },
            include: {
                boothAssignment: {
                    include: {
                        booth: true,
                    },
                },
            },
            orderBy: {
                drawnAt: 'desc',
            },
        });

        // Map เป็น format ที่ frontend คาดหวัง
        return drawnEntries.map(entry => ({
            id: entry.id,
            winner: `${entry.storeId}. ${entry.storeName}`,
            createdAt: entry.drawnAt || entry.createdAt,
            boothNumber: entry.boothAssignment?.booth?.boothNumber || null,
            status: entry.boothAssignment?.status || null,
        }));
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
        console.log(`[markAsDrawn] Processing winner: "${winnerText}"`);

        // Extract store ID from winner text (format: "123. Store Name")
        const match = winnerText.match(/^(\d+)\./);
        if (!match) {
            console.warn(`[markAsDrawn] Invalid format: "${winnerText}"`);
            return { storeId: null, luckyDrawEntryId: null }; // ถ้า format ไม่ตรง ข้าม
        }

        const storeId = parseInt(match[1]);
        console.log(`[markAsDrawn] Extracted storeId: ${storeId}`);

        // หา entry ที่ตรงกัน
        const entry = await this.prisma.luckyDrawEntry.findFirst({
            where: {
                storeId: storeId,
                isDrawn: false,
            },
        });

        if (!entry) {
            // ตรวจสอบว่ามี entry อยู่หรือไม่ (แต่อาจถูก drawn ไปแล้ว)
            const anyEntry = await this.prisma.luckyDrawEntry.findFirst({
                where: { storeId: storeId },
            });

            if (!anyEntry) {
                console.error(`[markAsDrawn] ❌ No LuckyDrawEntry found for storeId: ${storeId}`);
                console.error(`[markAsDrawn] Please run generateWheel() first to create entries`);
            } else if (anyEntry.isDrawn) {
                console.warn(`[markAsDrawn] ⚠️ Entry for storeId ${storeId} is already drawn at ${anyEntry.drawnAt}`);
            }

            return { storeId, luckyDrawEntryId: null };
        }

        console.log(`[markAsDrawn] Found entry ID: ${entry.id}, updating isDrawn to true`);

        // อัพเดท entry
        await this.prisma.luckyDrawEntry.update({
            where: { id: entry.id },
            data: {
                isDrawn: true,
                drawnAt: new Date(),
            },
        });

        console.log(`[markAsDrawn] ✅ Successfully marked entry ${entry.id} as drawn`);
        return { storeId, luckyDrawEntryId: entry.id };
    }

    /**
     * ยกเลิกการทำเครื่องหมายว่าร้านนี้ถูกสุ่ม (สำหรับ rollback)
     * ใช้เมื่อ assign booth ไม่สำเร็จ
     */
    async unmarkAsDrawn(luckyDrawEntryId: number): Promise<void> {
        await this.prisma.luckyDrawEntry.update({
            where: { id: luckyDrawEntryId },
            data: {
                isDrawn: false,
                drawnAt: null,
            },
        });
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

    /**
     * ตรวจสอบว่ามี booth ว่างหรือไม่ในแต่ละ zone
     * ใช้สำหรับตรวจสอบก่อนเริ่มหมุนวงล้อ
     */
    async checkBoothAvailability() {
        const foodBooths = await this.prisma.booth.count({
            where: {
                zone: 'FOOD',
                isAssigned: false,
            },
        });

        const nonFoodBooths = await this.prisma.booth.count({
            where: {
                zone: 'NON_FOOD',
                isAssigned: false,
            },
        });

        const undefinedBooths = await this.prisma.booth.count({
            where: {
                zone: 'UNDEFINED',
                isAssigned: false,
            },
        });

        const hasAvailableBooths = foodBooths > 0 || nonFoodBooths > 0 || undefinedBooths > 0;

        return {
            hasAvailableBooths,
            foodBooths,
            nonFoodBooths,
            undefinedBooths,
            message: hasAvailableBooths
                ? `มี booth ว่าง: FOOD ${foodBooths} ช่อง, NON_FOOD ${nonFoodBooths} ช่อง, UNDEFINED ${undefinedBooths} ช่อง`
                : 'ไม่มี booth ว่างเหลือแล้ว ไม่สามารถจับฉลากได้'
        };
    }
}
