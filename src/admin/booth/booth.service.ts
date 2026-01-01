import { Injectable, HttpException, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BoothZone, BoothAssignmentStatus, GoodsType } from '@prisma/client';
import {
    ImportBoothRangeDto,
    ImportBoothListDto,
    CreateBoothAssignmentDto,
    VerifyBoothAssignmentDto,
    VerifyByStoreIdDto,
    ForfeitBoothAssignmentDto,
    BoothStatsDto,
    NextBoothInfoDto,
} from './dto/booth.dto';

@Injectable()
export class BoothService {
    constructor(private readonly prisma: PrismaService) { }

    // ----- Utility Functions -----

    /**
     * แปลง BoothZone เป็น GoodsType
     */
    private zoneToGoodsType(zone: BoothZone): GoodsType {
        return zone === BoothZone.FOOD ? GoodsType.Food : GoodsType.NonFood;
    }

    /**
     * แปลง GoodsType เป็น BoothZone
     */
    private goodsTypeToZone(goodsType: GoodsType): BoothZone {
        return goodsType === GoodsType.Food ? BoothZone.FOOD : BoothZone.NON_FOOD;
    }

    /**
     * ดึง nisitId จาก barcode (format: XXX<nisitId>X)
     * ตัด 3 ตัวหน้า และ 1 ตัวท้าย
     */
    private extractNisitId(barcode: string): string {
        if (barcode.length < 5) {
            throw new BadRequestException('Barcode ไม่ถูกต้อง: ความยาวต้องอย่างน้อย 5 ตัวอักษร');
        }
        return barcode.slice(3, -1);
    }

    // ----- Booth Management -----

    /**
     * Import booth แบบ range เช่น M1-M20
     */
    async importBoothRange(dto: ImportBoothRangeDto) {
        const boothsToCreate: { boothNumber: string; zone: BoothZone; assignOrder: number }[] = [];

        // ดึงลำดับสุดท้ายของแต่ละ zone
        const maxOrders = await this.prisma.booth.groupBy({
            by: ['zone'],
            _max: { assignOrder: true },
        });

        const currentMaxOrder: Record<BoothZone, number> = {
            [BoothZone.FOOD]: 0,
            [BoothZone.NON_FOOD]: 0,
        };

        for (const order of maxOrders) {
            currentMaxOrder[order.zone] = order._max.assignOrder || 0;
        }

        for (const range of dto.ranges) {
            const { prefix, start, end, zone } = range;

            if (start > end) {
                throw new BadRequestException(`Invalid range: ${start} > ${end}`);
            }

            for (let i = start; i <= end; i++) {
                const boothNumber = `${prefix}${i}`;
                currentMaxOrder[zone]++;

                boothsToCreate.push({
                    boothNumber,
                    zone,
                    assignOrder: currentMaxOrder[zone],
                });
            }
        }

        // ใช้ skipDuplicates เพื่อไม่ error ถ้ามี booth ซ้ำ
        const result = await this.prisma.booth.createMany({
            data: boothsToCreate,
            skipDuplicates: true,
        });

        return {
            message: `สร้าง booth สำเร็จ ${result.count} รายการ`,
            created: result.count,
            attempted: boothsToCreate.length,
        };
    }

    /**
     * Import booth แบบ list เช่น ["M55", "M60", "M65"]
     */
    async importBoothList(dto: ImportBoothListDto) {
        const boothsToCreate: { boothNumber: string; zone: BoothZone; assignOrder: number }[] = [];

        // ดึงลำดับสุดท้ายของแต่ละ zone
        const maxOrders = await this.prisma.booth.groupBy({
            by: ['zone'],
            _max: { assignOrder: true },
        });

        const currentMaxOrder: Record<BoothZone, number> = {
            [BoothZone.FOOD]: 0,
            [BoothZone.NON_FOOD]: 0,
        };

        for (const order of maxOrders) {
            currentMaxOrder[order.zone] = order._max.assignOrder || 0;
        }

        for (const list of dto.lists) {
            const { boothNumbers, zone } = list;

            for (const boothNumber of boothNumbers) {
                currentMaxOrder[zone]++;

                boothsToCreate.push({
                    boothNumber: boothNumber.trim(),
                    zone,
                    assignOrder: currentMaxOrder[zone],
                });
            }
        }

        const result = await this.prisma.booth.createMany({
            data: boothsToCreate,
            skipDuplicates: true,
        });

        return {
            message: `สร้าง booth สำเร็จ ${result.count} รายการ`,
            created: result.count,
            attempted: boothsToCreate.length,
        };
    }

