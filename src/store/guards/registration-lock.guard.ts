import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RegistrationLockGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // ถ้าเป็น admin route ให้ผ่านได้เลย
        if (request.url?.includes('/admin/')) {
            return true;
        }

        // ดึงการตั้งค่าล่าสุด
        const settings = await this.prisma.registrationSettings.findFirst({
            orderBy: { updatedAt: 'desc' },
        });

        // ถ้าไม่มีการตั้งค่า ให้เปิดได้ตามปกติ
        if (!settings) {
            return true;
        }

        const now = new Date();

        // ตรวจสอบว่า manual lock หรือไม่
        if (settings.isManuallyLocked) {
            throw new ForbiddenException({
                message: settings.lockMessage,
                code: 'REGISTRATION_LOCKED',
            });
        }

        // ตรวจสอบช่วงเวลาลงทะเบียน
        if (settings.registrationStart && settings.registrationEnd) {
            const isBeforeStart = now < settings.registrationStart;
            const isAfterEnd = now > settings.registrationEnd;

            if (isBeforeStart || isAfterEnd) {
                throw new ForbiddenException({
                    message: settings.lockMessage,
                    code: 'REGISTRATION_LOCKED',
                    registrationStart: settings.registrationStart,
                    registrationEnd: settings.registrationEnd,
                });
            }
        }

        return true;
    }
}
