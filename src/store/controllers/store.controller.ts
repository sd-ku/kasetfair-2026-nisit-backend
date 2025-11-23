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

type AuthenticatedRequest = Request & { user };

@ApiTags('Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) { }

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
  @ApiOperation({ summary: 'Update store details for the authenticated user store.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid store payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async updateMyStore(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateStoreRequestDto,
  ): Promise<StoreResponseDto> {
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

  @Get("mine/validation")
  async getMyStoreCompletion(
    @Req() req: AuthenticatedRequest,
  ) {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.validateStoreForPending(nisitId)
  }

  @Patch("mine/transfer-admin")
  async transferStoreAdmin(
    @Req() req: AuthenticatedRequest,
    @Body() dto,
  ) {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeService.transferStoreAdmin(nisitId, dto);
  }

}