    /**
     * ดึง booth ทั้งหมด
     */
    async findAllBooths(zone?: BoothZone, isAssigned?: boolean) {
        return this.prisma.booth.findMany({
            where: {
                ...(zone && { zone }),
                ...(isAssigned !== undefined && { isAssigned }),
            },
            include: {
                assignment: {
                    include: {
                        store: {
                            select: {
                                id: true,
                                storeName: true,
                                storeAdminNisitId: true,
                            },
                        },
                    },
                },
            },
            orderBy: { assignOrder: 'asc' },
        });
    }

    /**
     * ลบ booth
     */
    async deleteBooth(id: number) {
        const booth = await this.prisma.booth.findUnique({
            where: { id },
            include: { assignment: true },
        });

        if (!booth) {
            throw new NotFoundException('ไม่พบ booth');
        }

        if (booth.assignment) {
            throw new BadRequestException('ไม่สามารถลบ booth ที่มีการ assign แล้วได้');
        }

        return this.prisma.booth.delete({ where: { id } });
    }

    /**
     * ลบ booth ทั้งหมด (สำหรับ reset)
     */
    async deleteAllBooths() {
        // ลบ assignments ก่อน
        await this.prisma.boothAssignment.deleteMany({});
        // ลบ booths
        const result = await this.prisma.booth.deleteMany({});

        return {
            message: `ลบ booth สำเร็จ ${result.count} รายการ`,
            deleted: result.count,
        };
    }

    // ----- Assignment Management -----

    /**
     * ดึง booth ว่างถัดไปตาม zone
     */
    async getNextAvailableBooth(zone: BoothZone): Promise<NextBoothInfoDto> {
        const nextBooth = await this.prisma.booth.findFirst({
            where: {
                zone,
                isAssigned: false,
            },
            orderBy: { assignOrder: 'asc' },
        });

        const currentDrawOrder = await this.prisma.boothAssignment.count({
            where: {
                booth: { zone },
            },
        });

        return {
            zone,
            nextBooth: nextBooth || null,
            currentDrawOrder,
        };
    }

    /**
     * สร้าง assignment ใหม่ (status: PENDING)
     * เรียกเมื่อสุ่มวงล้อได้ผลลัพธ์
     */
    async createAssignment(dto: CreateBoothAssignmentDto) {
        // ดึงข้อมูลร้าน
        const store = await this.prisma.store.findUnique({
            where: { id: dto.storeId },
            select: {
                id: true,
                storeName: true,
                goodType: true,
                boothNumber: true,
            },
        });

        if (!store) {
            throw new NotFoundException('ไม่พบร้าน');
        }

        if (store.boothNumber) {
            throw new BadRequestException('ร้านนี้มี booth แล้ว');
        }

        if (!store.goodType) {
            throw new BadRequestException('ร้านนี้ยังไม่ได้ระบุประเภทสินค้า (Food/NonFood)');
        }

        const zone = this.goodsTypeToZone(store.goodType);

        // ดึง booth ว่างถัดไป
        const nextBooth = await this.prisma.booth.findFirst({
            where: {
                zone,
                isAssigned: false,
            },
            orderBy: { assignOrder: 'asc' },
        });

        if (!nextBooth) {
            throw new BadRequestException(`ไม่มี booth ว่างในโซน ${zone}`);
        }

        // ดึงลำดับ draw ถัดไป
        const maxDrawOrder = await this.prisma.boothAssignment.aggregate({
            where: { booth: { zone } },
            _max: { drawOrder: true },
        });

        const drawOrder = (maxDrawOrder._max.drawOrder || 0) + 1;

        // Transaction: สร้าง assignment และ mark booth as assigned
        const assignment = await this.prisma.$transaction(async (tx) => {
            // สร้าง assignment
            const newAssignment = await tx.boothAssignment.create({
                data: {
                    boothId: nextBooth.id,
                    storeId: store.id,
                    luckyDrawEntryId: dto.luckyDrawEntryId,
                    drawOrder,
                    status: BoothAssignmentStatus.PENDING,
                },
                include: {
                    booth: true,
                    store: {
                        select: {
                            id: true,
                            storeName: true,
                            storeAdminNisitId: true,
                        },
                    },
                },
            });

            // Mark booth as assigned
            await tx.booth.update({
                where: { id: nextBooth.id },
                data: { isAssigned: true },
            });

            return newAssignment;
        });

        return assignment;
    }

