// store-validation.dto.ts

import { StoreType, StoreState } from '@prisma/client';

export type StoreValidationSectionKey =
  | 'members'
  | 'clubInfo'
  | 'storeDetail'
  | 'goods'
  | 'training';

export class StoreValidationChecklistItemDto {
  key: string;        // unique key ภายใน section
  label: string;      // ข้อความโชว์ใน UI
  ok: boolean;        // ผ่าน / ไม่ผ่าน
  message?: string;   // ถ้าไม่ผ่าน ใส่ข้อความอธิบาย
}

export class StoreValidationSectionDto {
  key: StoreValidationSectionKey;
  label: string;                            // ชื่อหัวข้อใหญ่ เช่น "ข้อมูลร้านค้า"
  ok: boolean;                              // ผลรวมของทั้ง section
  items: StoreValidationChecklistItemDto[]; // รายการย่อย
}

export class StorePendingValidationResponseDto {
  store: {
    id: number;
    type: StoreType;
    storeName: string;
    state: StoreState;
    boothNumber?: string | null;
    storeAdminNisitId: string | null;
  };

  isValid: boolean; // true = ไม่มี section ไหน ok=false
  sections: StoreValidationSectionDto[];
}
