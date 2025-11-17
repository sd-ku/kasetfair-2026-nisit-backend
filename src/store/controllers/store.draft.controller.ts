import {
  Body,
  Controller,
  Get,
  Header,
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
import { StoreDraftService } from 'src/store/services/store.draft.service';
import { StorePendingValidationResponseDto } from 'src/store/dto/store-validation.dto';

type AuthenticatedRequest = Request & { user };

// store.types.ts
export type DraftStep = 'create-store' | 'club-info' | 'store-details' | 'product-details'

@ApiTags('Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/store')
export class StoreDraftController {
  constructor(private readonly storeDraftService: StoreDraftService) {}

  @Post('mine/draft')
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
    const res = await this.storeDraftService.createForUser(nisitId, myGmail, dto);
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
    @Body() dto: UpdateDraftStoreRequestDto,
  ) {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context.');
    }
    return this.storeDraftService.updateMyDraftStore(nisitId, dto);
  }

  @Get('mine/draft')
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

    const store = await this.storeDraftService.getStoreStatus(nisitId);
    
    const draftState = ['CreateStore', 'ClubInfo', 'StoreDetails', 'ProductDetails']
    if (draftState.includes(store.state)) {
      return this.storeDraftService.getStoreDraft(store, nisitId)
    }

    return this.storeDraftService.getStoreDraft(store, nisitId)
  }

  @Get('mine/draft/commit')
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
    return this.storeDraftService.commitStoreForPending(nisitId);
  }
}
