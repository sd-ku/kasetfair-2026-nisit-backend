import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Application health check.' })
  @ApiOkResponse({ description: 'Returns a simple hello message.', schema: { example: 'Hello World!' } })
  getHello(): string {
    return this.appService.getHello();
  }
}
