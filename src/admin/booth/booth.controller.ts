import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { BoothService } from './booth.service';
import {
    ImportBoothRangeDto,
    ImportBoothListDto,
    CreateBoothAssignmentDto,
    VerifyBoothAssignmentDto,
    VerifyByStoreIdDto,
    ForfeitBoothAssignmentDto,
    ManualAssignBoothDto,
    BatchAssignBoothDto,
} from './dto/booth.dto';
import { BoothZone, BoothAssignmentStatus } from '@prisma/client';

@Controller('api/admin/booth')
export class BoothController {
    constructor(private readonly boothService: BoothService) { }

    // ----- Booth Management -----

    /**
     * Import booth แบบ range
     * POST /api/admin/booth/import-range
     * Body: { ranges: [{ prefix: "M", start: 1, end: 20, zone: "FOOD" }] }
     */
    @Post('import-range')
    importBoothRange(@Body() dto: ImportBoothRangeDto) {
        return this.boothService.importBoothRange(dto);
    }

    /**
     * Import booth แบบ list
     * POST /api/admin/booth/import-list
     * Body: { lists: [{ boothNumbers: ["M55", "M60"], zone: "NON_FOOD" }] }
     */
    @Post('import-list')
    importBoothList(@Body() dto: ImportBoothListDto) {
        return this.boothService.importBoothList(dto);
    }

    /**
     * ดึงค่า priority (assignOrder) สูงสุดที่มีอยู่
     * GET /api/admin/booth/last-priority
     */
    @Get('last-priority')
    getLastPriority() {
        return this.boothService.getLastPriority();
    }

    /**
     * ดึง booth ทั้งหมด
     * GET /api/admin/booth?zone=FOOD&isAssigned=true
     */
    @Get()
    findAllBooths(
        @Query('zone') zone?: BoothZone,
        @Query('isAssigned') isAssigned?: string,
    ) {
        const isAssignedBool = isAssigned === 'true' ? true : isAssigned === 'false' ? false : undefined;
        return this.boothService.findAllBooths(zone, isAssignedBool);
    }

    /**
     * ลบ booth
     * DELETE /api/admin/booth/:id
     */
    @Delete(':id')
    deleteBooth(@Param('id', ParseIntPipe) id: number) {
        return this.boothService.deleteBooth(id);
    }

    /**
     * ลบ booth ทั้งหมด
     * DELETE /api/admin/booth/all
     */
    @Delete('all/reset')
    deleteAllBooths() {
        return this.boothService.deleteAllBooths();
    }

    /**
     * อัปเดตลำดับ booth (assignOrder)
     * PUT /api/admin/booth/update-order
     * Body: { booths: [{ id: 1, assignOrder: 1 }, { id: 2, assignOrder: 2 }] }
     */
    @Put('update-order')
    updateBoothOrder(@Body('booths') booths: Array<{ id: number; assignOrder: number }>) {
        return this.boothService.updateBoothOrder(booths);
    }

    // ----- Stats -----

    /**
     * ดึงสถิติ booth
     * GET /api/admin/booth/stats
     */
    @Get('stats')
    getStats() {
        return this.boothService.getStats();
    }

    /**
     * ดึง booth ว่างถัดไปตาม zone
     * GET /api/admin/booth/next/:zone
     */
    @Get('next/:zone')
    getNextAvailableBooth(@Param('zone') zone: BoothZone) {
        return this.boothService.getNextAvailableBooth(zone);
    }

    // ----- Assignment Management -----

    /**
     * ดึง assignments ทั้งหมด
     * GET /api/admin/booth/assignments?zone=FOOD&status=PENDING
     */
    @Get('assignments')
    findAllAssignments(
        @Query('zone') zone?: BoothZone,
        @Query('status') status?: BoothAssignmentStatus,
    ) {
        return this.boothService.findAllAssignments(zone, status);
    }

    /**
     * ดึง assignment ตาม ID
     * GET /api/admin/booth/assignments/:id
     */
    @Get('assignments/:id')
    findAssignmentById(@Param('id', ParseIntPipe) id: number) {
        return this.boothService.findAssignmentById(id);
    }

    /**
     * ดึง pending assignment ล่าสุด
     * GET /api/admin/booth/assignments/pending/latest?zone=FOOD
     */
    @Get('assignments/pending/latest')
    getLatestPendingAssignment(@Query('zone') zone?: BoothZone) {
        return this.boothService.getLatestPendingAssignment(zone);
    }

    /**
     * สร้าง assignment ใหม่ (เมื่อสุ่มได้ร้าน)
     * POST /api/admin/booth/assignments
     * Body: { storeId: 123, luckyDrawEntryId?: 456 }
     */
    @Post('assignments')
    createAssignment(@Body() dto: CreateBoothAssignmentDto) {
        return this.boothService.createAssignment(dto);
    }

    /**
     * ยืนยัน assignment ด้วย barcode
     * POST /api/admin/booth/assignments/verify
     * Body: { barcode: "20065105035316", assignmentId: 1 }
     */
    @Post('assignments/verify')
    verifyAssignment(@Body() dto: VerifyBoothAssignmentDto) {
        return this.boothService.verifyAssignment(dto);
    }

    /**
     * ยืนยัน assignment ด้วย barcode โดยระบุ storeId
     * POST /api/admin/booth/assignments/verify-by-store
     * Body: { barcode: "20065105035316", storeId: 123 }
     */
    @Post('assignments/verify-by-store')
    verifyByStoreId(@Body() dto: VerifyByStoreIdDto) {
        return this.boothService.verifyByStoreId(dto);
    }

    /**
     * สละสิทธิ์ assignment
     * POST /api/admin/booth/assignments/forfeit
     * Body: { assignmentId: 1, reason?: "ไม่มายืนยัน" }
     */
    @Post('assignments/forfeit')
    forfeitAssignment(@Body() dto: ForfeitBoothAssignmentDto) {
        return this.boothService.forfeitAssignment(dto);
    }

    /**
     * สุ่มใหม่สำหรับร้านที่ยังไม่มี booth
     * POST /api/admin/booth/assignments/re-draw/:storeId
     */
    @Post('assignments/re-draw/:storeId')
    reDrawForStore(@Param('storeId', ParseIntPipe) storeId: number) {
        return this.boothService.reDrawForStore(storeId);
    }

    /**
     * Manual assign booth สำหรับร้านที่ระบุ (ไม่ผ่านการจับฉลาก)
     * POST /api/admin/booth/assignments/manual
     * Body: { storeId: 123, note?: "Assigned manually" }
     */
    @Post('assignments/manual')
    manualAssignBooth(@Body() dto: ManualAssignBoothDto) {
        return this.boothService.manualAssignBooth(dto.storeId, dto.note);
    }

    /**
     * Batch assign booths สำหรับหลายร้านพร้อมกัน
     * POST /api/admin/booth/assignments/batch
     * Body: { storeIds: [123, 456, 789], note?: "Batch assignment" }
     */
    @Post('assignments/batch')
    batchAssignBooths(@Body() dto: BatchAssignBoothDto) {
        return this.boothService.batchAssignBooths(dto.storeIds, dto.note);
    }

    /**
     * ค้นหาร้านจาก nisit barcode
     * POST /api/admin/booth/lookup-store
     * Body: { barcode: "20065105035316" }
     */
    @Post('lookup-store')
    findStoreByNisitBarcode(@Body('barcode') barcode: string) {
        return this.boothService.findStoreByNisitBarcode(barcode);
    }
}
