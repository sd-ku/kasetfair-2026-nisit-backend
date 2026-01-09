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
     * ถ้าความยาวไม่ครบ 14 ตัว ถือว่าเป็น nisitId อยู่แล้ว (ไม่ต้อง extract)
     */
    private extractNisitId(barcode: string): string {
        // ถ้าความยาวเป็น 14 ตัว = barcode เต็ม (XXX<10 digits>X)
        if (barcode.length === 14) {
            return barcode.slice(3, -1);
        }

        // ถ้าความยาวเป็น 10 ตัว = nisitId อยู่แล้ว
        if (barcode.length === 10) {
            return barcode;
        }

        // ถ้าไม่ใช่ทั้ง 14 และ 10 = format ไม่ถูกต้อง
        throw new BadRequestException(
            `Barcode/NisitId ไม่ถูกต้อง: ต้องมีความยาว 14 ตัว (barcode) หรือ 10 ตัว (nisitId) แต่ได้รับ ${barcode.length} ตัว`
        );
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

    /**
     * Manual assign booth สำหรับร้านที่ระบุ
     * ใช้สำหรับกรณี admin ต้องการ assign booth ให้ร้านโดยตรง
     */
    async manualAssignBooth(storeId: number, note?: string) {
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
            throw new BadRequestException(`ร้าน "${store.storeName}" มี booth ${store.boothNumber} แล้ว`);
        }

        if (!store.goodType) {
            throw new BadRequestException('ร้านนี้ยังไม่ได้ระบุประเภทสินค้า (Food/NonFood)');
        }

        // สร้าง assignment (จะ auto assign booth ว่างถัดไป)
        const assignment = await this.createAssignment({ storeId });

        return {
            ...assignment,
            note: note || 'Manual assignment by admin',
        };
    }

    /**
     * Batch assign booths สำหรับหลายร้านพร้อมกัน
     * ใช้สำหรับกรณี admin ต้องการ assign booth ให้หลายร้านพร้อมกัน
     */
    async batchAssignBooths(storeIds: number[], note?: string) {
        const results = {
            success: [] as any[],
            failed: [] as { storeId: number; storeName: string; reason: string }[],
        };

        for (const storeId of storeIds) {
            try {
                const assignment = await this.manualAssignBooth(storeId, note);
                results.success.push(assignment);
            } catch (error: any) {
                // ดึงชื่อร้านสำหรับ error message
                const store = await this.prisma.store.findUnique({
                    where: { id: storeId },
                    select: { storeName: true },
                });

                results.failed.push({
                    storeId,
                    storeName: store?.storeName || 'Unknown',
                    reason: error.message || 'Unknown error',
                });
            }
        }

        return {
            total: storeIds.length,
            successCount: results.success.length,
            failedCount: results.failed.length,
            success: results.success,
            failed: results.failed,
            note: note || 'Batch assignment by admin',
        };
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

    /**
     * ค้นหาร้านจาก nisitId (barcode)
     * ใช้สำหรับ admin ตรวจสอบว่านิสิตคนนี้อยู่ร้านไหน
     */
    async findStoreByNisitBarcode(barcode: string) {
        const nisitId = this.extractNisitId(barcode);

        // ค้นหาว่านิสิตคนนี้เป็น admin หรือ member ของร้านไหน
        const nisit = await this.prisma.nisit.findUnique({
            where: { nisitId },
            select: {
                nisitId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                storeAdminOf: {
                    select: {
                        id: true,
                        storeName: true,
                        goodType: true,
                        boothNumber: true,
                        state: true,
                        boothAssignments: {
                            include: {
                                booth: true,
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                },
                store: {
                    select: {
                        id: true,
                        storeName: true,
                        goodType: true,
                        boothNumber: true,
                        state: true,
                        storeAdminNisitId: true,
                        boothAssignments: {
                            include: {
                                booth: true,
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
        });

        if (!nisit) {
            throw new NotFoundException(`ไม่พบนิสิต nisitId: ${nisitId}`);
        }

        // ตรวจสอบว่าเป็น admin หรือ member
        const store = nisit.storeAdminOf || nisit.store;
        const role = nisit.storeAdminOf ? 'admin' : 'member';

        if (!store) {
            throw new NotFoundException(`nisitId ${nisitId} (${nisit.firstName} ${nisit.lastName}) ไม่ได้อยู่ในร้านใดๆ`);
        }

        // ดึง assignment ล่าสุด
        const latestAssignment = store.boothAssignments[0] || null;

        // ดึงข้อมูล admin และ members ของร้าน
        const storeWithMembers = await this.prisma.store.findUnique({
            where: { id: store.id },
            select: {
                storeAdmin: {
                    select: {
                        nisitId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                members: {
                    select: {
                        nisitId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        return {
            scannedBarcode: barcode, // เก็บ barcode ดิบที่สแกนมา
            nisit: {
                nisitId: nisit.nisitId,
                firstName: nisit.firstName,
                lastName: nisit.lastName,
                email: nisit.email,
                phone: nisit.phone,
                role,
            },
            store: {
                id: store.id,
                storeName: store.storeName,
                goodType: store.goodType,
                boothNumber: store.boothNumber,
                state: store.state,
                storeAdmin: storeWithMembers?.storeAdmin || null,
                members: storeWithMembers?.members || [],
            },
            assignment: latestAssignment ? {
                id: latestAssignment.id,
                booth: latestAssignment.booth,
                status: latestAssignment.status,
                drawOrder: latestAssignment.drawOrder,
                verifiedByNisitId: latestAssignment.verifiedByNisitId,
                verifiedAt: latestAssignment.verifiedAt,
                createdAt: latestAssignment.createdAt,
            } : null,
        };
    }
}
