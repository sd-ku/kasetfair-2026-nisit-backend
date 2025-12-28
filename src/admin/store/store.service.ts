import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StoreState, StoreType, ReviewStatus } from '@prisma/client';
import { ValidateAllStoresResponseDto, StoreValidationResultDto } from './dto/validate-all-stores.dto';

@Injectable()
export class StoreService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(status?: StoreState, type?: StoreType, search?: string, sort: 'id' | 'name' = 'id', page: number = 1, limit: number = 10) {
        const where: any = {};

        if (status) {
            where.state = status;
        }

        if (type) {
            where.type = type;
        }

        // Add search functionality for storeName, id, and boothNumber
        if (search) {
            const searchTrimmed = search.trim();
            const searchAsNumber = parseInt(searchTrimmed);

            where.OR = [
                // Search by store name (case-insensitive partial match)
                {
                    storeName: {
                        contains: searchTrimmed,
                        mode: 'insensitive',
                    },
                },
                // Search by booth number (case-insensitive partial match)
                {
                    boothNumber: {
                        contains: searchTrimmed,
                        mode: 'insensitive',
                    },
                },
            ];

            // If search is a valid number, also search by ID (exact match)
            if (!isNaN(searchAsNumber)) {
                where.OR.push({
                    id: searchAsNumber,
                });
            }
        }

        const skip = (page - 1) * limit;

        const orderBy: any = {};
        if (sort === 'name') {
            orderBy.storeName = 'asc';
        } else {
            orderBy.id = 'asc';
        }

