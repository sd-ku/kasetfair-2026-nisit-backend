import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { StoreGoodService } from 'src/store/services/store.good.service';
import { CreateGoodDto, GoodsResponseDto, UpdateGoodDto } from 'src/store/dto/goods.dto';

import { RegistrationLockGuard } from '../guards/registration-lock.guard';

type AuthenticatedRequest = Request & { user };

@ApiTags('Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/store')
export class GoodController {
  constructor(private readonly storeGoodService: StoreGoodService) { }

  @Get('goods')
  @ApiOperation({ summary: 'List all goods for the authenticated user store.' })
  @ApiOkResponse({ type: GoodsResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async listGoods(@Req() req: AuthenticatedRequest): Promise<GoodsResponseDto[]> {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeGoodService.listGoods(nisitId);
  }

  @Post('goods')
  @UseGuards(RegistrationLockGuard)
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
    return this.storeGoodService.createGood(nisitId, dto);
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
    return this.storeGoodService.getGood(nisitId, goodId);
  }

  @Patch('goods/:goodId')
  @UseGuards(RegistrationLockGuard)
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
    return this.storeGoodService.updateGood(nisitId, goodId, dto);
  }

  @Delete('goods/:goodId')
  @HttpCode(204)
  @UseGuards(RegistrationLockGuard)
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
    await this.storeGoodService.deleteGood(nisitId, goodId);
  }
}
