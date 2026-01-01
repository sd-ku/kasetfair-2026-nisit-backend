import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StoreState, StoreType, ReviewStatus } from '@prisma/client';
import { ValidateAllStoresResponseDto, StoreValidationResultDto } from './dto/validate-all-stores.dto';
import { MergeReviewStatusResponseDto, MergeReviewStatusResultDto } from './dto/merge-review-status.dto';

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
                    // ผลการตรวจสอบร้านค้าโดย admin (StoreReviewDraft)
                    // - status: สถานะการตรวจสอบ (NeedFix = ต้องแก้ไข, Pending = รอจับฉลาก, Rejected = ถูกปฏิเสธ, deleted = ถูกลบ)
                    // - comment: ข้อความจาก admin อธิบายผลการตรวจสอบหรือสิ่งที่ต้องแก้ไข
                    // - admin: ข้อมูล admin ที่ทำการตรวจสอบ
                    // - เรียงลำดับจากใหม่ไปเก่า (createdAt desc) เพื่อให้เห็นผลการตรวจสอบล่าสุดก่อน
                    reviewDrafts: {
                        select: {
                            id: true,
                            status: true,          // ReviewStatus: NeedFix | Pending | Rejected | deleted
                            comment: true,         // ข้อความจาก admin
                            createdAt: true,       // วันที่สร้างผลการตรวจสอบ
                            updatedAt: true,       // วันที่แก้ไขผลการตรวจสอบล่าสุด
                            admin: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                    role: true,    // AdminRole: SUPER_ADMIN | ADMIN
                                },
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',     // เรียงจากใหม่ไปเก่า
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
            this.prisma.store.count({ where: { state: { not: StoreState.deleted } } }),
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

    /**
     * ตรวจสอบความถูกต้องของข้อมูลร้านค้า
     * @param store ข้อมูลร้านค้าที่ต้องการตรวจสอบ
     * @param activeQuestions คำถามที่ active อยู่ทั้งหมด
     * @param trainingNisitIds Set ของ nisitId ที่ผ่านการอบรม
     * @returns { isValid, validationIssues } ผลการตรวจสอบและรายการปัญหา
     */
    private performStoreValidation(
        store: any,
        activeQuestions: any[],
        trainingNisitIds: Set<string>
    ): { isValid: boolean; validationIssues: string[] } {
        if (store.state === StoreState.deleted) {
            return { isValid: false, validationIssues: [`ร้านค้าถูกลบแล้ว`] };
        }

        let isValid = true;
        const validationIssues: string[] = [];

        // 1. ตรวจสอบสมาชิก (รวม storeAdmin + members, ใช้ Set เพื่อหลีกเลี่ยงการนับซ้ำ)
        const allMemberNisitIds = new Set<string>([
            ...(store.storeAdmin ? [store.storeAdmin.nisitId] : []),
            ...store.members.map(m => m.nisitId)
        ]);
        const memberCount = allMemberNisitIds.size;
        if (memberCount < 3) {
            isValid = false;
            validationIssues.push(`ต้องมีสมาชิกอย่างน้อย 3 คน (ปัจจุบัน: ${memberCount} คน)`);
        }

        // 2. ตรวจสอบการอบรม (ตรวจสอบทั้ง storeAdmin และ members)
        const membersInTraining = Array.from(allMemberNisitIds).filter(nisitId => trainingNisitIds.has(nisitId));
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

        return { isValid, validationIssues };
    }

    async validateAllStores(adminId: string): Promise<ValidateAllStoresResponseDto> {
        // ดึง stores ทั้งหมดที่อยู่ใน state Submitted
        const stores = await this.prisma.store.findMany({
            where: {
                state: StoreState.Pending,
            },
            include: {
                storeAdmin: {
                    select: {
                        nisitId: true,
                    },
                },
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
            // ใช้ shared validation logic
            const { isValid, validationIssues } = this.performStoreValidation(
                store,
                activeQuestions,
                trainingNisitIds
            );

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

    async validateSingleStore(storeId: number, adminId: string): Promise<StoreValidationResultDto> {
        // ดึงข้อมูลร้านที่ต้องการ validate
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            include: {
                storeAdmin: {
                    select: {
                        nisitId: true,
                    },
                },
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

        if (!store) {
            throw new Error(`Store with ID ${storeId} not found`);
        }

        // ดึง active questions
        const activeQuestions = await this.prisma.storeQuestionTemplate.findMany({
            where: { isActive: true },
        });

        // ดึง nisit training participants
        const nisitIds = store.members.map(m => m.nisitId);
        const trainingParticipants = await this.prisma.nisitTrainingParticipant.findMany({
            where: {
                nisitId: { in: nisitIds },
            },
            select: {
                nisitId: true,
            },
        });
        const trainingNisitIds = new Set(trainingParticipants.map(p => p.nisitId));

        // ใช้ shared validation logic
        const { isValid, validationIssues } = this.performStoreValidation(
            store,
            activeQuestions,
            trainingNisitIds
        );

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

        return {
            storeId: store.id,
            storeName: store.storeName,
            isValid,
            reviewStatus,
            comment,
        };
    }

    async mergeReviewStatus(storeId?: number): Promise<MergeReviewStatusResponseDto> {
        const results: MergeReviewStatusResultDto[] = [];
        let successCount = 0;
        let failureCount = 0;

        // ถ้าระบุ storeId ให้ merge เฉพาะ store นั้น ไม่เช่นนั้นให้ merge ทั้งหมด
        const whereCondition = storeId ? { storeId } : {};

        // ดึง review drafts ล่าสุดของแต่ละ store
        const reviewDrafts = await this.prisma.storeReviewDraft.findMany({
            where: whereCondition,
            include: {
                store: {
                    select: {
                        id: true,
                        storeName: true,
                        state: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // จัดกลุ่ม review drafts ตาม storeId และเอาเฉพาะอันล่าสุด
        const latestReviewDraftsMap = new Map<number, typeof reviewDrafts[0]>();
        for (const draft of reviewDrafts) {
            if (!latestReviewDraftsMap.has(draft.storeId)) {
                latestReviewDraftsMap.set(draft.storeId, draft);
            }
        }

        // ถ้าระบุ storeId แต่ไม่พบ review draft
        if (storeId && latestReviewDraftsMap.size === 0) {
            return {
                totalProcessed: 0,
                successCount: 0,
                failureCount: 0,
                results: [],
            };
        }

        // Process แต่ละ store
        for (const [_, draft] of latestReviewDraftsMap) {
            // ข้าม store ที่ถูกลบแล้ว
            if (draft.store.state === StoreState.deleted) {
                continue;
            }

            try {
                const previousState = draft.store.state;
                let newState: StoreState;

                // Map ReviewStatus to StoreState
                switch (draft.status) {
                    case ReviewStatus.Pending:
                        newState = StoreState.Validated;
                        break;
                    case ReviewStatus.NeedFix:
                        newState = StoreState.Rejected; // ส่งกลับไปให้แก้ไข
                        break;
                    case ReviewStatus.Rejected:
                        newState = StoreState.Rejected;
                        break;
                    case ReviewStatus.deleted:
                        newState = StoreState.deleted;
                        break;
                    default:
                        throw new Error(`Unknown review status: ${draft.status}`);
                }

                // Update store state
                await this.prisma.store.update({
                    where: { id: draft.storeId },
                    data: { state: newState },
                });

                results.push({
                    storeId: draft.storeId,
                    storeName: draft.store.storeName,
                    previousState,
                    newState,
                    reviewStatus: draft.status,
                    comment: draft.comment || undefined,
                    success: true,
                });

                successCount++;
            } catch (error) {
                results.push({
                    storeId: draft.storeId,
                    storeName: draft.store.storeName,
                    previousState: draft.store.state,
                    newState: draft.store.state, // ไม่เปลี่ยน
                    reviewStatus: draft.status,
                    comment: draft.comment || undefined,
                    success: false,
                    error: error.message || 'Unknown error',
                });

                failureCount++;
            }
        }

        return {
            totalProcessed: latestReviewDraftsMap.size,
            successCount,
            failureCount,
            results,
        };
    }
}
