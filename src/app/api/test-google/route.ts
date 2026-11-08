import { NextResponse } from 'next/server';
import { getGoogleServices, isGoogleConfigured, ensureSheetsInitialized } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'ยังไม่ได้ตั้งค่า Google Credentials หรือ Spreadsheet ID ใน .env.local หรือ service-account.json',
    });
  }

  try {
    const { sheets, drive, spreadsheetId, folderId } = getGoogleServices();

    // Test Sheets
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const spreadsheetTitle = sheetMeta.data.properties?.title || 'Unknown Spreadsheet';

    // Auto initialize tabs if needed
    await ensureSheetsInitialized(sheets, spreadsheetId);

    // Test Drive if folderId is provided
    let folderName = 'ไม่ได้ระบุ Folder ID (จะบันทึกรูปบิลไว้ที่ My Drive)';
    if (folderId) {
      try {
        const folderMeta = await drive.files.get({
          fileId: folderId,
          fields: 'id, name, mimeType',
        });
        folderName = folderMeta.data.name || folderId;
      } catch (driveErr: any) {
        folderName = `แจ้งเตือน: ไม่สามารถเข้าถึงโฟลเดอร์ Drive (${driveErr.message})`;
      }
    }

    return NextResponse.json({
      configured: true,
      success: true,
      message: 'เชื่อมต่อ Google Sheets และ Google Drive สำเร็จ!',
      spreadsheetTitle,
      spreadsheetId,
      folderName,
      folderId,
    });
  } catch (err: any) {
    console.error('Test Google connection error:', err);
    return NextResponse.json(
      {
        configured: true,
        success: false,
        error: err.message || String(err),
      },
      { status: 500 }
    );
  }
}

