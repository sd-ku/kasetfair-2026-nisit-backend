# Merge Review Status API

## Overview
API สำหรับ merge status จาก `StoreReviewDraft` เข้าไปใน `Store.state` โดยสามารถเลือกได้ว่าจะ merge แค่ store เดียวหรือทั้งหมด

## Endpoints

### 1. Merge Review Status ทั้งหมด
**POST** `/api/admin/store/merge-review-status`

Merge review status ล่าสุดของทุก store ที่มี review draft เข้าไปใน store state

#### Response
```json
{
  "totalProcessed": 10,
  "successCount": 9,
  "failureCount": 1,
  "results": [
    {
      "storeId": 1,
      "storeName": "ร้านตัวอย่าง",
      "previousState": "Submitted",
      "newState": "Pending",
      "reviewStatus": "Pending",
      "comment": "ผ่านการตรวจสอบอัตโนมัติ รอการจับฉลาก",
      "success": true
    },
    {
      "storeId": 2,
      "storeName": "ร้านตัวอย่าง 2",
      "previousState": "Submitted",
      "newState": "Submitted",
      "reviewStatus": "NeedFix",
      "comment": "ข้อมูลไม่ครบถ้วน:\n1. ต้องมีสมาชิกอย่างน้อย 3 คน",
      "success": true
    }
  ]
}
```

### 2. Merge Review Status ของ Store เดียว
**POST** `/api/admin/store/:id/merge-review-status`

Merge review status ล่าสุดของ store ที่ระบุเข้าไปใน store state

#### Parameters
- `id` (path parameter): Store ID ที่ต้องการ merge

#### Response
```json
{
  "totalProcessed": 1,
  "successCount": 1,
  "failureCount": 0,
  "results": [
    {
      "storeId": 1,
      "storeName": "ร้านตัวอย่าง",
      "previousState": "Submitted",
      "newState": "Pending",
      "reviewStatus": "Pending",
      "comment": "ผ่านการตรวจสอบอัตโนมัติ รอการจับฉลาก",
      "success": true
    }
  ]
}
```

## Status Mapping

การ map จาก `ReviewStatus` ไปเป็น `StoreState`:

| ReviewStatus | StoreState | คำอธิบาย |
|-------------|-----------|---------|
| `Pending` | `Pending` | ผ่านการตรวจสอบ รอจับฉลาก |
| `NeedFix` | `Submitted` | ต้องแก้ไข ส่งกลับไปให้แก้ไข |
| `Rejected` | `Rejected` | ถูกปฏิเสธ |
| `deleted` | `deleted` | ถูกลบ |

## Use Cases

### 1. Merge หลังจาก Validate All
```bash
# 1. Validate stores ทั้งหมด
POST /api/admin/store/validate-all

# 2. Merge review status เข้า store state
POST /api/admin/store/merge-review-status
```

### 2. Merge Store เดียวหลังจาก Review Manual
```bash
# Merge review status ของ store ID 5
POST /api/admin/store/5/merge-review-status
```

## Notes

- API จะเลือก review draft **ล่าสุด** (createdAt desc) ของแต่ละ store มา merge
- ถ้าระบุ store ID แต่ไม่มี review draft จะ return `totalProcessed: 0`
- ถ้า merge ล้มเหลว จะมี `success: false` และ `error` message ใน result
- API ต้องใช้ JWT authentication และ admin guard
