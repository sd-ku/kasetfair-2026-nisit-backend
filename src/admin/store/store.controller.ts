import { Controller, Get, Query, UseGuards, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { AdminGuard } from '../admin.guard';
import { StoreState, StoreType } from '@prisma/client';
import { UpdateStoreStatusDto } from './dto/update-store-status.dto';

@Controller('api/admin/store')
@UseGuards(JwtAuthGuard, AdminGuard)
export class StoreController {
    constructor(private readonly storeService: StoreService) { }

    @Get()
    async findAll(
        @Query('status') status?: StoreState,
        @Query('type') type?: StoreType,
        @Query('search') search?: string,
        @Query('sort') sort: 'id' | 'name' = 'id',
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.storeService.findAll(status, type, search, sort, +page, +limit);
    }

    @Get('stats')
    async getStats() {
        return this.storeService.getStats();
    }

    @Patch(':id/state')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateStoreStatusDto,
    ) {
        return this.storeService.updateStatus(id, body.targetState);
    }
}

