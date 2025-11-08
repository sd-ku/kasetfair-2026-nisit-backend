// provider/google-drive.provider.ts
import { Injectable } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';

function loadCredsFromEnv() {
  const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!b64 && !json) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_BASE64 or GOOGLE_APPLICATION_CREDENTIALS_JSON');
  }

  let creds: any;
  if (b64) {
    const raw = Buffer.from(b64.replace(/\s+/g, ''), 'base64').toString('utf8');
    creds = JSON.parse(raw);
  } else {
    creds = JSON.parse(json!);
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error('Invalid service account creds: missing client_email/private_key');
  }
  // normalize newline
  if (typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  return creds;
}

@Injectable()
export class GoogleDriveProvider {
  private drive: drive_v3.Drive;

  constructor() {
    const creds = loadCredsFromEnv();

    // ใช้ scope จาก ENV ถ้าให้มา ไม่งั้น default = drive (เพื่อให้เห็นโฟลเดอร์ที่แชร์)
    // ถ้าคุณย้ายไปใช้โฟลเดอร์ที่ SA เป็นคนสร้างเอง ค่อยปรับกลับเป็น drive.file ได้
    const scope = process.env.GDRIVE_SCOPE ?? 'https://www.googleapis.com/auth/drive';

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: [scope],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  client() {
    return this.drive;
  }
}
