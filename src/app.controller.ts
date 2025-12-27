import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

export class RegistrationStatusResponseDto {
  @ApiProperty()
  isLocked: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  registrationStart?: Date;

  @ApiProperty({ required: false })
  registrationEnd?: Date;
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Application health check.' })
  @ApiOkResponse({ description: 'Returns a simple hello message.', schema: { example: 'Hello World!' } })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/registration/status')
  @ApiOperation({ summary: 'Check if registration is currently locked.' })
  @ApiOkResponse({ type: RegistrationStatusResponseDto })
  async getRegistrationStatus(): Promise<RegistrationStatusResponseDto> {
    const settings = await this.prisma.registrationSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings) {
      return {
        isLocked: false,
        message: '',
      };
    }

    let isLocked = false;

    if (settings.isManuallyLocked) {
      isLocked = true;
    } else if (settings.registrationStart && settings.registrationEnd) {
      const now = new Date();
      const isBeforeStart = now < settings.registrationStart;
      const isAfterEnd = now > settings.registrationEnd;
      isLocked = isBeforeStart || isAfterEnd;
    }

    return {
      isLocked,
      message: settings.lockMessage,
      registrationStart: settings.registrationStart ?? undefined,
      registrationEnd: settings.registrationEnd ?? undefined,
    };
  }
}

