import { Injectable, HttpException, HttpStatus, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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

    // ----- Zone Expansion Configuration -----

    /**
     * กำหนดทิศทางการขยายของแต่ละ zone
     * FOOD: เริ่มจาก assignOrder ต่ำสุด → ขยายไปทางสูง (ASC)
     * NON_FOOD: เริ่มจาก assignOrder สูงสุด → ขยายไปทางต่ำ (DESC)
     */
    private readonly ZONE_EXPANSION_CONFIG = {
        [BoothZone.FOOD]: {
            direction: 'asc' as const,      // ขยายจากต่ำไปสูง
            startFrom: 'min' as const,      // เริ่มจาก assignOrder ต่ำสุด
        },
        [BoothZone.NON_FOOD]: {
            direction: 'desc' as const,     // ขยายจากสูงไปต่ำ
            startFrom: 'max' as const,      // เริ่มจาก assignOrder สูงสุด
        },
    };

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
     * Import booth แบบ range
     * เช่น M1-M20 (FOOD), M21-M100 (NON_FOOD)
     */
    async importBoothRange(dto: ImportBoothRangeDto) {
        const boothsToCreate: Array<{ boothNumber: string; zone: BoothZone; assignOrder: number }> = [];

        for (const range of dto.ranges) {
            const { prefix, start, end, zone, priorityStart } = range;

            if (start > end) {
                throw new BadRequestException(`Invalid range: ${start} > ${end}`);
            }

            // ถ้าไม่มี zone ให้ใช้ UNDEFINED เป็นค่าเริ่มต้น (จะถูกเปลี่ยนตอน assign ร้านจริง)
            const boothZone = zone || BoothZone.UNDEFINED;

            // ใช้ priorityStart ถ้ามี ไม่งั้นใช้ค่าเริ่มต้น
            let currentPriority = priorityStart || 1;

            for (let i = start; i <= end; i++) {
                const boothNumber = `${prefix}${i}`;

                boothsToCreate.push({
                    boothNumber,
                    zone: boothZone,
                    assignOrder: currentPriority,
                });

                currentPriority++;
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
     * ดึงค่า priority (assignOrder) สูงสุด
     */
    async getLastPriority() {
        const result = await this.prisma.booth.aggregate({
            _max: {
                assignOrder: true,
            },
        });
        return {
            lastPriority: result._max.assignOrder || 0,
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
            [BoothZone.UNDEFINED]: 0,
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
        const booths = await this.prisma.booth.findMany({
            where: {
                ...(zone && { zone }),
                ...(isAssigned !== undefined && { isAssigned }),
            },
            include: {
                assignments: {
                    where: {
                        status: { in: [BoothAssignmentStatus.PENDING, BoothAssignmentStatus.CONFIRMED] }
                    },
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

        return booths.map((booth: any) => {
            if (booth.assignments.length > 1) {
                throw new InternalServerErrorException(
                    `Data Inconsistency: Booth ${booth.boothNumber} (ID: ${booth.id}) has multiple active assignments!`
                );
            }

            const assignment = booth.assignments[0] || null;

            // แปลงจาก array assignments เป็น object assignment เดียว
            const { assignments, ...boothData } = booth;
            return {
                ...boothData,
                assignment,
            };
        });
    }

    /**
     * ลบ booth
     */
    async deleteBooth(id: number) {
        const booth = await this.prisma.booth.findUnique({
            where: { id },
            include: {
                assignments: {
                    where: { status: { in: [BoothAssignmentStatus.PENDING, BoothAssignmentStatus.CONFIRMED] } }
                }
            },
        });

        if (!booth) {
            throw new NotFoundException('ไม่พบ booth');
        }

        if ((booth as any).assignments.length > 0) {
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

    /**
     * Sync isAssigned flag กับ assignment จริง
     * ใช้แก้ไขปัญหา data inconsistency
     */
    async syncBoothAssignedFlags() {
        // หา booth ที่มี assignment active แต่ isAssigned = false
        const boothsWithAssignment = await this.prisma.booth.findMany({
            where: {
                assignments: {
                    some: { status: { in: [BoothAssignmentStatus.PENDING, BoothAssignmentStatus.CONFIRMED] } }
                },
                isAssigned: false,
            },
        });

        // หา booth ที่ไม่มี assignment active แต่ isAssigned = true
        const boothsWithoutAssignment = await this.prisma.booth.findMany({
            where: {
                assignments: {
                    none: { status: { in: [BoothAssignmentStatus.PENDING, BoothAssignmentStatus.CONFIRMED] } }
                },
                isAssigned: true,
            },
        });

        // อัปเดต
        await this.prisma.$transaction([
            // Set isAssigned = true สำหรับ booth ที่มี assignment
            ...boothsWithAssignment.map(booth =>
                this.prisma.booth.update({
                    where: { id: booth.id },
                    data: { isAssigned: true },
                })
            ),
            // Set isAssigned = false สำหรับ booth ที่ไม่มี assignment
            ...boothsWithoutAssignment.map(booth =>
                this.prisma.booth.update({
                    where: { id: booth.id },
                    data: { isAssigned: false },
                })
            ),
        ]);

        return {
            message: 'Sync สำเร็จ',
            fixedWithAssignment: boothsWithAssignment.length,
            fixedWithoutAssignment: boothsWithoutAssignment.length,
        };
    }

    /**
     * ปิดการใช้งาน booth หลายอันพร้อมกัน (Soft Delete / Disable)
     * จะปิดได้เฉพาะ booth ที่ยังไม่ได้ assign เท่านั้น
     */
    async bulkDisableBooths(boothIds: number[]) {
        // ตรวจสอบว่า booth ที่จะปิดมี assignment หรือไม่
        const boothsWithAssignments = await this.prisma.booth.findMany({
            where: {
                id: { in: boothIds },
                assignments: {
                    some: { status: { in: [BoothAssignmentStatus.PENDING, BoothAssignmentStatus.CONFIRMED] } }
                }
            },
            select: {
                id: true,
                boothNumber: true,
            },
        });

        if (boothsWithAssignments.length > 0) {
            const boothNumbers = boothsWithAssignments.map(b => b.boothNumber).join(', ');
            throw new BadRequestException(
                `ไม่สามารถปิดการใช้งาน booth ที่มีการ assign แล้วได้: ${boothNumbers}`
            );
        }

        // ปิดการใช้งาน booth (soft delete) โดยเซ็ต isActive = false
        const result = await this.prisma.booth.updateMany({
            where: {
                id: { in: boothIds },
                isAssigned: false,
            },
            data: {
                isActive: false,
            },
        });

        return {
            message: `ปิดการใช้งาน booth สำเร็จ ${result.count} รายการ`,
            disabled: result.count,
        };
    }

    /**
     * เปิดการใช้งาน booth หลายอันพร้อมกัน (Enable)
     */
    async bulkEnableBooths(boothIds: number[]) {
        const result = await this.prisma.booth.updateMany({
            where: {
                id: { in: boothIds },
            },
            data: {
                isActive: true,
            },
        });

        return {
            message: `เปิดการใช้งาน booth สำเร็จ ${result.count} รายการ`,
            enabled: result.count,
        };
    }

    /**
     * อัปเดตลำดับ booth (assignOrder) หลายตัวพร้อมกัน
     */
    async updateBoothOrder(booths: Array<{ id: number; assignOrder: number }>) {
        // ใช้ transaction เพื่อให้แน่ใจว่าทุก booth ถูกอัปเดตพร้อมกัน
        await this.prisma.$transaction(
            booths.map(booth =>
                this.prisma.booth.update({
                    where: { id: booth.id },
                    data: { assignOrder: booth.assignOrder },
                })
            )
        );

        return {
            message: `อัปเดตลำดับ booth สำเร็จ ${booths.length} รายการ`,
            updated: booths.length,
        };
    }

    // ----- Assignment Management -----

    /**
     * ดึง booth ว่างถัดไปตาม zone
     * FOOD zone: ขยายจาก assignOrder ต่ำไปสูง (ASC)
     * NON_FOOD zone: ขยายจาก assignOrder สูงไปต่ำ (DESC)
     */
    async getNextAvailableBooth(zone: BoothZone): Promise<NextBoothInfoDto> {
        const config = this.ZONE_EXPANSION_CONFIG[zone];

        // ค้นหา booth ใน zone ที่กำหนด หรือ UNDEFINED
        // โดยเรียงตาม assignOrder ตามทิศทางของ zone นั้น
        // ตรวจสอบว่าไม่มี assignment ที่ Active อยู่ (PENDING/CONFIRMED)
        // FORFEITED ไม่นับ (ถือว่าว่าง)
        const nextBooth = await this.prisma.booth.findFirst({
            where: {
                zone: { in: [zone, BoothZone.UNDEFINED] },
                isActive: true,
                assignments: {
                    none: { status: { in: [BoothAssignmentStatus.PENDING, BoothAssignmentStatus.CONFIRMED] } }
                }
            },
            orderBy: { assignOrder: config.direction },
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
        const config = this.ZONE_EXPANSION_CONFIG[zone];

        // ดึง booth ว่างถัดไปตามทิศทางการขยายของ zone รวมถึง UNDEFINED zone
        // ตรวจสอบว่าไม่มี assignment จริงๆ แทนที่จะดู isAssigned flag
        const nextBooth = await this.prisma.booth.findFirst({
            where: {
                zone: { in: [zone, BoothZone.UNDEFINED] },
                isActive: true, // เลือกเฉพาะ booth ที่เปิดใช้งาน
                assignments: {
                    none: { status: { in: [BoothAssignmentStatus.PENDING, BoothAssignmentStatus.CONFIRMED] } }
                }
            },
            orderBy: { assignOrder: config.direction },
        });

        if (!nextBooth) {
            throw new BadRequestException(`ไม่มี booth ว่างในโซน ${zone} หรือ UNDEFINED zone`);
        }

        // ดึงลำดับ draw ถัดไป (นับเฉพาะใน zone ที่ assign แต่ตอนนี้อาจจะรวมๆ กัน ถ้าเปลี่ยนจาก undefined มาเป็น zone)
        // จริงๆ drawOrder อาจจะไม่ซีเรียสมากเรื่องแยก zone แต่อิงตาม assignment ที่เกิดขึ้น actual
        const maxDrawOrder = await this.prisma.boothAssignment.aggregate({
            // นับรวมทั้งหมดดีกว่า เพราะตอนนี้ zone มัน dynamic
            _max: { drawOrder: true },
        });

        const drawOrder = (maxDrawOrder._max.drawOrder || 0) + 1;

        // Transaction: สร้าง assignment และ mark booth as assigned และ update zone ถ้าจำเป็น
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

            // Mark booth as assigned และ update zone ให้ถูกต้อง
            await tx.booth.update({
                where: { id: nextBooth.id },
                data: {
                    isAssigned: true,
                    zone: zone // อัปเดต zone ให้ตรงกับร้าน (เช่นเปลี่ยนจาก UNDEFINED เป็น FOOD)
                },
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

    /**
     * Assign booth เฉพาะเจาะจงให้ร้าน
     * ใช้สำหรับกรณี admin ต้องการระบุหมายเลข booth ที่ต้องการให้ร้าน
     */
    async assignSpecificBooth(storeId: number, boothNumber: string, note?: string) {
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

        if (!store.goodType) {
            throw new BadRequestException('ร้านนี้ยังไม่ได้ระบุประเภทสินค้า (Food/NonFood)');
        }

        // ค้นหา active assignment ปัจจุบันของร้าน (ถ้ามี)
        const currentAssignment = await this.prisma.boothAssignment.findFirst({
            where: {
                storeId: storeId,
                status: { in: [BoothAssignmentStatus.PENDING, BoothAssignmentStatus.CONFIRMED] }
            },
            include: { booth: true }
        });

        // ค้นหา booth ใหม่ที่ระบุ พร้อมตรวจสอบ assignment
        const newBooth = await this.prisma.booth.findUnique({
            where: { boothNumber },
            include: { assignments: true },
        });

        if (!newBooth) {
            throw new NotFoundException(`ไม่พบ booth ใหม่หมายเลข "${boothNumber}"`);
        }

        // ตรวจสอบว่า booth ใหม่ว่างหรือไม่
        const activeAssignmentInNewBooth = (newBooth as any).assignments.find((a: any) =>
            a.status === BoothAssignmentStatus.PENDING || a.status === BoothAssignmentStatus.CONFIRMED
        );

        if (activeAssignmentInNewBooth) {
            throw new BadRequestException(`Booth ใหม่ "${boothNumber}" ถูก assign ไปแล้ว`);
        }

        if (!newBooth.isActive) {
            throw new BadRequestException(`Booth ใหม่ "${boothNumber}" ถูกปิดการใช้งาน`);
        }

        // ตรวจสอบว่า zone ของ booth ใหม่ตรงกับ goodType ของร้านหรือไม่
        const zone = this.goodsTypeToZone(store.goodType);
        if (newBooth.zone !== zone && newBooth.zone !== BoothZone.UNDEFINED) {
            throw new BadRequestException(
                `Booth "${boothNumber}" อยู่ใน zone ${newBooth.zone} แต่ร้านนี้เป็นประเภท ${store.goodType} (zone ${zone})`
            );
        }

        // ดึงลำดับ draw ถัดไป
        const maxDrawOrder = await this.prisma.boothAssignment.aggregate({
            _max: { drawOrder: true },
        });

        const drawOrder = (maxDrawOrder._max.drawOrder || 0) + 1;

        // Transaction: ย้าย booth (จัดการของเก่า + สร้างของใหม่)
        const assignment = await this.prisma.$transaction(async (tx) => {
            // 1. ถ้ามี assignment เก่า ให้ยกเลิกและคืน booth เก่า
            if (currentAssignment) {
                // Update assignment เก่าเป็น FORFEITED (เปลี่ยน booth)
                await tx.boothAssignment.update({
                    where: { id: currentAssignment.id },
                    data: {
                        status: BoothAssignmentStatus.FORFEITED,
                        forfeitReason: `Admin re-assigned to new booth ${boothNumber}`,
                        forfeitedAt: new Date(),
                    }
                });

                // Update booth เก่าให้ว่าง (isAssigned = false)
                await tx.booth.update({
                    where: { id: currentAssignment.boothId },
                    data: { isAssigned: false }
                });
            }

            // 2. สร้าง assignment ใหม่
            const newAssignment = await tx.boothAssignment.create({
                data: {
                    boothId: newBooth.id,
                    storeId: store.id,
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

            // 3. Update booth ใหม่ให้ไม่ว่าง (isAssigned = true)
            await tx.booth.update({
                where: { id: newBooth.id },
                data: {
                    isAssigned: true,
                    zone: zone // อัปเดต zone ให้ตรงกับร้าน
                },
            });

            return newAssignment;
        });

        return {
            ...assignment,
            note: note || 'Specific booth assignment by admin',
        };
    }


    // ----- Statistics -----

    /**
     * ดึงสถิติ booth ทั้งหมด
     */
    async getStats(): Promise<BoothStatsDto[]> {
        const zones = [BoothZone.FOOD, BoothZone.NON_FOOD, BoothZone.UNDEFINED];
        const stats: BoothStatsDto[] = [];

        for (const zone of zones) {
            const total = await this.prisma.booth.count({ where: { zone, isActive: true } });
            const assigned = await this.prisma.booth.count({ where: { zone, isAssigned: true, isActive: true } });
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

            // นับ booth ที่อยู่ใน UNDEFINED zone และยังไม่ได้ assign
            const undefined = await this.prisma.booth.count({
                where: {
                    zone: BoothZone.UNDEFINED,
                    isAssigned: false,
                    isActive: true,
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
                undefined,
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