    /**
     * ยืนยัน assignment ด้วย barcode
     * ตรวจ nisitId กับ storeAdmin และ members
     */
    async verifyAssignment(dto: VerifyBoothAssignmentDto) {
        const nisitId = this.extractNisitId(dto.barcode);

        const assignment = await this.prisma.boothAssignment.findUnique({
            where: { id: dto.assignmentId },
            include: {
                booth: true,
                store: {
                    include: {
                        storeAdmin: true,
                        members: true,
                    },
                },
            },
        });

        if (!assignment) {
            throw new NotFoundException('ไม่พบ assignment');
        }

        if (assignment.status === BoothAssignmentStatus.CONFIRMED) {
            throw new BadRequestException('Assignment นี้ยืนยันแล้ว');
        }

        if (assignment.status === BoothAssignmentStatus.FORFEITED) {
            throw new BadRequestException('Assignment นี้ถูกสละสิทธิ์แล้ว');
        }

        // ตรวจ nisitId กับ storeAdmin และ members
        const isStoreAdmin = assignment.store.storeAdminNisitId === nisitId;
        const isMember = assignment.store.members.some(m => m.nisitId === nisitId);

        if (!isStoreAdmin && !isMember) {
            throw new BadRequestException(
                `nisitId ${nisitId} ไม่ใช่เจ้าของหรือสมาชิกของร้าน "${assignment.store.storeName}"`
            );
        }

        // Transaction: ยืนยัน assignment และอัพเดท Store.boothNumber
        const result = await this.prisma.$transaction(async (tx) => {
            // อัพเดท assignment
            const updatedAssignment = await tx.boothAssignment.update({
                where: { id: dto.assignmentId },
                data: {
                    status: BoothAssignmentStatus.CONFIRMED,
                    verifiedByNisitId: nisitId,
                    verifiedAt: new Date(),
                },
                include: {
                    booth: true,
                    store: {
                        select: {
                            id: true,
                            storeName: true,
                        },
                    },
                },
            });

            // อัพเดท Store.boothNumber
            await tx.store.update({
                where: { id: assignment.storeId },
                data: { boothNumber: assignment.booth.boothNumber },
            });

            return updatedAssignment;
        });

        return {
            ...result,
            verifiedBy: isStoreAdmin ? 'storeAdmin' : 'member',
        };
    }

