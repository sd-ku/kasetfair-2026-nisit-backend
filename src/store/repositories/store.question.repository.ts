import { Injectable } from '@nestjs/common';
import { Prisma, StoreQuestionTemplate } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StoreRepository } from './store.repository';

type UpsertAnswerPayload = {
  questionId: number;
  value: Prisma.InputJsonValue;
};

@Injectable()
export class StoreQuestionRepository extends StoreRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async listTemplates(includeInactive = false): Promise<StoreQuestionTemplate[]> {
    return this.prisma.storeQuestionTemplate.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async findTemplateById(id: number): Promise<StoreQuestionTemplate | null> {
    return this.prisma.storeQuestionTemplate.findUnique({ where: { id } });
  }

  async findTemplatesByIds(
    ids: number[],
    includeInactive = false,
  ): Promise<StoreQuestionTemplate[]> {
    return this.prisma.storeQuestionTemplate.findMany({
      where: {
        id: { in: ids },
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async findTemplatesByKeys(
    keys: string[],
    includeInactive = false,
  ): Promise<StoreQuestionTemplate[]> {
    return this.prisma.storeQuestionTemplate.findMany({
      where: {
        key: { in: keys },
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async findTemplatesWithAnswers(
    storeId: number,
    includeInactive = false,
  ): Promise<(StoreQuestionTemplate & { answers: { id: number; storeId: number; questionId: number; value: Prisma.JsonValue; createdAt: Date; updatedAt: Date }[] })[]> {
    return this.prisma.storeQuestionTemplate.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' },
      ],
      include: {
        answers: { where: { storeId } },
      },
    });
  }

  async createTemplate(data: Prisma.StoreQuestionTemplateCreateInput) {
    return this.prisma.storeQuestionTemplate.create({ data });
  }

  async updateTemplate(
    id: number,
    data: Prisma.StoreQuestionTemplateUpdateInput,
  ) {
    return this.prisma.storeQuestionTemplate.update({
      where: { id },
      data,
    });
  }

  async upsertAnswersForStore(storeId: number, payloads: UpsertAnswerPayload[]) {
    return this.prisma.$transaction((tx) =>
      Promise.all(
        payloads.map((payload) =>
          tx.storeQuestionAnswer.upsert({
            where: {
              storeId_questionId: {
                storeId,
                questionId: payload.questionId,
              },
            },
            create: {
              storeId,
              questionId: payload.questionId,
              value: payload.value,
            },
            update: {
              value: payload.value,
            },
          }),
        ),
      ),
    );
  }
}
