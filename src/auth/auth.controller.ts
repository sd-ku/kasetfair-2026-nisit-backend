// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Res,
  Req,
  UseGuards,
  Get
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ExchangeDto, ExchangeResponeDto } from './dto/exchange.dto';
import { getAuthStatusRequestDto } from '../nisit/dto/status.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('exchange')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a Google ID token for an application access token.' })
  @ApiHeader({
    name: 'authorization',
    description: 'Bearer <google_id_token>',
    required: false,
  })
  @ApiBody({ type: ExchangeDto })
  @ApiOkResponse({
    description: 'Successful exchange result.',
    schema: {
      example: {
        status: 'linked',
        userId: '6501234567',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        profileComplete: true,
        missing: [],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Google id_token.' })
  async exchange(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: ExchangeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ExchangeResponeDto> {
    const result = await this.authService.exchange({ authHeader, body, res });

    return result;
  }
}
