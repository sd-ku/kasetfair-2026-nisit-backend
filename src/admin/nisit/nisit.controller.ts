import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NisitService } from './nisit.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { AdminGuard } from '../admin.guard';

@Controller('api/admin/nisit')
@UseGuards(JwtAuthGuard, AdminGuard)
export class NisitController {
    constructor(private readonly nisitService: NisitService) { }

    @Get()
    async findAll(
        @Query('search') search?: string,
        @Query('sort') sort: 'id' | 'name' = 'id',
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('status') status?: 'NotFound' | 'ProfileNotCompleted' | 'DuplicateStore' | 'Invited' | 'Joined' | 'Declined',
    ) {
        return this.nisitService.findAll(search, sort, +page, +limit, status);
    }

    @Get('stats')
    async getStats() {
        return this.nisitService.getStats();
    }
}
