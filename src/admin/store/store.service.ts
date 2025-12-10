import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StoreState, StoreType } from '@prisma/client';

@Injectable()
export class StoreService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(status?: StoreState, type?: StoreType, page: number = 1, limit: number = 10) {
        const where: any = {};

        if (status) {
            where.state = status;
        }

        if (type) {
            where.type = type;
        }

        const skip = (page - 1) * limit;

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
                orderBy: {
                    id: 'asc',
                },
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
