import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    UpdateRegistrationSettingsDto,
    RegistrationSettingsResponseDto,
} from './dto/registration-settings.dto';

@Injectable()
export class RegistrationService {
    constructor(private readonly prisma: PrismaService) { }

    async getSettings(): Promise<RegistrationSettingsResponseDto> {
        let settings = await this.prisma.registrationSettings.findFirst({
            orderBy: { updatedAt: 'desc' },
        });

        // ถ้ายังไม่มีการตั้งค่า สร้างค่าเริ่มต้น
        if (!settings) {
            settings = await this.prisma.registrationSettings.create({
                data: {
                    isManuallyLocked: false,
                    lockMessage: 'ขณะนี้หมดเวลาลงทะเบียนแล้ว กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย',
                },
            });
        }

        return {
            ...settings,
            registrationStart: settings.registrationStart ?? undefined,
            registrationEnd: settings.registrationEnd ?? undefined,
            isCurrentlyLocked: this.checkIfLocked(settings),
        };
    }

    async updateSettings(
        dto: UpdateRegistrationSettingsDto,
    ): Promise<RegistrationSettingsResponseDto> {
        let settings = await this.prisma.registrationSettings.findFirst({
            orderBy: { updatedAt: 'desc' },
        });

        const updateData: any = {};

        if (dto.isManuallyLocked !== undefined) {
            updateData.isManuallyLocked = dto.isManuallyLocked;
        }

        if (dto.registrationStart !== undefined) {
            updateData.registrationStart = dto.registrationStart
                ? new Date(dto.registrationStart)
                : null;
        }

        if (dto.registrationEnd !== undefined) {
            updateData.registrationEnd = dto.registrationEnd
                ? new Date(dto.registrationEnd)
                : null;
        }

        if (dto.lockMessage !== undefined) {
            updateData.lockMessage = dto.lockMessage;
        }

        if (settings) {
            settings = await this.prisma.registrationSettings.update({
                where: { id: settings.id },
                data: updateData,
            });
        } else {
            settings = await this.prisma.registrationSettings.create({
                data: {
                    isManuallyLocked: false,
                    lockMessage: 'ขณะนี้หมดเวลาลงทะเบียนแล้ว กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย',
                    ...updateData,
                },
            });
        }

        return {
            ...settings,
            registrationStart: settings.registrationStart ?? undefined,
            registrationEnd: settings.registrationEnd ?? undefined,
            isCurrentlyLocked: this.checkIfLocked(settings),
        };
    }

    private checkIfLocked(settings: any): boolean {
        if (settings.isManuallyLocked) {
            return true;
        }

        if (settings.registrationStart && settings.registrationEnd) {
            const now = new Date();
            const isBeforeStart = now < settings.registrationStart;
            const isAfterEnd = now > settings.registrationEnd;
            return isBeforeStart || isAfterEnd;
        }

        return false;
    }
}
