# Admin Store API

## GET /admin/store

ดึงข้อมูล store ทั้งหมดสำหรับแสดงบน admin dashboard

### Authentication
ต้องใช้ Admin Guard (ต้องเป็น ADMIN หรือ SUPER_ADMIN)

### Query Parameters

| Parameter | Type | Required | Description | Values |
|-----------|------|----------|-------------|--------|
| status | string | No | กรองตาม state ของ store | `CreateStore`, `ClubInfo`, `StoreDetails`, `ProductDetails`, `Submitted`, `Pending`, `Validated`, `Success`, `Rejected`, `deleted` |
| type | string | No | กรองตามประเภทของ store | `Nisit`, `Club` |

### Response

```json
{
  "total": 10,
  "stores": [
    {
      "id": 1,
      "storeName": "ร้านตัวอย่าง",
      "boothNumber": "A01",
      "type": "Nisit",
      "state": "Pending",
      "goodType": "Food",
      "storeAdminNisitId": "b6512345",
      "createdAt": "2025-12-09T15:00:00.000Z",
      "updatedAt": "2025-12-09T15:30:00.000Z",
      "storeAdmin": {
        "nisitId": "b6512345",
        "firstName": "สมชาย",
        "lastName": "ใจดี",
        "email": "somchai.j@ku.th",
        "phone": "0812345678",
        "nisitCardMedia": {
          "id": "uuid",
          "link": "https://...",
          "status": "UPLOADED"
        }
      },
      "clubInfo": null,
      "members": [
        {
          "nisitId": "b6512346",
          "firstName": "สมหญิง",
          "lastName": "รักดี",
          "email": "somying.r@ku.th",
          "phone": "0823456789"
        }
      ],
      "memberAttemptEmails": [
        {
          "email": "member1@ku.th",
          "status": "Joined",
          "invitedAt": "2025-12-09T14:00:00.000Z",
          "joinedAt": "2025-12-09T14:30:00.000Z",
          "nisitId": "b6512346"
        }
      ],
      "goods": [
        {
          "id": "uuid",
          "name": "ข้าวผัด",
          "type": "Food",
          "price": "50.00",
          "googleMedia": {
            "id": "uuid",
            "link": "https://...",
            "status": "UPLOADED"
          }
        }
      ],
      "boothMedia": {
        "id": "uuid",
        "link": "https://...",
        "status": "UPLOADED"
      },
      "questionAnswers": [
        {
          "id": 1,
          "value": {"answer": "คำตอบ"},
          "question": {
            "id": 1,
            "key": "question_key",
            "label": "คำถาม",
            "type": "TEXT"
          }
        }
      ],
      "reviewDrafts": [
        {
          "id": "uuid",
          "status": "Pending",
          "comment": "รอการตรวจสอบ",
          "createdAt": "2025-12-09T15:00:00.000Z",
          "updatedAt": "2025-12-09T15:00:00.000Z",
          "admin": {
            "id": "uuid",
            "email": "admin@ku.th",
            "name": "Admin Name",
            "role": "ADMIN"
          }
        }
      ]
    }
  ]
}
```

### Examples

#### ดึงข้อมูล store ทั้งหมด
```bash
GET /admin/store
```

#### กรองตาม status
```bash
GET /admin/store?status=Pending
```

#### กรองตาม type
```bash
GET /admin/store?type=Nisit
```

#### กรองทั้ง status และ type
```bash
GET /admin/store?status=Pending&type=Club
```

### Notes

- ข้อมูลจะถูกเรียงตาม `createdAt` จากใหม่ไปเก่า
- Review drafts จะถูกเรียงตาม `createdAt` จากใหม่ไปเก่า
- ข้อมูลที่ส่งกลับจะรวมข้อมูลทั้งหมดของ store รวมถึง:
  - ข้อมูล admin ของ store
  - ข้อมูล club (ถ้ามี)
  - รายชื่อสมาชิก
  - ประวัติการเชิญสมาชิก
  - รายการสินค้า
  - รูปภาพบูธ
  - คำตอบคำถาม
  - ประวัติการรีวิวจาก admin
