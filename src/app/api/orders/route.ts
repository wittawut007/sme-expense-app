import { NextResponse } from 'next/server';
import {
  isSupabaseConfigured,
  getAuthenticatedSupabaseClient,
  getAuthUser,
} from '@/lib/supabase';
import {
  addMockOrder,
  updateMockOrderStatus,
  updateMockOrder,
  deleteMockOrder,
} from '@/lib/mockStore';
import {
  getStepByName,
  formatNoteWithStatus,
  deduceTimelineStep,
  cleanNote,
} from '@/lib/orderTimeline';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.customerName || !body.orderDate) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อลูกค้าและวันที่สั่งซื้อ' }, { status: 400 });
    }

    const monthPart = (body.orderDate || '').substring(0, 7).replace('-', '');
    const orderId = `ORD-${monthPart}-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalPrice = Number(body.totalPrice) || 0;
    const deposit = Number(body.deposit) || 0;
    const balance = Math.max(0, totalPrice - deposit);

    const step = getStepByName(body.orderStatus || (deposit > 0 ? 'มัดจำแล้ว' : 'รอชำระเงิน'));
    const paymentStatus = body.paymentStatus || step.legacy.paymentStatus;
    const prodStatus = body.prodStatus || step.legacy.prodStatus;
    const deliveryStatus = body.deliveryStatus || step.legacy.deliveryStatus;
    const noteWithStatus = formatNoteWithStatus(body.note, step.name);

    const { user, token } = await getAuthUser(req);

    if (!isSupabaseConfigured() || body.isDemo || !user) {
      addMockOrder({
        orderDate: body.orderDate,
        orderId,
        customerName: body.customerName,
        phone: body.phone || '',
        address: body.address || '',
        deliveryMethod: body.deliveryMethod || 'รถกระบะร้าน',
        deliveryDate: body.deliveryDate || '',
        productDetails: body.productDetails || '',
        totalPrice,
        deposit,
        balance,
        orderStatus: step.name,
        paymentStatus,
        prodStatus,
        deliveryStatus,
        note: body.note || '',
      });

      return NextResponse.json({
        success: true,
        isDemo: true,
        orderId,
        message: user
          ? 'บันทึกคำสั่งซื้อสำเร็จ'
          : 'บันทึกคำสั่งซื้อสำเร็จ (โหมดจำลอง Demo — เข้าสู่ระบบเพื่อบันทึกข้อมูลถาวร)',
      });
    }

    const supabase = getAuthenticatedSupabaseClient(token);

    const insertPayload: Record<string, any> = {
      order_date: body.orderDate,
      order_id: orderId,
      customer_name: body.customerName,
      phone: body.phone || '',
      address: body.address || '',
      delivery_method: body.deliveryMethod || 'รถกระบะร้าน',
      delivery_date: body.deliveryDate ? body.deliveryDate : null,
      product_details: body.productDetails || '',
      total_price: totalPrice,
      deposit: deposit,
      balance: balance,
      payment_status: paymentStatus,
      prod_status: prodStatus,
      delivery_status: deliveryStatus,
      note: noteWithStatus,
      user_id: user.id,
    };

    let { data, error } = await supabase.from('orders').insert([insertPayload]).select();

    // Graceful fallback if user_id column has not been migrated yet in Supabase
    if (error && error.message.includes('user_id')) {
      delete insertPayload.user_id;
      const fallback = await supabase.from('orders').insert([insertPayload]).select();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new Error(`บันทึกคำสั่งซื้อลง Supabase ไม่สำเร็จ: ${error.message}`);
    }

    return NextResponse.json({ success: true, orderId, order: data?.[0] });
  } catch (error: any) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const {
      rowNumber,
      orderStatus,
      paymentStatus,
      prodStatus,
      deliveryStatus,
      deliveryDate,
      balance,
      deposit,
      paymentMethod,
      paymentNote,
    } = await req.json();

    if (!rowNumber) {
      return NextResponse.json({ error: 'ไม่พบหมายเลข ID (rowNumber)' }, { status: 400 });
    }

    const step = orderStatus
      ? getStepByName(orderStatus)
      : deduceTimelineStep({ paymentStatus, prodStatus, deliveryStatus });

    const finalPaymentStatus = paymentStatus || step.legacy.paymentStatus;
    const finalProdStatus = prodStatus || step.legacy.prodStatus;
    const finalDeliveryStatus = deliveryStatus || step.legacy.deliveryStatus;

    const { user, token } = await getAuthUser(req);

    if (!isSupabaseConfigured() || !user) {
      const updated = updateMockOrderStatus(
        Number(rowNumber),
        finalPaymentStatus,
        finalProdStatus,
        finalDeliveryStatus,
        step.name,
        deliveryDate,
        deposit !== undefined ? Number(deposit) : undefined,
        balance !== undefined ? Number(balance) : undefined,
        paymentNote
      );
      return NextResponse.json({ success: updated, isDemo: true, orderStatus: step.name });
    }

    const supabase = getAuthenticatedSupabaseClient(token);

    // Fetch existing note and amounts
    const { data: existing } = await supabase
      .from('orders')
      .select('note, balance, deposit')
      .eq('id', rowNumber)
      .single();

    let userNote = cleanNote(existing?.note);
    if (paymentNote) {
      userNote = userNote ? `${userNote} · ${paymentNote}` : paymentNote;
    }
    const noteWithStatus = formatNoteWithStatus(userNote, step.name);

    const updatePayload: Record<string, any> = {
      payment_status: finalPaymentStatus,
      prod_status: finalProdStatus,
      delivery_status: finalDeliveryStatus,
      note: noteWithStatus,
    };
    if (deliveryDate !== undefined) updatePayload.delivery_date = deliveryDate || null;
    if (deposit !== undefined) updatePayload.deposit = Number(deposit);
    if (balance !== undefined) {
      updatePayload.balance = Number(balance);
    } else if (step.name === 'ชำระเงินส่วนที่เหลือ' || step.name === 'เสร็จสิ้น') {
      updatePayload.balance = 0;
    }

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', rowNumber);

    if (error) {
      throw new Error(`อัปเดตข้อมูลใน Supabase ไม่สำเร็จ: ${error.message}`);
    }

    return NextResponse.json({ success: true, orderStatus: step.name });
  } catch (error: any) {
    console.error('Error in PATCH /api/orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const rowNumber = Number(body.rowNumber);

    if (!rowNumber) {
      return NextResponse.json({ error: 'ไม่พบหมายเลข ID (rowNumber)' }, { status: 400 });
    }

    if (!body.customerName || !body.orderDate) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อลูกค้าและวันที่สั่งซื้อ' }, { status: 400 });
    }

    const totalPrice = Number(body.totalPrice) || 0;
    const deposit = Number(body.deposit) || 0;
    const balance = Math.max(0, totalPrice - deposit);

    const step = getStepByName(body.orderStatus || (deposit > 0 ? 'มัดจำแล้ว' : 'รอชำระเงิน'));
    const paymentStatus = body.paymentStatus || step.legacy.paymentStatus;
    const prodStatus = body.prodStatus || step.legacy.prodStatus;
    const deliveryStatus = body.deliveryStatus || step.legacy.deliveryStatus;
    const noteWithStatus = formatNoteWithStatus(body.note, step.name);

    const { user, token } = await getAuthUser(req);

    if (!isSupabaseConfigured() || !user) {
      const updated = updateMockOrder(rowNumber, {
        customerName: body.customerName,
        phone: body.phone || '',
        address: body.address || '',
        deliveryMethod: body.deliveryMethod || 'รถกระบะร้าน',
        deliveryDate: body.deliveryDate || '',
        orderDate: body.orderDate,
        productDetails: body.productDetails || '',
        totalPrice,
        deposit,
        balance,
        orderStatus: step.name,
        paymentStatus,
        prodStatus,
        deliveryStatus,
        note: body.note || '',
      });
      return NextResponse.json({ success: updated, isDemo: true, message: 'อัปเดตคำสั่งซื้อสำเร็จ' });
    }

    const supabase = getAuthenticatedSupabaseClient(token);
    const { error } = await supabase
      .from('orders')
      .update({
        customer_name: body.customerName,
        phone: body.phone || '',
        address: body.address || '',
        delivery_method: body.deliveryMethod || 'รถกระบะร้าน',
        delivery_date: body.deliveryDate ? body.deliveryDate : null,
        order_date: body.orderDate,
        product_details: body.productDetails || '',
        total_price: totalPrice,
        deposit: deposit,
        balance: balance,
        payment_status: paymentStatus,
        prod_status: prodStatus,
        delivery_status: deliveryStatus,
        note: noteWithStatus,
      })
      .eq('id', rowNumber);

    if (error) {
      throw new Error(`อัปเดตข้อมูลใน Supabase ไม่สำเร็จ: ${error.message}`);
    }

    return NextResponse.json({ success: true, message: 'อัปเดตคำสั่งซื้อสำเร็จ' });
  } catch (error: any) {
    console.error('Error in PUT /api/orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { rowNumber } = await req.json();

    if (!rowNumber) {
      return NextResponse.json({ error: 'ไม่พบหมายเลข ID (rowNumber)' }, { status: 400 });
    }

    const { user, token } = await getAuthUser(req);

    if (!isSupabaseConfigured() || !user) {
      const deleted = deleteMockOrder(Number(rowNumber));
      return NextResponse.json({ success: deleted, isDemo: true, message: 'ลบคำสั่งซื้อสำเร็จ' });
    }

    const supabase = getAuthenticatedSupabaseClient(token);
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', rowNumber);

    if (error) {
      throw new Error(`ลบข้อมูลใน Supabase ไม่สำเร็จ: ${error.message}`);
    }

    return NextResponse.json({ success: true, message: 'ลบคำสั่งซื้อสำเร็จ' });
  } catch (error: any) {
    console.error('Error in DELETE /api/orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
