import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateNisitRequestDto } from './dto/create-nisit.dto';
import { UpdateNisitDto } from './dto/update-nisit.dto';
import { NisitResponseDto } from './dto/nisit-response.dto';
import { NisitService } from './nisit.service';
import { AuthService } from 'src/auth/services/auth.service';
import { getAuthStatusRequestDto, getAuthStatusResponeDto } from './dto/status.dto';
import type { Response } from 'express';


type AuthenticatedRequest = Request & { user?: { userId?: string, email?: string, profileComplete?: boolean } };

@ApiTags('Nisit')
@UseGuards(JwtAuthGuard)
@Controller('api/nisit')
export class NisitController {
  constructor(
    private readonly nisitService: NisitService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new Nisit profile.' })
  @ApiCreatedResponse({ type: NisitResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload.' })
  @ApiConflictResponse({ description: 'Duplicate nisit_id, email, or phone.' })
  async register(@Req() req, @Res({ passthrough: true }) res: Response): Promise<NisitResponseDto> {
    const email = req.user.email;
    const payload = req.body

    if (!email) {
      throw new UnauthorizedException("invalid gmail");
    }
    if (!payload) {
      throw new UnauthorizedException("invalid payload");
    }

    const nisitRes = await this.nisitService.register({ ...payload, email });

    console.log('Nisit registered:', nisitRes);

    this.authService.issueAccessTokenForIdentity({
      providerSub: req.user.userId,
      nisitId: nisitRes.nisitId,
      firstName: nisitRes.firstName,
      lastName: nisitRes.lastName,
      phone: nisitRes.phone,
      providerEmail: req.user.email,
    }, res);

    return nisitRes;
  }

  @UseGuards(JwtAuthGuard)
  @Get('info')
  @ApiOperation({ summary: 'Retrieve the authenticated Nisit profile.' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: NisitResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getInfo(@Req() req: AuthenticatedRequest) {
    console.log(`req.user from get info: `)
    console.log(req.user)
    const userId = req.user?.userId
    if (!userId) {
      throw new UnauthorizedException("Invalid providerSubId")
    }
    return this.nisitService.getNisitInfoBySubId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('info')
  @ApiOperation({ summary: 'Update the authenticated Nisit profile.' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: NisitResponseDto })
  @ApiBadRequestResponse({ description: 'No valid fields provided.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateInfo(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateNisitDto,
  ): Promise<NisitResponseDto> {
    const nisitId = this.extractNisitId(req);
    return this.nisitService.updateInfo(nisitId, dto);
  }

  private extractNisitId(req: any): string {
    const nisitId = req.user?.nisitId;
    if (!nisitId) {
      throw new UnauthorizedException('Missing user context');
    }
    return nisitId;
  }
}
