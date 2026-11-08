import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export const ORDER_TAB_NAME = 'คำสั่งซื้อลูกค้า';
export const EXPENSE_TAB_NAME = 'บันทึกค่าใช้จ่าย';

export const ORDER_HEADERS = [
  'วันที่สั่งซื้อ',
  'เลขที่คำสั่งซื้อ',
  'ชื่อลูกค้า',
  'เบอร์โทร',
  'ที่อยู่จัดส่ง',
  'วิธีจัดส่ง',
  'วันที่นัดส่ง',
  'รายละเอียดสินค้า',
  'ยอดรวมทั้งสิ้น',
  'มัดจำ',
  'คงเหลือ',
  'สถานะชำระเงิน',
  'สถานะการผลิต',
  'สถานะจัดส่ง',
  'หมายเหตุ',
];

export const EXPENSE_HEADERS = [
  'วันที่บิล',
  'รอบเดือน',
  'เลขที่บิล',
  'ร้านค้า/ผู้ขาย',
  'หมวดหมู่',
  'รายการสินค้า',
  'จำนวน',
  'หน่วย',
  'ราคาต่อหน่วย',
  'รวมเงิน',
  'ช่องทางชำระ',
  'ลิงก์รูปบิล',
  'หมายเหตุ',
];

export function isGoogleConfigured(): boolean {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const hasSheet =
    typeof sheetId === 'string' &&
    sheetId.trim() !== '' &&
    !sheetId.startsWith('your_');

  if (!hasSheet) return false;

  // 1. Service account file in root
  const keyPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(keyPath)) return true;

  // 2. Service account env vars
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
  if (
    GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    !GOOGLE_SERVICE_ACCOUNT_EMAIL.startsWith('your_') &&
    GOOGLE_PRIVATE_KEY &&
    !GOOGLE_PRIVATE_KEY.startsWith('your_')
  ) {
    return true;
  }

  // 3. OAuth 2.0 env vars
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  const hasOAuth = [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN].every(
    (val) => typeof val === 'string' && val.trim() !== '' && !val.startsWith('your_')
  );

  return hasOAuth;
}

export function getGoogleServices() {
  if (!isGoogleConfigured()) {
    throw new Error('GOOGLE_CONFIG_MISSING: กรุณาตั้งค่า Google Sheet ID และ Credentials ใน .env.local หรือ service-account.json ก่อนเริ่มใช้งาน');
  }

  let authClient: any;
  const keyPath = path.join(process.cwd(), 'service-account.json');

  if (fs.existsSync(keyPath)) {
    authClient = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
  } else if (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.startsWith('your_') &&
    process.env.GOOGLE_PRIVATE_KEY &&
    !process.env.GOOGLE_PRIVATE_KEY.startsWith('your_')
  ) {
    authClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
  } else {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    authClient = oauth2Client;
  }

  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const drive = google.drive({ version: 'v3', auth: authClient });

  return {
    sheets,
    drive,
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  };
}

/**
 * Automatically creates and initializes sheet tabs and headers if missing
 */
export async function ensureSheetsInitialized(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles: string[] = (meta.data.sheets || []).map(
      (s: any) => s.properties?.title || ''
    );

    const requests: any[] = [];
    if (!existingTitles.includes(ORDER_TAB_NAME)) {
      requests.push({
        addSheet: {
          properties: { title: ORDER_TAB_NAME },
        },
      });
    }
    if (!existingTitles.includes(EXPENSE_TAB_NAME)) {
      requests.push({
        addSheet: {
          properties: { title: EXPENSE_TAB_NAME },
        },
      });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }

    // Now verify header rows
    const checkHeaders = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: [`${ORDER_TAB_NAME}!A1:O1`, `${EXPENSE_TAB_NAME}!A1:M1`],
    });

    const orderHeaderRow = checkHeaders.data.valueRanges?.[0]?.values?.[0] || [];
    const expenseHeaderRow = checkHeaders.data.valueRanges?.[1]?.values?.[0] || [];

    const updateData: any[] = [];
    if (orderHeaderRow.length === 0) {
      updateData.push({
        range: `${ORDER_TAB_NAME}!A1:O1`,
        values: [ORDER_HEADERS],
      });
    }
    if (expenseHeaderRow.length === 0) {
      updateData.push({
        range: `${EXPENSE_TAB_NAME}!A1:M1`,
        values: [EXPENSE_HEADERS],
      });
    }

    if (updateData.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updateData,
        },
      });
    }
  } catch (err) {
    console.error('ensureSheetsInitialized error:', err);
    throw err;
  }
}
