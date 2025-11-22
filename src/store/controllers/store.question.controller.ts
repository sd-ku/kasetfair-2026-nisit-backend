import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import {
  CreateStoreQuestionTemplateDto,
  StoreQuestionTemplateDto,
  StoreQuestionWithAnswerDto,
  UpdateStoreQuestionTemplateDto,
  UpsertStoreQuestionAnswersDto,
} from '../dto/store-question.dto';
import { StoreQuestionService } from '../services/store.question.service';

type AuthenticatedRequest = Request & { user };

@ApiTags('Store')
@Controller('api/store')
export class StoreQuestionController {
  constructor(private readonly storeQuestionService: StoreQuestionService) {}

  // @Get('questions/templates')
  // @ApiOperation({ summary: 'List store question templates.' })
  // @ApiOkResponse({ type: StoreQuestionTemplateDto, isArray: true })
  // async listTemplates(
  //   @Query('includeInactive') includeInactive?: string,
  // ): Promise<StoreQuestionTemplateDto[]> {
  //   const includeInactiveBool = includeInactive === 'true' || includeInactive === '1';
  //   return this.storeQuestionService.listTemplates(includeInactiveBool);
  // }

  // @Post('questions/templates')
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: 'Create a store question template.' })
  // @ApiCreatedResponse({ type: StoreQuestionTemplateDto })
  // @ApiBadRequestResponse({ description: 'Invalid template payload.' })
  // @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  // async createTemplate(
  //   @Body() dto: CreateStoreQuestionTemplateDto,
  // ): Promise<StoreQuestionTemplateDto> {
  //   return this.storeQuestionService.createTemplate(dto);
  // }

  // @Patch('questions/templates/:id')
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: 'Update a store question template.' })
  // @ApiOkResponse({ type: StoreQuestionTemplateDto })
  // @ApiBadRequestResponse({ description: 'Invalid template payload.' })
  // @ApiNotFoundResponse({ description: 'Template not found.' })
  // @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  // async updateTemplate(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() dto: UpdateStoreQuestionTemplateDto,
  // ): Promise<StoreQuestionTemplateDto> {
  //   return this.storeQuestionService.updateTemplate(id, dto);
  // }

  @Get('questions/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List templates with answers for the authenticated store.' })
  @ApiOkResponse({ type: StoreQuestionWithAnswerDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async getMyQuestions(
    @Req() req: AuthenticatedRequest,
  ): Promise<StoreQuestionWithAnswerDto[]> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeQuestionService.getMyQuestions(nisitId);
  }

  @Patch('questions/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upsert answers for the authenticated store.' })
  @ApiOkResponse({ type: StoreQuestionWithAnswerDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid answer payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async upsertMyAnswers(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpsertStoreQuestionAnswersDto,
  ): Promise<StoreQuestionWithAnswerDto[]> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeQuestionService.upsertMyAnswers(nisitId, dto);
  }

  // @Get(':storeId/questions')
  // @ApiOperation({ summary: 'List answered questions for a store (public).' })
  // @ApiOkResponse({ type: StoreQuestionWithAnswerDto, isArray: true })
  // @ApiNotFoundResponse({ description: 'Store not found.' })
  // async getStoreQuestions(
  //   @Param('storeId', ParseIntPipe) storeId: number,
  // ): Promise<StoreQuestionWithAnswerDto[]> {
  //   return this.storeQuestionService.getPublicAnswersForStore(storeId);
  // }
}
