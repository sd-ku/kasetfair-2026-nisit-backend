# Store Search API Documentation

## Endpoint
`GET /api/admin/store`

## Description
ค้นหาร้านค้าด้วยชื่อร้าน, ID ร้าน และเลข booth พร้อมกับการกรองตาม status และ type

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | ค้นหาจากชื่อร้าน (storeName), เลข booth (boothNumber), หรือ ID ร้าน (id) |
| `status` | StoreState | No | กรองตาม status ของร้าน |
| `type` | StoreType | No | กรองตามประเภทร้าน (Nisit/Club) |
| `page` | number | No | หน้าที่ต้องการ (default: 1) |
| `limit` | number | No | จำนวนรายการต่อหน้า (default: 10) |

## Search Behavior

การค้นหาด้วย `search` parameter จะทำการค้นหาแบบ **OR** จากฟิลด์ต่อไปนี้:

1. **ชื่อร้าน (storeName)**: ค้นหาแบบ partial match, case-insensitive
   - ตัวอย่าง: `search=ร้านกาแฟ` จะหาร้านที่มีคำว่า "ร้านกาแฟ" ในชื่อ

2. **เลข booth (boothNumber)**: ค้นหาแบบ partial match, case-insensitive
   - ตัวอย่าง: `search=A12` จะหาบูธที่มี "A12" ในเลขบูธ

3. **ID ร้าน (id)**: ค้นหาแบบ exact match (เฉพาะเมื่อ search เป็นตัวเลข)
   - ตัวอย่าง: `search=123` จะหาร้านที่มี ID = 123

## Examples

### ตัวอย่างที่ 1: ค้นหาด้วยชื่อร้าน
```
GET /api/admin/store?search=ร้านกาแฟ
```

### ตัวอย่างที่ 2: ค้นหาด้วยเลข booth
```
GET /api/admin/store?search=A12
```

### ตัวอย่างที่ 3: ค้นหาด้วย ID ร้าน
```
GET /api/admin/store?search=123
```

### ตัวอย่างที่ 4: ค้นหาพร้อมกรอง status
```
GET /api/admin/store?search=ร้านกาแฟ&status=Validated
```

### ตัวอย่างที่ 5: ค้นหาพร้อม pagination
```
GET /api/admin/store?search=ร้านกาแฟ&page=2&limit=20
```

## Response Format

```json
{
  "data": [
    {
      "id": 123,
      "storeName": "ร้านกาแฟสดใส",
      "boothNumber": "A12",
      "type": "Nisit",
      "state": "Validated",
      "storeAdmin": { ... },
      "members": [ ... ],
      "goods": [ ... ],
      ...
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

## Notes

- การค้นหาจะทำงานแบบ case-insensitive สำหรับชื่อร้านและเลข booth
- หากค้นหาด้วยตัวเลข จะค้นหาทั้งจาก ID (exact match), ชื่อร้าน และเลข booth
- สามารถใช้ search ร่วมกับ status และ type filter ได้
- ผลลัพธ์จะเรียงตาม ID จากน้อยไปมาก
