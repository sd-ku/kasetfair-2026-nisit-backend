import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateStoreRequestDto, CreateStoreResponseDto } from './dto/create-store.dto';
import { StoreResponseDto } from './dto/store-response.dto';
import { UpdateDraftStoreDto } from './dto/update-store.dto';
import { StoreService } from './store.service';
import { AccessTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';
import { user } from 'src/auth/entities/access-token.entity'
import { StoreStatusResponseDto } from './dto/store-state.dto';
import { StoreType } from '@generated/prisma';
import { UpdateClubInfoRequestDto } from './dto/update-clubInfo.dto';
import { CreateGoodDto, GoodsResponseDto, UpdateGoodDto } from './dto/goods.dto';
import { StorePendingValidationResponseDto } from './dto/store-validation.dto';

type AuthenticatedRequest = Request & { user };

// store.types.ts
export type DraftStep = 'create-store' | 'club-info' | 'store-details' | 'product-details'

@ApiTags('Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new store for the authenticated user.' })
  @ApiCreatedResponse({ type: CreateStoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload.' })
  @ApiConflictResponse({
    description: 'Store already exists or unique constraint violation.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateStoreRequestDto,
  ): Promise<CreateStoreResponseDto> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user id context.');
    }
    const myGmail = req.user?.email;
    if (!myGmail) {
      throw new UnauthorizedException('Missing user gmail context.');
    }
    // console.log(dto)
    const res = await this.storeService.createForUser(nisitId, myGmail, dto);
    // console.log(res)
    return res;
  }
  
  @Patch('mine/draft')
  @ApiOperation({ summary: 'Update store details for the user.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'No valid fields provided.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async updateInfo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateDraftStoreDto,
  ): Promise<StoreResponseDto> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeService.updateStoreInfo(userId, dto);
  }

  @Patch('mine/club-info')
  @ApiOperation({ summary: 'Update club info for the authenticated user store.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid club info payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async updateMyClubInfo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateClubInfoRequestDto, // ใช้ DTO ของ club info แทน UpdateDraftStoreDto
  ) {
    // console.log(dto)
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.updateClubInfo(nisitId, dto);
  }

  @Get('mine/draft')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Retrieve store draft or details linked to the current user.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async getStoreDraft(
    @Req() req: AuthenticatedRequest,
    @Query('step') step?: string
  ) {
    if (!step) {
      throw new UnauthorizedException('Missing step context.')
    }

    const nisitId = req.user?.nisitId
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.')
    }
    
    const allowedSteps = ['create-store', 'club-info', 'store-details', 'product-details']
    if (!allowedSteps.includes(step)) {
      throw new UnauthorizedException(`Invalid step "${step}"`)
    }

    const store = await this.storeService.getStoreStatus(nisitId)
    if (!store) throw new NotFoundException('Store not found');

    if (step == "create-store") {
      const memberEmails = await this.storeService.getStoreMemberEmailsByStoreId(store.id)
      const storeDraft = {
        ...store,
        memberEmails: memberEmails
      }
      return storeDraft
    } else if (step == "club-info" && store.type == StoreType.Club) {
      const memberEmails = await this.storeService.getStoreMemberEmailsByStoreId(store.id)
      const storeDraft = {
        ...store,
        memberEmails: memberEmails
      }
      return storeDraft
    }
  }

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Retrieve store details linked to the user.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async getStoreStatus(
    @Req() req: AuthenticatedRequest,
    @Query('include') include?: string
  ) {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    const store = await this.storeService.getStoreStatus(nisitId);
    
    const draftState = ['CreateStore', 'ClubInfo', 'StoreDetails', 'ProductDetails']
    if (draftState.includes(store.state)) {
      return this.storeService.getStoreDraft(store, nisitId)
    }

    return store
  }

  @Get('mine/commit')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Validate the current store before moving to pending state.' })
  @ApiOkResponse({ type: StorePendingValidationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async validateBeforePending(
    @Req() req: AuthenticatedRequest,
  ): Promise<StorePendingValidationResponseDto> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeService.commitStoreForPending(nisitId);
  }

  @Get('goods')
  @ApiOperation({ summary: 'List all goods for the authenticated user store.' })
  @ApiOkResponse({ type: GoodsResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async listGoods(@Req() req: AuthenticatedRequest): Promise<GoodsResponseDto[]> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeService.listGoods(nisitId);
  }

  @Post('goods')
  @ApiOperation({ summary: 'Create a good for the authenticated user store.' })
  @ApiCreatedResponse({ type: GoodsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async createGood(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateGoodDto,
  ): Promise<GoodsResponseDto> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeService.createGood(nisitId, dto);
  }

  @Get('goods/:goodId')
  @ApiOperation({ summary: 'Get details for a single good in the user store.' })
  @ApiOkResponse({ type: GoodsResponseDto })
  @ApiNotFoundResponse({ description: 'Good not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiParam({ name: 'goodId', description: 'Identifier of the good.' })
  async getGood(
    @Req() req: AuthenticatedRequest,
    @Param('goodId') goodId: string,
  ): Promise<GoodsResponseDto> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeService.getGood(nisitId, goodId);
  }

  @Patch('goods/:goodId')
  @ApiOperation({ summary: 'Update a good belonging to the user store.' })
  @ApiOkResponse({ type: GoodsResponseDto })
  @ApiBadRequestResponse({ description: 'No valid fields provided.' })
  @ApiNotFoundResponse({ description: 'Good not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiParam({ name: 'goodId', description: 'Identifier of the good.' })
  async updateGood(
    @Req() req: AuthenticatedRequest,
    @Param('goodId') goodId: string,
    @Body() dto: UpdateGoodDto,
  ): Promise<GoodsResponseDto> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeService.updateGood(nisitId, goodId, dto);
  }

  @Delete('goods/:goodId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a good from the user store.' })
  @ApiNoContentResponse({ description: 'Good deleted.' })
  @ApiNotFoundResponse({ description: 'Good not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiParam({ name: 'goodId', description: 'Identifier of the good.' })
  async deleteGood(
    @Req() req: AuthenticatedRequest,
    @Param('goodId') goodId: string,
  ): Promise<void> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    await this.storeService.deleteGood(nisitId, goodId);
  }
}
