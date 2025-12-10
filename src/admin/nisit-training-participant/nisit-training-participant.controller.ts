import { Controller, Get, Post, Body, Delete, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { AdminGuard } from '../admin.guard';
import { NisitTrainingParticipantService } from './nisit-training-participant.service';
import { UpsertNisitTrainingParticipantDto } from './dto/upsert-participant.dto';

@ApiTags('api/admin/nisit-training-participant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/nisit-training-participant')
export class NisitTrainingParticipantController {
    constructor(private readonly service: NisitTrainingParticipantService) { }

    @Get()
    @ApiOperation({ summary: 'Get all participants' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiQuery({ name: 'id', required: false, type: String, description: 'Search by Nisit ID' })
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
        @Query('id') id?: string,
    ) {
        return this.service.findAll({
            page: Number(page),
            limit: Number(limit),
            nisitId: id
        });
    }

    @Post()
    @ApiOperation({ summary: 'Upsert participant (Create or Update)' })
    upsert(@Body() dto: UpsertNisitTrainingParticipantDto) {
        return this.service.upsert(dto);
    }

    @Delete('delete-all')
    @ApiOperation({ summary: 'Delete all participants from the table' })
    deleteAll() {
        return this.service.deleteAll();
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remove participant' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }

    @Post('upsert-bulk')
    @ApiOperation({ summary: 'Bulk upsert participants from array of Nisit IDs' })
    upsertBulk(@Body() nisitIds: string[]) {
        return this.service.upsertBulk(nisitIds);
    }
}
