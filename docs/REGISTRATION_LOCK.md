# Registration Lock System

ระบบจัดการการเปิด-ปิดลงทะเบียนสำหรับ Nisit และ Store

## คุณสมบัติ

- ✅ **Manual Lock/Unlock**: Admin สามารถเปิด-ปิดลงทะเบียนได้ทันที
- ✅ **Time-based Lock**: ตั้งเวลาเปิด-ปิดลงทะเบียนอัตโนมัติ
- ✅ **Custom Message**: กำหนดข้อความแจ้งเตือนเมื่อระบบ lock
- ✅ **Admin Bypass**: Admin ยังสามารถแก้ไขข้อมูลได้แม้ระบบ lock

## Endpoints ที่ถูก Lock

### Nisit Endpoints
- `POST /api/nisit/register` - ลงทะเบียน Nisit ใหม่
- `PATCH /api/nisit/info` - แก้ไขข้อมูล Nisit

### Store Endpoints
- `PATCH /api/store/mine` - แก้ไขข้อมูล Store
- `DELETE /api/store/mine/members/me` - ออกจาก Store
- `PATCH /api/store/mine/transfer-admin` - โอนสิทธิ์ Admin

**หมายเหตุ**: Endpoint `GET` ทั้งหมดยังใช้งานได้ตามปกติ

## Admin API

### 1. ดูการตั้งค่าปัจจุบัน

```http
GET /api/admin/registration/settings
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "id": 1,
  "isManuallyLocked": false,
  "registrationStart": "2025-01-01T00:00:00.000Z",
  "registrationEnd": "2025-12-31T23:59:59.999Z",
  "lockMessage": "ขณะนี้หมดเวลาลงทะเบียนแล้ว กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย",
  "isCurrentlyLocked": false,
  "createdAt": "2025-12-27T08:00:00.000Z",
  "updatedAt": "2025-12-27T08:00:00.000Z"
}
```

### 2. อัปเดตการตั้งค่า

```http
PATCH /api/admin/registration/settings
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "isManuallyLocked": false,
  "registrationStart": "2025-01-01T00:00:00.000Z",
  "registrationEnd": "2025-12-31T23:59:59.999Z",
  "lockMessage": "ขณะนี้หมดเวลาลงทะเบียนแล้ว กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย"
}
```

**หมายเหตุ**: ทุก field เป็น optional สามารถส่งเฉพาะที่ต้องการเปลี่ยนแปลง

## ตัวอย่างการใช้งาน

### 1. Lock ระบบทันที (Manual Lock)

```bash
curl -X PATCH http://localhost:3000/api/admin/registration/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isManuallyLocked": true,
    "lockMessage": "ระบบปิดปรับปรุงชั่วคราว กรุณาลองใหม่ภายหลัง"
  }'
```

### 2. Unlock ระบบ

```bash
curl -X PATCH http://localhost:3000/api/admin/registration/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isManuallyLocked": false
  }'
```

### 3. ตั้งเวลาเปิด-ปิดลงทะเบียนอัตโนมัติ

```bash
curl -X PATCH http://localhost:3000/api/admin/registration/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "registrationStart": "2025-01-15T00:00:00.000Z",
    "registrationEnd": "2025-02-28T23:59:59.999Z",
    "lockMessage": "ช่วงเวลาลงทะเบียน: 15 ม.ค. - 28 ก.พ. 2568"
  }'
```

### 4. ยกเลิกการตั้งเวลาอัตโนมัติ

```bash
curl -X PATCH http://localhost:3000/api/admin/registration/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "registrationStart": null,
    "registrationEnd": null
  }'
```

## Logic การ Lock

ระบบจะ lock เมื่อ:

1. **Manual Lock**: `isManuallyLocked = true`
2. **Time-based Lock**: เวลาปัจจุบันอยู่นอกช่วง `registrationStart` ถึง `registrationEnd`

**หมายเหตุ**: Manual Lock มีความสำคัญสูงกว่า Time-based Lock

## Error Response

เมื่อระบบ lock และ Nisit พยายามเข้าถึง endpoint ที่ถูกป้องกัน:

```json
{
  "statusCode": 403,
  "message": "ขณะนี้หมดเวลาลงทะเบียนแล้ว กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย",
  "error": "Forbidden",
  "code": "REGISTRATION_LOCKED",
  "registrationStart": "2025-01-15T00:00:00.000Z",
  "registrationEnd": "2025-02-28T23:59:59.999Z"
}
```

## Database Schema

```prisma
model RegistrationSettings {
  id                Int      @id @default(autoincrement())
  isManuallyLocked  Boolean  @default(false)
  registrationStart DateTime?
  registrationEnd   DateTime?
  lockMessage       String   @default("ขณะนี้หมดเวลาลงทะเบียนแล้ว กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัย")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("registration_settings")
}
```

## การทดสอบ

### 1. ทดสอบว่าระบบ lock ทำงาน

```bash
# Lock ระบบ
curl -X PATCH http://localhost:3000/api/admin/registration/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isManuallyLocked": true}'

# ลอง register (ควรได้ 403)
curl -X POST http://localhost:3000/api/nisit/register \
  -H "Authorization: Bearer YOUR_NISIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nisitId": "6510000000", "firstName": "Test", "lastName": "User"}'
```

### 2. ทดสอบว่า Admin ยังแก้ไขได้

```bash
# Admin ควรแก้ไข Store ได้แม้ระบบ lock
curl -X PATCH http://localhost:3000/api/admin/store/1/state \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetState": "Validated"}'
```

## Tips

- ใช้ `isManuallyLocked` สำหรับการปิดระบบฉุกเฉิน
- ใช้ `registrationStart` และ `registrationEnd` สำหรับการกำหนดช่วงเวลาลงทะเบียน
- สามารถใช้ทั้งสองแบบร่วมกันได้
- ระบบจะสร้างการตั้งค่าเริ่มต้นอัตโนมัติเมื่อเรียก API ครั้งแรก
