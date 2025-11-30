import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { NisitService } from './nisit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { CreateNisitRequestDto } from './dto/create-nisit.dto';
import { UpdateNisitDto } from './dto/update-nisit.dto';

describe('NisitService', () => {
    let service: NisitService;
    let prismaService: PrismaService;
    let consentService: ConsentService;

    const mockPrismaService = {
        nisit: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        userIdentity: {
            findFirst: jest.fn(),
            updateMany: jest.fn(),
        },
        media: {
            update: jest.fn(),
        },
    };

    const mockConsentService = {
        recordNisitConsent: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NisitService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: ConsentService,
                    useValue: mockConsentService,
                },
            ],
        }).compile();

        service = module.get<NisitService>(NisitService);
        prismaService = module.get<PrismaService>(PrismaService);
        consentService = module.get<ConsentService>(ConsentService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        const validCreateDto: CreateNisitRequestDto = {
            nisitId: 'b6512345',
            firstName: 'สมชาย',
            lastName: 'ใจดี',
            phone: '0812345678',
            email: 'somchai.j@ku.th',
            dormitoryTypeId: 1,
            nisitCardMediaId: 'media-123',
            consentAccepted: true,
            consentTextId: 'consent-123',
        };

        const mockNisit = {
            id: 'uuid-123',
            nisitId: 'b6512345',
            firstName: 'สมชาย',
            lastName: 'ใจดี',
            phone: '0812345678',
            email: 'somchai.j@ku.th',
            dormitoryTypeId: 1,
            nisitCardMediaId: 'media-123',
        };

        it('should successfully register a new nisit', async () => {
            mockPrismaService.nisit.upsert.mockResolvedValue(mockNisit);
            mockConsentService.recordNisitConsent.mockResolvedValue({});
            mockPrismaService.userIdentity.updateMany.mockResolvedValue({ count: 0 });

            const result = await service.register(validCreateDto);

            expect(result).toEqual(mockNisit);
            expect(mockPrismaService.nisit.upsert).toHaveBeenCalledWith({
                where: { nisitId: 'b6512345' },
                update: expect.objectContaining({
                    phone: '0812345678',
                    email: 'somchai.j@ku.th',
                }),
                create: expect.objectContaining({
                    nisitId: 'b6512345',
                    firstName: 'สมชาย',
                    lastName: 'ใจดี',
                }),
            });
            expect(mockConsentService.recordNisitConsent).toHaveBeenCalledWith({
                nisitId: 'b6512345',
                consentTextId: 'consent-123',
                ipAddress: null,
                userAgent: null,
                deviceInfo: null,
            });
        });

        it('should throw BadRequestException if consent is not accepted', async () => {
            const dtoWithoutConsent = { ...validCreateDto, consentAccepted: false };

            await expect(service.register(dtoWithoutConsent)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.register(dtoWithoutConsent)).rejects.toThrow(
                'You must accept the consent text before registration.',
            );
        });

        it('should throw ConflictException if email already exists', async () => {
            const prismaError = {
                code: 'P2002',
                meta: { target: ['email'] },
                message: 'Unique constraint failed',
            };
            mockPrismaService.nisit.upsert.mockRejectedValue(prismaError);

            await expect(service.register(validCreateDto)).rejects.toThrow(
                ConflictException,
            );
            await expect(service.register(validCreateDto)).rejects.toThrow(
                'อีเมลนี้ถูกใช้งานแล้ว โปรดใช้อีเมลอื่น',
            );
        });

        it('should throw ConflictException if phone already exists', async () => {
            const prismaError = {
                code: 'P2002',
                meta: { target: ['phone'] },
                message: 'Unique constraint failed',
            };
            mockPrismaService.nisit.upsert.mockRejectedValue(prismaError);

            await expect(service.register(validCreateDto)).rejects.toThrow(
                ConflictException,
            );
            await expect(service.register(validCreateDto)).rejects.toThrow(
                'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว โปรดใช้เบอร์อื่น',
            );
        });

        it('should throw ConflictException if nisitId already exists', async () => {
            const prismaError = {
                code: 'P2002',
                meta: { target: ['nisitId'] },
                message: 'Unique constraint failed',
            };
            mockPrismaService.nisit.upsert.mockRejectedValue(prismaError);

            await expect(service.register(validCreateDto)).rejects.toThrow(
                ConflictException,
            );
            await expect(service.register(validCreateDto)).rejects.toThrow(
                'รหัสนิสิตนี้มีอยู่ในระบบแล้ว',
            );
        });
    });

    describe('getNisitInfoBySubId', () => {
        const mockNisit = {
            id: 'uuid-123',
            nisitId: 'b6512345',
            firstName: 'สมชาย',
            lastName: 'ใจดี',
            phone: '0812345678',
            email: 'somchai.j@ku.th',
            nisitCardMediaId: 'media-123',
        };

        it('should return nisit info when found', async () => {
            mockPrismaService.userIdentity.findFirst.mockResolvedValue({
                providerSub: 'google-123',
                provider: 'google',
                providerEmail: 'somchai.j@ku.th',
                info: mockNisit,
            });

            const result = await service.getNisitInfoBySubId('google-123');

            expect(result).toEqual({
                nisitId: 'b6512345',
                firstName: 'สมชาย',
                lastName: 'ใจดี',
                phone: '0812345678',
                email: 'somchai.j@ku.th',
                nisitCardMediaId: 'media-123',
            });
        });

        it('should throw NotFoundException when nisit not found', async () => {
            mockPrismaService.userIdentity.findFirst.mockResolvedValue(null);

            await expect(service.getNisitInfoBySubId('google-123')).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.getNisitInfoBySubId('google-123')).rejects.toThrow(
                'Nisit not Found',
            );
        });

        it('should throw NotFoundException when userIdentity has no info', async () => {
            mockPrismaService.userIdentity.findFirst.mockResolvedValue({
                providerSub: 'google-123',
                provider: 'google',
                providerEmail: 'somchai.j@ku.th',
                info: null,
            });

            await expect(service.getNisitInfoBySubId('google-123')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('updateInfo', () => {
        const mockNisit = {
            id: 'uuid-123',
            nisitId: 'b6512345',
            firstName: 'สมชาย',
            lastName: 'ใจดี',
            phone: '0812345678',
            email: 'somchai.j@ku.th',
            nisitCardMediaId: 'media-123',
            dormitoryTypeId: 1,
            storeId: null,
        };

        const updateDto: UpdateNisitDto = {
            firstName: 'สมชาย',
            lastName: 'รักดี',
            phone: '0898765432',
        };

        it('should successfully update nisit info', async () => {
            mockPrismaService.nisit.findUnique.mockResolvedValue(mockNisit);
            mockPrismaService.nisit.update.mockResolvedValue({
                ...mockNisit,
                ...updateDto,
            });

            const result = await service.updateInfo('b6512345', updateDto);

            expect(result.lastName).toBe('รักดี');
            expect(result.phone).toBe('0898765432');
            expect(mockPrismaService.nisit.update).toHaveBeenCalledWith({
                where: { nisitId: 'b6512345' },
                data: expect.objectContaining({
                    firstName: 'สมชาย',
                    lastName: 'รักดี',
                    phone: '0898765432',
                }),
            });
        });

        it('should throw NotFoundException if nisit not found', async () => {
            mockPrismaService.nisit.findUnique.mockResolvedValue(null);

            await expect(service.updateInfo('b6512345', updateDto)).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.updateInfo('b6512345', updateDto)).rejects.toThrow(
                'Nisit not found',
            );
        });

        it('should throw BadRequestException if no fields to update', async () => {
            await expect(service.updateInfo('b6512345', {})).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.updateInfo('b6512345', {})).rejects.toThrow(
                'No fields provided to update',
            );
        });

        it('should delete old nisit card media when updating with new media', async () => {
            const updateWithNewMedia: UpdateNisitDto = {
                nisitCardMediaId: 'new-media-456',
            };

            mockPrismaService.nisit.findUnique.mockResolvedValue(mockNisit);
            mockPrismaService.nisit.update.mockResolvedValue({
                ...mockNisit,
                nisitCardMediaId: 'new-media-456',
            });
            mockPrismaService.media.update.mockResolvedValue({});

            await service.updateInfo('b6512345', updateWithNewMedia);

            expect(mockPrismaService.media.update).toHaveBeenCalledWith({
                where: { id: 'media-123' },
                data: { status: 'DELETE' },
            });
        });

        it('should throw ConflictException if phone already exists', async () => {
            const prismaError = {
                code: 'P2002',
                meta: { target: ['phone'] },
                message: 'Unique constraint failed',
            };

            mockPrismaService.nisit.findUnique.mockResolvedValue(mockNisit);
            mockPrismaService.nisit.update.mockRejectedValue(prismaError);

            await expect(service.updateInfo('b6512345', updateDto)).rejects.toThrow(
                ConflictException,
            );
            await expect(service.updateInfo('b6512345', updateDto)).rejects.toThrow(
                'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว โปรดใช้เบอร์อื่น',
            );
        });
    });

    describe('Error Handling from Base Class', () => {
        it('should handle P2003 foreign key error for dormitoryTypeId', async () => {
            const prismaError = {
                code: 'P2003',
                meta: { field_name: 'dormitoryTypeId' },
                message: 'Foreign key constraint failed',
            };

            const createDto: CreateNisitRequestDto = {
                nisitId: 'b6512345',
                firstName: 'สมชาย',
                lastName: 'ใจดี',
                phone: '0812345678',
                email: 'somchai.j@ku.th',
                dormitoryTypeId: 999, // ไม่มีในระบบ
                consentAccepted: true,
                consentTextId: 'consent-123',
            };

            mockPrismaService.nisit.upsert.mockRejectedValue(prismaError);

            await expect(service.register(createDto)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.register(createDto)).rejects.toThrow(
                'ไม่พบประเภทหอพักที่เลือก',
            );
        });

        it('should handle P2003 foreign key error for nisitCardMediaId', async () => {
            const prismaError = {
                code: 'P2003',
                meta: { field_name: 'nisitCardMediaId' },
                message: 'Foreign key constraint failed',
            };

            const createDto: CreateNisitRequestDto = {
                nisitId: 'b6512345',
                firstName: 'สมชาย',
                lastName: 'ใจดี',
                phone: '0812345678',
                email: 'somchai.j@ku.th',
                dormitoryTypeId: 1,
                nisitCardMediaId: 'invalid-media-id',
                consentAccepted: true,
                consentTextId: 'consent-123',
            };

            mockPrismaService.nisit.upsert.mockRejectedValue(prismaError);

            await expect(service.register(createDto)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.register(createDto)).rejects.toThrow(
                'ไม่พบไฟล์รูปภาพที่อัปโหลด',
            );
        });

        it('should handle P2025 record not found error', async () => {
            const prismaError = {
                code: 'P2025',
                meta: { cause: 'Record to update not found' },
                message: 'Record not found',
            };

            mockPrismaService.nisit.findUnique.mockResolvedValue({
                id: 'uuid-123',
                nisitId: 'b6512345',
                firstName: 'สมชาย',
                lastName: 'ใจดี',
                phone: '0812345678',
                email: 'somchai.j@ku.th',
                nisitCardMediaId: null,
                dormitoryTypeId: null,
                storeId: null,
            });
            mockPrismaService.nisit.update.mockRejectedValue(prismaError);

            await expect(
                service.updateInfo('b6512345', { firstName: 'Test' }),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
