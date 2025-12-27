import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StoreState, StoreType } from '@prisma/client';

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
}