        const [total, stores] = await Promise.all([
            this.prisma.store.count({ where }),
            this.prisma.store.findMany({
                where,
                skip,
                take: limit,
                include: {
                    storeAdmin: {
                        select: {
                            nisitId: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },
                    clubInfo: {
                        select: {
                            id: true,
                            clubName: true,
                            leaderFirstName: true,
                            leaderLastName: true,
                            leaderEmail: true,
                            leaderPhone: true,
                            leaderNisitId: true,
                            clubApplicationMedia: {
                                select: {
                                    id: true,
                                    link: true,
                                    status: true,
                                },
                            },
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
                    memberAttemptEmails: {
                        select: {
                            email: true,
                            status: true,
                            invitedAt: true,
                            joinedAt: true,
                            nisitId: true,
                        },
                    },
                    goods: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            price: true,
                            googleMedia: {
                                select: {
                                    id: true,
                                    link: true,
                                    status: true,
                                },
                            },
                        },
                    },
                    boothMedia: {
                        select: {
                            id: true,
                            link: true,
                            status: true,
                        },
                    },
                    questionAnswers: {
                        select: {
                            id: true,
                            value: true,
                            question: {
                                select: {
                                    id: true,
                                    key: true,
                                    label: true,
                                    type: true,
                                },
                            },
                        },
                    },
                    reviewDrafts: {
                        select: {
                            id: true,
                            status: true,
                            comment: true,
                            createdAt: true,
                            updatedAt: true,
                            admin: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                    role: true,
                                },
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                    },
                },
                orderBy,
            }),
        ]);

        return {
            data: stores,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async updateStatus(id: number, status: StoreState) {
        return this.prisma.store.update({
            where: { id },
            data: { state: status },
        });
    }

    async getStats() {
        const [total, validated, pending, rejected] = await Promise.all([
            this.prisma.store.count(),
            this.prisma.store.count({ where: { state: StoreState.Validated } }),
            this.prisma.store.count({ where: { state: StoreState.Pending } }),
            this.prisma.store.count({ where: { state: StoreState.Rejected } }),
        ]);

        return {
            total,
            validated,
            pending,
            rejected,
        };
    }

    async validateAllStores(adminId: string): Promise<ValidateAllStoresResponseDto> {
        // ดึง stores ทั้งหมดที่อยู่ใน state Submitted
        const stores = await this.prisma.store.findMany({
            where: {
                state: StoreState.Submitted,
            },
            include: {
                members: {
                    select: {
                        nisitId: true,
                    },
                },
                clubInfo: {
                    select: {
                        clubName: true,
                        clubApplicationMediaId: true,
                        leaderFirstName: true,
                        leaderLastName: true,
                        leaderEmail: true,
                        leaderPhone: true,
                        leaderNisitId: true,
                    },
                },
                goods: {
                    select: {
                        id: true,
                    },
                },
                questionAnswers: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        const results: StoreValidationResultDto[] = [];
        let validStores = 0;
        let invalidStores = 0;

        // ดึง active questions ครั้งเดียว
        const activeQuestions = await this.prisma.storeQuestionTemplate.findMany({
            where: { isActive: true },
        });

        // ดึง nisit training participants ทั้งหมดครั้งเดียว
        const allNisitIds = stores.flatMap(store => store.members.map(m => m.nisitId));
        const trainingParticipants = await this.prisma.nisitTrainingParticipant.findMany({
            where: {
                nisitId: { in: allNisitIds },
            },
            select: {
                nisitId: true,
            },
        });
        const trainingNisitIds = new Set(trainingParticipants.map(p => p.nisitId));

        for (const store of stores) {
            let isValid = true;
            const validationIssues: string[] = [];

            // 1. ตรวจสอบสมาชิก
            const memberCount = store.members.length;
            if (memberCount < 3) {
                isValid = false;
                validationIssues.push(`ต้องมีสมาชิกอย่างน้อย 3 คน (ปัจจุบัน: ${memberCount} คน)`);
            }

            // 2. ตรวจสอบการอบรม
            const membersInTraining = store.members.filter(m => trainingNisitIds.has(m.nisitId));
            if (membersInTraining.length === 0) {
                isValid = false;
                validationIssues.push('ต้องมีสมาชิกอย่างน้อย 1 คนที่ผ่านการอบรม');
            }

            // 3. ตรวจสอบข้อมูลชมรม (สำหรับ Club เท่านั้น)
            if (store.type === StoreType.Club) {
                const clubInfo = store.clubInfo;
                if (!clubInfo) {
                    isValid = false;
                    validationIssues.push('ไม่พบข้อมูลชมรม');
                } else {
                    const requiredFields = [
                        'clubName',
                        'clubApplicationMediaId',
                        'leaderFirstName',
                        'leaderLastName',
                        'leaderEmail',
                        'leaderPhone',
                        'leaderNisitId',
                    ];
                    const missingFields = requiredFields.filter(field => !clubInfo[field]);
                    if (missingFields.length > 0) {
                        isValid = false;
                        validationIssues.push(`ข้อมูลชมรมไม่ครบถ้วน: ${missingFields.join(', ')}`);
                    }
                }
            }

            // 4. ตรวจสอบประเภทสินค้า
            if (!store.goodType) {
                isValid = false;
                validationIssues.push('ยังไม่ได้เลือกประเภทสินค้า');
            }

            // 5. ตรวจสอบแผนผังบูธ
            if (!store.boothMediaId) {
                isValid = false;
                validationIssues.push('ยังไม่ได้อัปโหลดแผนผังบูธ');
            }

            // 6. ตรวจสอบคำถาม
            if (store.questionAnswers.length !== activeQuestions.length) {
                isValid = false;
                validationIssues.push(`ตอบคำถามไม่ครบ (${store.questionAnswers.length}/${activeQuestions.length})`);
            }

            // 7. ตรวจสอบสินค้า
            if (store.goods.length === 0) {
                isValid = false;
                validationIssues.push('ยังไม่ได้เพิ่มสินค้า');
            }

            // กำหนด status และ comment
            const reviewStatus = isValid ? ReviewStatus.Pending : ReviewStatus.NeedFix;
            const comment = isValid
                ? 'ผ่านการตรวจสอบอัตโนมัติ รอการจับฉลาก'
                : `ข้อมูลไม่ครบถ้วน:\n${validationIssues.map((issue, idx) => `${idx + 1}. ${issue}`).join('\n')}`;

            // สร้าง review draft
            await this.prisma.storeReviewDraft.create({
                data: {
                    storeId: store.id,
                    adminId,
                    status: reviewStatus,
                    comment,
                },
            });

            results.push({
                storeId: store.id,
                storeName: store.storeName,
                isValid,
                reviewStatus,
                comment,
            });

            if (isValid) {
                validStores++;
            } else {
                invalidStores++;
            }
        }

        return {
            totalProcessed: stores.length,
            validStores,
            invalidStores,
            results,
        };
    }
}
