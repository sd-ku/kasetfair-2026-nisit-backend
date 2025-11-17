import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ConsentService } from './consent.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';

@Controller('api/consent-text')
@UseGuards(JwtAuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('')
  getConsent(@Req() req) {
    const email = req.user?.email;
    if (!email) {
      throw new UnauthorizedException('Missing user context.');
    }

    return this.consentService.getConsentText();
  }
}
