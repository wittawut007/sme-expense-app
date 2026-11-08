import { NextResponse } from 'next/server';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  getAuthenticatedSupabaseClient,
  getAuthUser,
} from '@/lib/supabase';
import { getMockOrders, getMockExpenses } from '@/lib/mockStore';
import { deduceTimelineStep, cleanNote } from '@/lib/orderTimeline';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const isDemoRequested = url.searchParams.get('demo') === 'true';

    // If Supabase is not configured, fall back to mock data
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          isConfigured: false,
          isAuthenticated: false,
          isDemo: true,
          message: 'Supabase Credentials ยังไม่ได้ตั้งค่าใน .env.local (กำลังทำงานในโหมด Demo)',
          orders: getMockOrders(),
          expenses: getMockExpenses(),
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    // Check user authentication
    const { user, token, error: authErr } = await getAuthUser(req);

    // If unauthenticated and requested demo mode
    if (!user && isDemoRequested) {
      return NextResponse.json(
        {
          isConfigured: true,
          isAuthenticated: false,
          isDemo: true,
          message: 'กำลังแสดงข้อมูลตัวอย่าง (โหมด Demo)',
          orders: getMockOrders(),
          expenses: getMockExpenses(),
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    // If unauthenticated and no demo requested
    if (!user) {
      return NextResponse.json(
        {
          isConfigured: true,
          isAuthenticated: false,
          isDemo: false,
          message: 'กรุณาเข้าสู่ระบบเพื่อเข้าถึงข้อมูลร้านค้าของคุณ',
          orders: [],
          expenses: [],
        },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store, max-age=0' },
        }
      );
    }

    // Authenticated user: fetch their specific records
    const supabase = getAuthenticatedSupabaseClient(token);

    // Query user profile & store settings
    let businessName =
      user.user_metadata?.business_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      'ร้านค้าของฉัน';
    let userRole = 'owner';
    let phone = user.user_metadata?.phone || '';
    let address = user.user_metadata?.address || '';
    let taxId = user.user_metadata?.tax_id || '';
    let tagline = user.user_metadata?.tagline || '';
    let categories = user.user_metadata?.categories || null;
    let deliveryMethods = user.user_metadata?.delivery_methods || null;
    let logoUrl =
      user.user_metadata?.logo_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.business_name) businessName = profile.business_name;
        if (profile.role) userRole = profile.role;
        if (profile.phone) phone = profile.phone;
        if (profile.address) address = profile.address;
        if (profile.tax_id) taxId = profile.tax_id;
        if (profile.tagline) tagline = profile.tagline;
      }
    } catch (profErr) {
      // Ignore if profiles table does not exist yet
    }

    // Query strictly user's own orders and expenses
    let ordersRes: any;
    let expensesRes: any;

    try {
      [ordersRes, expensesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
    } catch {
      [ordersRes, expensesRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      ]);
    }

    if (ordersRes?.error) {
      // If error was about user_id column missing, fallback to generic query
      const fallbackRes = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (fallbackRes.error) {
        throw new Error(`ดึงข้อมูล orders ไม่สำเร็จ: ${fallbackRes.error.message}`);
      }
      ordersRes = fallbackRes;
    }

    if (expensesRes?.error) {
      const fallbackRes = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (fallbackRes.error) {
        throw new Error(`ดึงข้อมูล expenses ไม่สำเร็จ: ${fallbackRes.error.message}`);
      }
      expensesRes = fallbackRes;
    }

    const orders = (ordersRes.data || []).map((row: any) => {
      const stepConfig = deduceTimelineStep({
        orderStatus: row.order_status,
        paymentStatus: row.payment_status,
        prodStatus: row.prod_status,
        deliveryStatus: row.delivery_status,
        note: row.note,
      });

      return {
        rowNumber: row.id,
        id: row.id,
        orderDate: row.order_date || '',
        orderId: row.order_id || '',
        customerName: row.customer_name || '',
        phone: row.phone || '',
        address: row.address || '',
        deliveryMethod: row.delivery_method || 'รถกระบะร้าน',
        deliveryDate: row.delivery_date || '',
        productDetails: row.product_details || '',
        totalPrice: Number(row.total_price) || 0,
        deposit: Number(row.deposit) || 0,
        balance: Number(row.balance) || 0,
        orderStatus: stepConfig.name,
        paymentStatus: row.payment_status || stepConfig.legacy.paymentStatus,
        prodStatus: row.prod_status || stepConfig.legacy.prodStatus,
        deliveryStatus: row.delivery_status || stepConfig.legacy.deliveryStatus,
        note: cleanNote(row.note || ''),
      };
    });

    const expenses = (expensesRes.data || []).map((row: any) => ({
      rowNumber: row.id,
      id: row.id,
      billDate: row.bill_date || '',
      month: row.month || (row.bill_date || '').substring(0, 7),
      billNo: row.bill_no || '',
      vendor: row.vendor || '',
      category: row.category || 'เบ็ดเตล็ด/อื่นๆ',
      itemName: row.item_name || '',
      qty: Number(row.qty) || 1,
      unit: row.unit || 'ชิ้น',
      unitPrice: Number(row.unit_price) || 0,
      totalItemPrice: Number(row.total_item_price) || 0,
      paymentMethod: row.payment_method || 'โอนเงิน',
      fileUrl: row.file_url || '',
      note: row.note || '',
    }));

    return NextResponse.json(
      {
        isConfigured: true,
        isAuthenticated: true,
        isDemo: false,
        user: {
          id: user.id,
          email: user.email,
          businessName,
          role: userRole,
          phone,
          address,
          taxId,
          tagline,
          categories,
          deliveryMethods,
          logoUrl,
        },
        orders,
        expenses,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in /api/data:', error);
    return NextResponse.json(
      {
        isConfigured: false,
        isAuthenticated: false,
        error: error.message,
        message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message} (แสดงข้อมูล Demo สำรอง)`,
        orders: getMockOrders(),
        expenses: getMockExpenses(),
      },
      { status: 200 }
    );
  }
}
