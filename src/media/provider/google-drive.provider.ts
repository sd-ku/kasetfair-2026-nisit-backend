// google-drive.provider.ts
import { Injectable } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';

@Injectable()
export class GoogleDriveProvider {
  private drive: drive_v3.Drive;

  constructor() {
    // อ่านคีย์จาก env (เก็บแบบ JSON string)
    const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64!;
    const raw = Buffer.from(b64, 'base64').toString('utf8');
    const creds = JSON.parse(raw);
    if (creds.private_key?.includes('\\n')) {
        creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/drive.file'], // แนะนำ: จำกัด scope
    });
    this.drive = google.drive({ version: 'v3', auth });
  }

  client() {
    return this.drive;
  }
}
