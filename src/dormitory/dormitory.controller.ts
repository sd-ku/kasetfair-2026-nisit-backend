import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { DormitoryService } from './dormitory.service';
import { CreateDormitoryDto } from './dto/create-dormitory.dto';
import { UpdateDormitoryDto } from './dto/update-dormitory.dto';
import { DormitoryResponseDto } from './dto/dormitory-response.dto';
import { ListDormitoryQueryDto } from './dto/list-dormitory.query';

@ApiTags('Dormitory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/dormitories')
export class DormitoryController {
  constructor(private readonly dormitoryService: DormitoryService) {}

  // @Post()
  // @ApiOperation({ summary: 'Create a dormitory type.' })
  // @ApiCreatedResponse({ type: DormitoryResponseDto })
  // create(@Body() dto: CreateDormitoryDto): Promise<DormitoryResponseDto> {
  //   return this.dormitoryService.create(dto);
  // }

  @Get()
  @ApiOperation({ summary: 'List dormitory types.' })
  @ApiOkResponse({ type: DormitoryResponseDto, isArray: true })
  findAll(
    @Query() query: ListDormitoryQueryDto,
  ): Promise<DormitoryResponseDto[]> {
    return this.dormitoryService.findAll(query.activeOnly);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a dormitory type by id.' })
  @ApiOkResponse({ type: DormitoryResponseDto })
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DormitoryResponseDto> {
    return this.dormitoryService.findOne(id);
  }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update a dormitory type.' })
  // @ApiOkResponse({ type: DormitoryResponseDto })
  // update(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() dto: UpdateDormitoryDto,
  // ): Promise<DormitoryResponseDto> {
  //   return this.dormitoryService.update(id, dto);
  // }

  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete a dormitory type.' })
  // @ApiOkResponse({ type: DormitoryResponseDto })
  // remove(
  //   @Param('id', ParseIntPipe) id: number,
  // ): Promise<DormitoryResponseDto> {
  //   return this.dormitoryService.remove(id);
  // }
}