    /**
     * ยืนยัน assignment ด้วย barcode โดยระบุ storeId
     * ใช้สำหรับกรณีที่ไม่ได้ระบุ assignmentId
     */
    async verifyByStoreId(dto: VerifyByStoreIdDto) {
        const assignment = await this.prisma.boothAssignment.findFirst({
            where: {
                storeId: dto.storeId,
                status: BoothAssignmentStatus.PENDING,
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!assignment) {
            throw new NotFoundException('ไม่พบ assignment ที่รอยืนยันสำหรับร้านนี้');
        }

        return this.verifyAssignment({
            barcode: dto.barcode,
            assignmentId: assignment.id,
        });
    }

    /**
     * สละสิทธิ์ assignment
     * Booth จะถูกปล่อยให้ว่างและพร้อมให้สุ่มใหม่
     */
    async forfeitAssignment(dto: ForfeitBoothAssignmentDto) {
        const assignment = await this.prisma.boothAssignment.findUnique({
            where: { id: dto.assignmentId },
            include: { booth: true },
        });

        if (!assignment) {
            throw new NotFoundException('ไม่พบ assignment');
        }

        if (assignment.status === BoothAssignmentStatus.CONFIRMED) {
            throw new BadRequestException('ไม่สามารถสละสิทธิ์ assignment ที่ยืนยันแล้ว');
        }

        // Transaction: สละสิทธิ์ และปล่อย booth
        const result = await this.prisma.$transaction(async (tx) => {
            // อัพเดท assignment status
            const updatedAssignment = await tx.boothAssignment.update({
                where: { id: dto.assignmentId },
                data: {
                    status: BoothAssignmentStatus.FORFEITED,
                    forfeitedAt: new Date(),
                    forfeitReason: dto.reason,
                },
                include: {
                    booth: true,
                    store: {
                        select: {
                            id: true,
                            storeName: true,
                        },
                    },
                },
            });

            // ปล่อย booth ให้ว่าง
            await tx.booth.update({
                where: { id: assignment.boothId },
                data: { isAssigned: false },
            });

            return updatedAssignment;
        });

        return result;
    }

    /**
     * สุ่มใหม่: ดึงร้านที่ยังไม่มี booth และ assign ไปยัง booth ว่างตามลำดับ
     */
    async reDrawForStore(storeId: number) {
        // ตรวจสอบว่าร้านนี้มี booth แล้วหรือยัง
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: {
                id: true,
                storeName: true,
                goodType: true,
                boothNumber: true,
            },
        });

        if (!store) {
            throw new NotFoundException('ไม่พบร้าน');
        }

        if (store.boothNumber) {
            throw new BadRequestException('ร้านนี้มี booth แล้ว');
        }

        // สร้าง assignment ใหม่
        return this.createAssignment({ storeId });
    }

    // ----- Statistics -----

    /**
     * ดึงสถิติ booth ทั้งหมด
     */
    async getStats(): Promise<BoothStatsDto[]> {
        const zones = [BoothZone.FOOD, BoothZone.NON_FOOD];
        const stats: BoothStatsDto[] = [];

        for (const zone of zones) {
            const total = await this.prisma.booth.count({ where: { zone } });
            const assigned = await this.prisma.booth.count({ where: { zone, isAssigned: true } });
            const available = total - assigned;

            const pending = await this.prisma.boothAssignment.count({
                where: {
                    booth: { zone },
                    status: BoothAssignmentStatus.PENDING,
                },
            });

            const confirmed = await this.prisma.boothAssignment.count({
                where: {
                    booth: { zone },
                    status: BoothAssignmentStatus.CONFIRMED,
                },
            });

            const forfeited = await this.prisma.boothAssignment.count({
                where: {
                    booth: { zone },
                    status: BoothAssignmentStatus.FORFEITED,
                },
            });

            stats.push({
                zone,
                total,
                assigned,
                pending,
                confirmed,
                forfeited,
                available,
            });
        }

        return stats;
    }

    /**
     * ดึง assignments ทั้งหมด
     */
    async findAllAssignments(zone?: BoothZone, status?: BoothAssignmentStatus) {
        return this.prisma.boothAssignment.findMany({
            where: {
                ...(zone && { booth: { zone } }),
                ...(status && { status }),
            },
            include: {
                booth: true,
                store: {
                    select: {
                        id: true,
                        storeName: true,
                        storeAdminNisitId: true,
                        goodType: true,
                    },
                },
                luckyDrawEntry: true,
            },
            orderBy: { drawOrder: 'asc' },
        });
    }

    /**
     * ดึง assignment ตาม ID
     */
    async findAssignmentById(id: number) {
        const assignment = await this.prisma.boothAssignment.findUnique({
            where: { id },
            include: {
                booth: true,
                store: {
                    include: {
                        storeAdmin: {
                            select: {
                                nisitId: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                        members: {
                            select: {
                                nisitId: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                luckyDrawEntry: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException('ไม่พบ assignment');
        }

        return assignment;
    }

    /**
     * ดึง pending assignment ล่าสุด (สำหรับหน้า scan)
     */
    async getLatestPendingAssignment(zone?: BoothZone) {
        return this.prisma.boothAssignment.findFirst({
            where: {
                status: BoothAssignmentStatus.PENDING,
                ...(zone && { booth: { zone } }),
            },
            include: {
                booth: true,
                store: {
                    select: {
                        id: true,
                        storeName: true,
                        storeAdminNisitId: true,
                    },
                },
            },
            orderBy: { drawOrder: 'desc' },
        });
    }
}
