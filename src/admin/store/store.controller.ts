import { Controller, Get, Query, UseGuards, Patch, Param, Body, ParseIntPipe, Post, Request } from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { AdminGuard } from '../admin.guard';
import { StoreState, StoreType, ReviewStatus } from '@prisma/client';
import { UpdateStoreStatusDto } from './dto/update-store-status.dto';

@Controller('api/admin/store')
@UseGuards(JwtAuthGuard, AdminGuard)
export class StoreController {
    constructor(private readonly storeService: StoreService) { }

    @Get()
    async findAll(
        @Query('status') status?: StoreState,
        @Query('type') type?: StoreType,
        @Query('reviewStatus') reviewStatus?: any, // We will cast or import ReviewStatus if possible, or string. Better to use strict type if possible.
        @Query('search') search?: string,
        @Query('sort') sort: 'id' | 'name' = 'id',
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.storeService.findAll(status, type, reviewStatus, search, sort, +page, +limit);
    }

    @Get('stats')
    async getStats() {
        return this.storeService.getStats();
    }

    @Patch(':id/state')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateStoreStatusDto,
        @Request() req: any,
    ) {
        const adminId = req.user.userId;
        return this.storeService.updateStatus(id, body.targetState, adminId);
    }

    @Post('validate-all')
    async validateAllStores(@Request() req: any) {
        const adminId = req.user.userId;
        return this.storeService.validateAllStores(adminId);
    }

    @Post(':id/validate')
    async validateSingleStore(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any
    ) {
        const adminId = req.user.userId;
        return this.storeService.validateSingleStore(id, adminId);
    }

    @Post('merge-review-status')
    async mergeAllReviewStatus() {
        return this.storeService.mergeReviewStatus();
    }

    @Post(':id/merge-review-status')
    async mergeSingleReviewStatus(@Param('id', ParseIntPipe) id: number) {
        return this.storeService.mergeReviewStatus(id);
    }
}

