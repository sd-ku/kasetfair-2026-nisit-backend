import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
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
import { CreateStoreDto } from './dto/create-store.dto';
import { StoreResponseDto } from './dto/store-response.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreService } from './store.service';
import { AccessTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';
import { user } from 'src/auth/entities/access-token.entity'

type AuthenticatedRequest = Request & { user };

@ApiTags('Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new store for the authenticated user.' })
  @ApiCreatedResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload.' })
  @ApiConflictResponse({
    description: 'Store already exists or unique constraint violation.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateStoreDto,
  ): Promise<StoreResponseDto> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user id context.');
    }
    const myGmail = req.user?.email;
    if (!myGmail) {
      throw new UnauthorizedException('Missing user gmail context.');
    }
    return this.storeService.createForUser(nisitId, myGmail, dto);
  }

  @Get('info')
  @ApiOperation({ summary: 'Retrieve store details linked to the user.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async getInfo(
    @Req() req: AuthenticatedRequest,
  ): Promise<StoreResponseDto> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeService.getInfo(userId);
  }

  @Patch('info')
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
}
