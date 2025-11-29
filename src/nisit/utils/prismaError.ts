import {
    BadRequestException,
    ConflictException,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

type KnownReqErr = Prisma.PrismaClientKnownRequestError;

/**
 * Base class สำหรับ Nisit Service ที่มี error handling สำหรับ Prisma
 */
export abstract class NisitPrismaErrorHandler {
    /**
     * ดึง field names ที่เกิด error จาก Prisma error object
     */
    protected extractTargets(error: KnownReqErr): string[] {
        const out: string[] = [];
        const m = error.meta ?? {};

        // Prisma ชอบใส่ target ได้หลายรูปแบบ ขอสแกนหลายจุด
        const candidates: any[] = [
            m.target, // string | string[] | { fields: string[] } (บาง adapter)
            m.fields, // บางเวอร์ชัน
            m.field_name, // บางกรณี P2003
            (m.constraint as any)?.fields, // adapter pg
        ].filter(Boolean);

        for (const c of candidates) {
            if (Array.isArray(c)) out.push(...c.map(String));
            else if (typeof c === 'string') out.push(c);
            else if (c && Array.isArray(c.fields)) out.push(...c.fields.map(String));
        }

        // เผื่อไม่มี meta ที่มีประโยชน์ ลองเดาด้วย constraint name / message
        const raw =
            ((m?.constraint as any)?.name as string | undefined) ?? error.message ?? '';
        // ดึง field แบบง่าย ๆ จากชื่อ index เช่น "nisit_email_key"
        if (raw) {
            const lower = raw.toLowerCase();
            if (lower.includes('nisitid')) out.push('nisitId');
            if (lower.includes('email')) out.push('email');
            if (lower.includes('phone')) out.push('phone');
        }

        // normalize + unique
        return Array.from(new Set(out.map((t) => String(t).trim())));
    }

    /**
     * แปลง Prisma error เป็น NestJS HttpException ที่เหมาะสม
     */
    protected transformPrismaError(error: unknown): Error {
        // จัดการเฉพาะ Prisma error ที่รู้จักก่อน
        if (this.isPrismaKnownRequestError(error)) {
            switch (error.code) {
                // unique constraint
                case 'P2002': {
                    const targets = this.extractTargets(error).map((t) =>
                        t.toLowerCase(),
                    );

                    if (targets.some((t) => t.includes('nisitid'))) {
                        return new ConflictException(
                            'รหัสนิสิตนี้มีอยู่ในระบบแล้ว',
                        );
                    }
                    if (targets.some((t) => t.includes('email'))) {
                        return new ConflictException(
                            'อีเมลนี้ถูกใช้งานแล้ว โปรดใช้อีเมลอื่น',
                        );
                    }
                    if (targets.some((t) => t.includes('phone'))) {
                        return new ConflictException(
                            'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว โปรดใช้เบอร์อื่น',
                        );
                    }

                    // ฟิลด์อื่น ๆ
                    const label = targets.length ? targets.join(', ') : 'unique field';
                    return new ConflictException(`ข้อมูลซ้ำในฟิลด์: ${label}`);
                }

                // record not found
                case 'P2025': {
                    const cause =
                        (error.meta?.cause as string | undefined) ?? 'ไม่พบข้อมูลนิสิต';
                    return new NotFoundException(cause);
                }

                // foreign key constraint
                case 'P2003': {
                    const fieldName = error.meta?.field_name as string | undefined;
                    if (fieldName?.includes('dormitoryTypeId')) {
                        return new BadRequestException('ไม่พบประเภทหอพักที่เลือก');
                    }
                    if (fieldName?.includes('nisitCardMediaId')) {
                        return new BadRequestException('ไม่พบไฟล์รูปภาพที่อัปโหลด');
                    }
                    return new BadRequestException('ข้อมูลอ้างอิงไม่ถูกต้อง');
                }

                default:
                    // Prisma error แต่เราไม่แมปเฉพาะ → ให้เป็น 500 DB error ไป
                    return new InternalServerErrorException(
                        'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล',
                    );
            }
        }

        // ไม่ใช่ Prisma แต่เป็น Error ปกติ → ปล่อยผ่าน
        if (this.isStandardError(error)) {
            return error;
        }

        // ไม่รู้ก็ห่อเป็น 500 ให้เลย
        return new InternalServerErrorException('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }

    /**
     * ตรวจสอบว่า error เป็น Prisma error หรือไม่
     */
    protected isPrismaKnownRequestError(
        error: unknown,
    ): error is Prisma.PrismaClientKnownRequestError {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            typeof (error as { code: unknown }).code === 'string'
        );
    }

    /**
     * ตรวจสอบว่า error เป็น standard Error object หรือไม่
     */
    protected isStandardError(error: unknown): error is Error {
        return (
            typeof error === 'object' && error !== null && 'message' in error
        );
    }
}