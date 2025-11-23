import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StoreQuestionTemplate,
  StoreQuestionType,
} from '@prisma/client';
import { NisitService } from 'src/nisit/nisit.service';
import {
  CreateStoreQuestionTemplateDto,
  StoreQuestionAnswerResponseDto,
  StoreQuestionOptionDto,
  StoreQuestionTemplateDto,
  StoreQuestionWithAnswerDto,
  UpsertStoreQuestionAnswerDto,
  UpdateStoreQuestionTemplateDto,
  UpsertStoreQuestionAnswersDto,
} from '../dto/store-question.dto';
import { StoreQuestionRepository } from '../repositories/store.question.repository';
import { StoreService } from './store.service';

@Injectable()
export class StoreQuestionService extends StoreService {
  constructor(
    private readonly questionRepo: StoreQuestionRepository,
    nisitService: NisitService,
  ) {
    super(questionRepo, nisitService);
  }

  async listTemplates(includeInactive = false): Promise<StoreQuestionTemplateDto[]> {
    const templates = await this.questionRepo.listTemplates(includeInactive);
    return templates.map((template) => this.mapTemplate(template));
  }

  async createTemplate(
    dto: CreateStoreQuestionTemplateDto,
  ): Promise<StoreQuestionTemplateDto> {
    const normalizedOptions =
      dto.type === StoreQuestionType.TEXT ? null : this.normalizeOptions(dto.options);
    this.validateOptionsForType(dto.type, normalizedOptions);
    const optionsInput = this.buildOptionsInput(dto.type, normalizedOptions);

    try {
      const template = await this.questionRepo.createTemplate({
        key: dto.key.trim(),
        label: dto.label.trim(),
        description: dto.description?.trim() ?? null,
        type: dto.type,
        options: optionsInput,
        isActive: dto.isActive ?? true,
        order: dto.order ?? null,
      });

      return this.mapTemplate(template);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async updateTemplate(
    id: number,
    dto: UpdateStoreQuestionTemplateDto,
  ): Promise<StoreQuestionTemplateDto> {
    const existing = await this.questionRepo.findTemplateById(id);
    if (!existing) {
      throw new NotFoundException('Question template not found.');
    }

    const nextType = dto.type ?? existing.type;
    const normalizedOptions =
      nextType === StoreQuestionType.TEXT
        ? null
        : dto.options !== undefined
          ? this.normalizeOptions(dto.options)
          : this.toOptionList(existing.options);
    this.validateOptionsForType(nextType, normalizedOptions);

    const data: Prisma.StoreQuestionTemplateUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label.trim();
    if (dto.description !== undefined) {
      data.description =
        dto.description === null
          ? null
          : dto.description.trim();
    }
    if (dto.type !== undefined) data.type = dto.type;
    const optionsInput =
      nextType === StoreQuestionType.TEXT
        ? Prisma.DbNull
        : dto.options !== undefined
          ? this.buildOptionsInput(nextType, normalizedOptions)
          : undefined;
    if (optionsInput !== undefined) {
      data.options = optionsInput;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.order !== undefined) data.order = dto.order ?? null;

    try {
      const updated = await this.questionRepo.updateTemplate(id, data);
      return this.mapTemplate(updated);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async getMyQuestions(nisitId: string): Promise<StoreQuestionWithAnswerDto[]> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const templates = await this.questionRepo.findTemplatesWithAnswers(storeId);
    return this.mapTemplatesWithAnswers(templates, storeId);
  }

  async upsertMyAnswers(
    nisitId: string,
    dto: UpsertStoreQuestionAnswersDto,
  ): Promise<StoreQuestionWithAnswerDto[]> {
    const storeId = await this.ensureStoreIdForNisit(nisitId);
    const answers = dto.answers ?? [];

    const providedAnswers = answers.filter((answer) => this.hasProvidedAnswer(answer));
    if (!providedAnswers.length) {
      const existingTemplates = await this.questionRepo.findTemplatesWithAnswers(storeId);
      return this.mapTemplatesWithAnswers(existingTemplates, storeId);
    }

    const uniqueIds = Array.from(new Set(providedAnswers.map((item) => item.id)));
    if (uniqueIds.length !== providedAnswers.length) {
      throw new BadRequestException('Duplicate question ids provided.');
    }

    const templates = await this.questionRepo.findTemplatesByIds(uniqueIds);
    if (templates.length !== uniqueIds.length) {
      throw new BadRequestException('Some question ids are invalid or inactive.');
    }

    const templateMap = new Map<number, StoreQuestionTemplate>();
    for (const template of templates) {
      templateMap.set(template.id, template);
    }

    const payloads = providedAnswers.map((answer) => {
      const template = templateMap.get(answer.id);
      if (!template) {
        throw new BadRequestException(`Question with id "${answer.id}" is not available.`);
      }

      return {
        questionId: template.id,
        value: this.buildAnswerValue(template, answer),
      };
    });

    try {
      await this.questionRepo.upsertAnswersForStore(storeId, payloads);
      const updatedTemplates = await this.questionRepo.findTemplatesWithAnswers(storeId);
      return this.mapTemplatesWithAnswers(updatedTemplates, storeId);
    } catch (error) {
      throw this.transformPrismaError(error);
    }
  }

  async getPublicAnswersForStore(storeId: number): Promise<StoreQuestionWithAnswerDto[]> {
    const store = await this.repo.findStoreById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    const templates = await this.questionRepo.findTemplatesWithAnswers(storeId);
    const mapped = this.mapTemplatesWithAnswers(templates, storeId);
    return mapped.filter((item) => item.answer);
  }

  private mapTemplatesWithAnswers(
    templates: Array<StoreQuestionTemplate & { answers?: { value: Prisma.JsonValue; storeId: number; questionId: number; createdAt: Date; updatedAt: Date }[] }>,
    storeId: number,
  ): StoreQuestionWithAnswerDto[] {
    return templates.map((template) => {
      const answer = (template.answers ?? []).find((entry) => entry.storeId === storeId) ?? null;
      return {
        template: this.mapTemplate(template),
        answer: answer ? this.mapAnswer(template, answer) : null,
      };
    });
  }

  private mapTemplate(template: StoreQuestionTemplate): StoreQuestionTemplateDto {
    return {
      id: template.id,
      key: template.key,
      label: template.label,
      description: template.description ?? null,
      type: template.type,
      options: this.toOptionList(template.options),
      isActive: template.isActive,
      order: template.order ?? null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private mapAnswer(
    template: StoreQuestionTemplate,
    answer: {
      value: Prisma.JsonValue;
      storeId: number;
      questionId: number;
      createdAt: Date;
      updatedAt: Date;
    },
  ): StoreQuestionAnswerResponseDto {
    return {
      questionId: answer.questionId,
      questionKey: template.key,
      storeId: answer.storeId,
      value: answer.value as Record<string, any>,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
    };
  }

  private normalizeOptions(
    options?: StoreQuestionOptionDto[] | null,
  ): StoreQuestionOptionDto[] | null {
    if (options === undefined || options === null) return options ?? null;
    if (!Array.isArray(options)) {
      throw new BadRequestException('Options must be an array.');
    }

    const normalized: StoreQuestionOptionDto[] = [];
    const seen = new Set<string>();

    for (const option of options) {
      const value = option.value?.trim();
      const label = option.label?.trim();
      if (!value || !label) {
        throw new BadRequestException('Option value and label are required.');
      }
      if (seen.has(value)) {
        throw new BadRequestException(`Duplicate option value "${value}".`);
      }
      seen.add(value);
      normalized.push({ value, label });
    }

    return normalized;
  }

  private toOptionList(
    options: Prisma.JsonValue | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull | null,
  ): StoreQuestionOptionDto[] | null {
    if (!options) return null;
    if (options === Prisma.DbNull || options === Prisma.JsonNull) return null;
    if (!Array.isArray(options)) return null;

    return options
      .map((opt) => {
        if (
          typeof opt === 'object' &&
          opt !== null &&
          'value' in opt &&
          'label' in opt
        ) {
          const value = (opt as any).value;
          const label = (opt as any).label;
          if (typeof value === 'string' && typeof label === 'string') {
            return { value, label };
          }
        }
        return null;
      })
      .filter((opt): opt is StoreQuestionOptionDto => Boolean(opt));
  }

  private buildOptionsInput(
    type: StoreQuestionType,
    options: StoreQuestionOptionDto[] | null,
  ): Prisma.InputJsonValue | Prisma.NullTypes.DbNull {
    if (type === StoreQuestionType.TEXT) {
      return Prisma.DbNull;
    }
    if (!options || !options.length) {
      return Prisma.DbNull;
    }
    return options as unknown as Prisma.InputJsonValue;
  }

  private validateOptionsForType(
    type: StoreQuestionType,
    options: StoreQuestionOptionDto[] | null | undefined,
  ) {
    if (type === StoreQuestionType.TEXT) {
      if (options && options.length) {
        throw new BadRequestException('TEXT questions cannot have options.');
      }
      return;
    }

    if (!options || !options.length) {
      throw new BadRequestException('Options are required for select questions.');
    }
  }

  private hasProvidedAnswer(answer: UpsertStoreQuestionAnswerDto): boolean {
    const text = answer.text?.trim();
    if (text && text.length > 0) {
      return true;
    }

    const value = answer.value?.trim();
    if (value && value.length > 0) {
      return true;
    }

    const values = Array.isArray(answer.values)
      ? answer.values
          .map((val) => (typeof val === 'string' ? val.trim() : ''))
          .filter((val) => val.length > 0)
      : [];
    return values.length > 0;
  }

  private buildAnswerValue(
    template: StoreQuestionTemplate,
    answer: { text?: string; value?: string; values?: string[] },
  ): Prisma.InputJsonValue {
    const options = this.toOptionList(template.options) ?? [];

    switch (template.type) {
      case StoreQuestionType.TEXT: {
        const text = answer.text?.trim();
        if (!text) {
          throw new BadRequestException(
            `Answer for question ${template.id} is required.`,
          );
        }
        return { text };
      }
      case StoreQuestionType.SINGLE_SELECT: {
        const value = answer.value?.trim();
        if (!value) {
          throw new BadRequestException(
            `Answer for question ${template.id} is required.`,
          );
        }
        this.ensureOptionExists(value, options, template.id);
        return { value };
      }
      case StoreQuestionType.MULTI_SELECT: {
        const values = Array.from(
          new Set((answer.values ?? []).map((val) => (typeof val === 'string' ? val.trim() : ''))),
        ).filter((val) => val.length > 0);

        if (!values.length) {
          throw new BadRequestException(
            `At least one answer is required for question ${template.id}.`,
          );
        }

        for (const val of values) {
          this.ensureOptionExists(val, options, template.id);
        }
        return { values };
      }
      default:
        throw new BadRequestException('Unsupported question type.');
    }
  }

  private ensureOptionExists(
    value: string,
    options: StoreQuestionOptionDto[],
    questionId: number,
  ) {
    const exists = options.some((opt) => opt.value === value);
    if (!exists) {
      throw new BadRequestException(
        `Value "${value}" is not valid for question ${questionId}.`,
      );
    }
  }
}
