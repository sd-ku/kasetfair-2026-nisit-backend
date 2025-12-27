import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from '../admin.guard';
import { RegistrationService } from './registration.service';
import {
    UpdateRegistrationSettingsDto,
    RegistrationSettingsResponseDto,
} from './dto/registration-settings.dto';

@ApiTags('Admin - Registration Settings')
@ApiBearerAuth()
@Controller('api/admin/registration')
@UseGuards(JwtAuthGuard, AdminGuard)
export class RegistrationController {
    constructor(private readonly registrationService: RegistrationService) { }

    @Get('settings')
    @ApiOperation({ summary: 'Get current registration settings' })
    @ApiOkResponse({ type: RegistrationSettingsResponseDto })
    async getSettings(): Promise<RegistrationSettingsResponseDto> {
        return this.registrationService.getSettings();
    }

    @Patch('settings')
    @ApiOperation({ summary: 'Update registration settings' })
    @ApiOkResponse({ type: RegistrationSettingsResponseDto })
    async updateSettings(
        @Body() dto: UpdateRegistrationSettingsDto,
    ): Promise<RegistrationSettingsResponseDto> {
        return this.registrationService.updateSettings(dto);
    }
}
