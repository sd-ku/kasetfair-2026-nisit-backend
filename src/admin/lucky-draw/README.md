# Lucky Draw - Wheel of Names Integration

## Overview
This feature integrates with Wheel of Names API to generate lucky draw wheels for stores.

## Architecture Flow

```
Frontend (React)
    ↓ POST /api/admin/lucky-draw/generate-wheel
    ↓ { state: 'Validated' }
    ↓
Backend (NestJS)
    ↓ Query Database (Prisma)
    ↓ Get validated stores
    ↓
    ↓ POST https://wheelofnames.com/api/v2/wheels
    ↓ Header: x-api-key: <API_KEY>
    ↓ Body: { wheelConfig: { title, entries } }
    ↓
Wheel of Names API
    ↓ Returns: { path: "abc123" }
    ↓
Backend
    ↓ Returns: { wheelPath: "abc123", totalStores: 100 }
    ↓
Frontend
    ↓ Updates iframe src to:
    ↓ https://wheelofnames.com/abc123
```

## Setup Instructions

### 1. Get Wheel of Names API Key

1. Visit [Wheel of Names API Documentation](https://wheelofnames.com/api)
2. Sign up or log in to get your API key
3. Copy your API key

### 2. Configure Backend

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Wheel of Names API key to `.env`:
   ```env
   WHEEL_OF_NAMES_API_KEY="your_actual_api_key_here"
   ```

### 3. Test the Integration

1. Start the backend server:
   ```bash
   npm run start:dev
   ```

2. Start the frontend:
   ```bash
   cd ../kasetfair2026-frontend
   npm run dev
   ```

3. Navigate to `/admin/lucky-draw`
4. Click "โหลดรายชื่อร้าน" button
5. The wheel should load with all validated stores

## API Endpoints

### POST `/api/admin/lucky-draw/generate-wheel`

Generate a new wheel with stores from the database.

**Request Body:**
```json
{
  "state": "Validated"  // Optional: Filter by store state
}
```

**Response:**
```json
{
  "wheelPath": "abc123",
  "totalStores": 100
}
```

**Error Responses:**
- `404`: No stores found matching criteria
- `500`: Wheel of Names API error or API key not configured

## Security Notes

⚠️ **IMPORTANT**: 
- The API key is stored in the backend environment variables
- Never expose the API key in frontend code
- The frontend only receives the wheel path, not the API key

## Files Modified

### Backend
- `src/admin/lucky-draw/dto/generate-wheel.dto.ts` - New DTOs
- `src/admin/lucky-draw/lucky-draw.service.ts` - Added `generateWheel()` method
- `src/admin/lucky-draw/lucky-draw.controller.ts` - Added `/generate-wheel` endpoint
- `.env.example` - Added `WHEEL_OF_NAMES_API_KEY`

### Frontend
- `src/services/admin/luckyDrawService.ts` - Added `generateWheel()` function
- `src/app/admin/lucky-draw/page.tsx` - Refactored `handleAutoFill()` to use backend API

## Troubleshooting

### "Wheel of Names API Key is not configured"
- Make sure `WHEEL_OF_NAMES_API_KEY` is set in your `.env` file
- Restart the backend server after adding the key

### "ไม่พบร้านค้าที่ตรงตามเงื่อนไข"
- Check that you have stores with `state = 'Validated'` in the database
- Try removing the state filter by sending an empty request body

### Wheel doesn't load
- Check browser console for errors
- Verify the iframe src is being updated correctly
- Check that the wheelPath returned from the API is valid
