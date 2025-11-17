import { 
  Injectable,
  NotFoundException,
  BadRequestException,
  } from '@nestjs/common';
import { CreateConsentDto } from './dto/create-consent.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { GetConsentDto } from './dto/get-consent.dto';
import { ConsentRepository } from './consent.repository';

@Injectable()
export class ConsentService {
  constructor(private readonly consentRepository: ConsentRepository) {}

  async getConsentText(
    language: string = 'th',
    isActive: boolean = true
  ): Promise<GetConsentDto> {
    const consentText = await this.consentRepository.findConsentByLanguageAndStatus(language, isActive);
    if (!consentText) {
      throw new NotFoundException('Consent text not found');
    }

    return {
      id: consentText.id,
      version: consentText.version,
      language: consentText.language,
      title: consentText.title,
      consent: consentText.content,
    };
  }

  async recordNisitConsent(params: {
    nisitId: string;
    consentTextId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceInfo?: string | null;
  }) {
    const { nisitId, consentTextId, ipAddress, userAgent, deviceInfo } = params;

    // เช็คว่า consentText มีจริง + (optional) เป็น active ด้วย
    const consentText = await this.consentRepository.findConsentTextById(consentTextId);

    if (!consentText || !consentText.active) {
      throw new BadRequestException('Invalid or inactive consent text.');
    }

    // บันทึก log
    return this.consentRepository.recordNisitConsent({
      nisitId,
      consentTextId,
      accepted: true,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      deviceInfo: deviceInfo || null,
    });
  }
}
