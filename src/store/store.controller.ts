import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  NotFoundException,
  UseGuards,
  Header,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateStoreRequestDto, CreateStoreResponseDto } from './dto/create-store.dto';
import { StoreResponseDto } from './dto/store-response.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreService } from './store.service';
import { AccessTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';
import { user } from 'src/auth/entities/access-token.entity'
import { StoreStatusResponseDto } from './dto/store-state.dto';
import { StoreType } from '@generated/prisma';

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
  
  @Patch('mine')
  @ApiOperation({ summary: 'Update store details for the user.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'No valid fields provided.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async updateInfo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeService.updateInfo(userId, dto);
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

    const store = this.storeService.getStoreStatus(nisitId);
    if (include == 'member') {
      
    }
    return store
  }
}
