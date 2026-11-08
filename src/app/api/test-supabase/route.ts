import { NextResponse } from 'next/server';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL หรือ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local',
    });
  }

  try {
    const supabase = getSupabaseClient();

    // 1. Check orders table
    const ordersCheck = await supabase.from('orders').select('id').limit(1);
    if (ordersCheck.error) {
      return NextResponse.json({
        configured: true,
        success: false,
        error: `ตาราง orders: ${ordersCheck.error.message}`,
        hint: 'โปรดรันสคริปต์ supabase-schema.sql ใน SQL Editor บน Supabase Dashboard',
      });
    }

    // 2. Check expenses table
    const expensesCheck = await supabase.from('expenses').select('id').limit(1);
    if (expensesCheck.error) {
      return NextResponse.json({
        configured: true,
        success: false,
        error: `ตาราง expenses: ${expensesCheck.error.message}`,
        hint: 'โปรดรันสคริปต์ supabase-schema.sql ใน SQL Editor บน Supabase Dashboard',
      });
    }

    // 3. Check storage bucket 'receipts'
    let storageStatus = 'พร้อมใช้งาน (Public Bucket)';
    const { error: bucketError } = await supabase.storage.from('receipts').list('', { limit: 1 });
    if (bucketError) {
      storageStatus = `แจ้งเตือน: ไม่สามารถเข้าถึง Bucket receipts (${bucketError.message})`;
    }

    return NextResponse.json({
      configured: true,
      success: true,
      message: 'เชื่อมต่อ Supabase สำเร็จสมบูรณ์ 100%!',
      database: 'Connected',
      storage: storageStatus,
    });
  } catch (err: any) {
    return NextResponse.json({
      configured: true,
      success: false,
      error: err.message || String(err),
    });
  }
}
