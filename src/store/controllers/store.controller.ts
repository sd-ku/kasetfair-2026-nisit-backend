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
import { CreateStoreRequestDto, CreateStoreResponseDto } from 'src/store/dto/create-store.dto';
import { StoreResponseDto } from 'src/store/dto/store-response.dto';
import { UpdateDraftStoreRequestDto } from 'src/store/dto/update-store.dto';
import { StoreService } from 'src/store/services/store.service';
import { AccessTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';
import { user } from 'src/auth/entities/access-token.entity'
import { StoreStatusResponseDto } from 'src/store/dto/store-state.dto';
import { StoreType } from '@generated/prisma';
import { UpdateClubInfoRequestDto } from 'src/store/dto/update-clubInfo.dto';
import { CreateGoodDto, GoodsResponseDto, UpdateGoodDto } from 'src/store/dto/goods.dto';
import { StorePendingValidationResponseDto } from 'src/store/dto/store-validation.dto';

type AuthenticatedRequest = Request & { user };

// store.types.ts
export type DraftStep = 'create-store' | 'club-info' | 'store-details' | 'product-details'

@ApiTags('Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}
  
  @Patch('mine/club-info')
  @ApiOperation({ summary: 'Update club info for the authenticated user store.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid club info payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async updateMyClubInfo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateClubInfoRequestDto, // ใช้ DTO ของ club info แทน UpdateDraftStoreRequestDto
  ) {
    // console.log(dto)
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.updateClubInfo(nisitId, dto);
  }

  @Patch('mine')
  @ApiOperation({ summary: 'Update club info for the authenticated user store.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid club info payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async updateMyStore(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateClubInfoRequestDto, // ใช้ DTO ของ club info แทน UpdateDraftStoreRequestDto
  ) {
    // console.log(dto)
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.updateClubInfo(nisitId, dto);
  }

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Retrieve store details linked to the user.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async getMyStore(
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
}