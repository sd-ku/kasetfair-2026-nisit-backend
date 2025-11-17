import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { StoreResponseDto } from 'src/store/dto/store-response.dto';
import { UpdateStoreRequestDto } from 'src/store/dto/update-store.dto';
import { StoreService } from 'src/store/services/store.service';
import { UpdateClubInfoRequestDto } from 'src/store/dto/update-clubInfo.dto';
import { CreateClubInfoRequestDto } from '../dto/create-clubInfo.dto';

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
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.updateClubInfo(nisitId, dto);
  }

  @Post('mine/club-info')
  @ApiOperation({ summary: 'Create club info for the authenticated user store.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid club info payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async createMyClubInfo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateClubInfoRequestDto, // ใช้ DTO ของ club info แทน UpdateDraftStoreRequestDto
  ) {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.createClubInfoFirstTime(nisitId, dto);;
  }

  @Get('mine/club-info')
  @ApiOperation({ summary: 'Get club info for the authenticated user store.' })
  // @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid club info payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async getMyClubInfo(
    @Req() req: AuthenticatedRequest,
  ) {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.getClubInfo(nisitId);
  }

  @Delete('mine/members/me')
  @ApiOperation({ summary: 'Leave the current store as the authenticated member.' })
  @ApiOkResponse({
    type: StoreResponseDto,
    description: 'Updated store after the member has left.',
  })
  @ApiBadRequestResponse({
    description: 'User is not a member of any store or cannot leave the store.',
  })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async leaveMyStore(@Req() req: AuthenticatedRequest): Promise<void> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    await this.storeService.leaveMyStore(nisitId);
  }

  @Patch('mine')
  @ApiOperation({ summary: 'Update club info for the authenticated user store.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid club info payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async updateMyStore(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateStoreRequestDto,
  ): Promise<StoreResponseDto> {
    // console.log(dto)
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.updateStore(nisitId, dto);
  }

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Retrieve store details linked to the user.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async getMyStore(
    @Req() req: AuthenticatedRequest,
  ): Promise<StoreResponseDto> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.getMyStore(nisitId);
  }
}
