import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertNisitTrainingParticipantDto } from './dto/upsert-participant.dto';

@Injectable()
export class NisitTrainingParticipantService {
    constructor(private prisma: PrismaService) { }

    async findAll(params: { page: number; limit: number; nisitId?: string }) {
        const { page, limit, nisitId } = params;
        const skip = (page - 1) * limit;

        const where = nisitId ? {
            nisitId: {
                contains: nisitId,
            }
        } : {};

        const [data, total] = await Promise.all([
            this.prisma.nisitTrainingParticipant.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    nisitId: 'asc',
                },
            }),
            this.prisma.nisitTrainingParticipant.count({ where })
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    async upsert(dto: UpsertNisitTrainingParticipantDto) {
        return this.prisma.nisitTrainingParticipant.upsert({
            where: {
                nisitId: dto.nisitId,
            },
            update: {},
            create: {
                nisitId: dto.nisitId,
            },
        });
    }

    async remove(id: string) {
        return this.prisma.nisitTrainingParticipant.delete({
            where: {
                id,
            },
        });
    }
}
