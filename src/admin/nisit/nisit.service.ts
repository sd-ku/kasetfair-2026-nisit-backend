import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NisitService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(
        search?: string,
        sort: 'id' | 'name' = 'id',
        page: number = 1,
        limit: number = 10,
        status?: 'NotFound' | 'ProfileNotCompleted' | 'DuplicateStore' | 'Invited' | 'Joined' | 'Declined'
    ) {
        const where: any = {};

        // Add search functionality for nisitId, firstName, lastName, email, and phone
        if (search) {
            const searchTrimmed = search.trim();

            where.OR = [
                // Search by nisitId (partial match)
                {
                    nisitId: {
                        contains: searchTrimmed,
                        mode: 'insensitive',
                    },
                },
                // Search by first name (case-insensitive partial match)
                {
                    firstName: {
                        contains: searchTrimmed,
                        mode: 'insensitive',
                    },
                },
                // Search by last name (case-insensitive partial match)
                {
                    lastName: {
                        contains: searchTrimmed,
                        mode: 'insensitive',
                    },
                },
                // Search by email (case-insensitive partial match)
                {
                    email: {
                        contains: searchTrimmed,
                        mode: 'insensitive',
                    },
                },
            ];

            // If search contains text, also search by phone (partial match)
            if (searchTrimmed) {
                where.OR.push({
                    phone: {
                        contains: searchTrimmed,
                        mode: 'insensitive',
                    },
                });
            }
        }

        // Add status filter for storeMemberAttempts
        if (status) {
            where.storeMemberAttempts = {
                some: {
                    status: status,
                },
            };
        }

        const skip = (page - 1) * limit;

        const orderBy: any = {};
        if (sort === 'name') {
            orderBy.firstName = 'asc';
        } else {
            orderBy.nisitId = 'asc';
        }

        const [total, nisits] = await Promise.all([
            this.prisma.nisit.count({ where }),
            this.prisma.nisit.findMany({
                where,
                skip,
                take: limit,
                include: {
                    nisitCardMedia: {
                        select: {
                            id: true,
                            link: true,
                            status: true,
                        },
                    },
                    dormitoryType: {
                        select: {
                            id: true,
                            label: true,
                        },
                    },
                    storeAdminOf: {
                        select: {
                            id: true,
                            storeName: true,
                            type: true,
                            state: true,
                        },
                    },
                    store: {
                        select: {
                            id: true,
                            storeName: true,
                            type: true,
                            state: true,
                        },
                    },
                    userIdentities: {
                        select: {
                            provider: true,
                            providerEmail: true,
                            emailVerified: true,
                        },
                    },
                },
                orderBy,
            }),
        ]);

        return {
            data: nisits,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getStats() {
        const [total, withStore, storeAdmin, withDormitory] = await Promise.all([
            this.prisma.nisit.count(),
            this.prisma.nisit.count({ where: { storeId: { not: null } } }),
            this.prisma.nisit.count({ where: { storeAdminOf: { isNot: null } } }),
            this.prisma.nisit.count({ where: { dormitoryTypeId: { not: null } } }),
        ]);

        return {
            total,
            withStore,
            storeAdmin,
            withDormitory,
        };
    }
}
