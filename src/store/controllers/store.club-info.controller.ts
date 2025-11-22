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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { StoreResponseDto } from 'src/store/dto/store-response.dto';
import { UpdateClubInfoRequestDto } from 'src/store/dto/update-clubInfo.dto';
import { CreateClubInfoRequestDto } from 'src/store/dto/create-clubInfo.dto';
import { StoreClubInfoService } from 'src/store/services/store.club-info.service';

type AuthenticatedRequest = Request & { user };

@ApiTags('Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/store')
export class StoreClubInfoController {
  constructor(private readonly storeClubInfoService: StoreClubInfoService) {}

  @Patch('mine/club-info')
  @ApiOperation({ summary: 'Update club info for the authenticated user store.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid club info payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async updateMyClubInfo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateClubInfoRequestDto,
  ) {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeClubInfoService.updateClubInfo(nisitId, dto);
  }

  @Post('mine/club-info')
  @ApiOperation({ summary: 'Create club info for the authenticated user store.' })
  @ApiOkResponse({ type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid club info payload.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async createMyClubInfo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateClubInfoRequestDto,
  ) {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.storeClubInfoService.createClubInfoFirstTime(nisitId, dto);
  }

  @Get('mine/club-info')
  @ApiOperation({ summary: 'Get club info for the authenticated user store.' })
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

    return this.storeClubInfoService.getClubInfo(nisitId);
  }
}

