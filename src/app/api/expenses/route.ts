import { NextResponse } from 'next/server';
import {
  isSupabaseConfigured,
  getAuthenticatedSupabaseClient,
  getAuthUser,
} from '@/lib/supabase';
import {
  addMockExpenses,
  updateMockExpense,
  deleteMockExpense,
} from '@/lib/mockStore';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const billDate = (formData.get('billDate') as string) || '';
    const billNo = (formData.get('billNo') as string) || '';
    const vendor = (formData.get('vendor') as string) || '';
    const paymentMethod = (formData.get('paymentMethod') as string) || 'โอนเงิน';
    const note = (formData.get('note') as string) || '';
    const itemsRaw = formData.get('items') as string;
    const file = formData.get('file') as File | null;
    const isDemoParam = formData.get('isDemo') === 'true';

    if (!billDate || !vendor || !itemsRaw) {
      return NextResponse.json({ error: 'กรุณากรอกวันที่, ร้านค้า และรายการสินค้า' }, { status: 400 });
    }

    const items = JSON.parse(itemsRaw);
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ' }, { status: 400 });
    }

    const monthStr = billDate.substring(0, 7);
    const { user, token } = await getAuthUser(req);

    // If Supabase is not configured or user not logged in or demo requested, save to demo store
    if (!isSupabaseConfigured() || isDemoParam || !user) {
      const mockItems = items.map((item: any) => {
        const qty = Number(item.qty) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        return {
          billDate,
          month: monthStr,
          billNo,
          vendor,
          category: item.category || 'เบ็ดเตล็ด/อื่นๆ',
          itemName: item.itemName,
          qty,
          unit: item.unit || 'ชิ้น',
          unitPrice,
          totalItemPrice: Number(item.totalItemPrice) || qty * unitPrice,
          paymentMethod,
          fileUrl: file ? `[จำลองไฟล์: ${file.name}]` : '',
          note,
        };
      });

      addMockExpenses(mockItems);

      return NextResponse.json({
        success: true,
        isDemo: true,
        message: user
          ? 'บันทึกค่าใช้จ่ายสำเร็จ'
          : 'บันทึกค่าใช้จ่ายสำเร็จ (โหมดจำลอง Demo — เข้าสู่ระบบเพื่อบันทึกข้อมูลถาวร)',
      });
    }

    const supabase = getAuthenticatedSupabaseClient(token);

    let fileUrl = '';
    if (file && file.size > 0) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileExt = file.name.split('.').pop() || 'jpg';
        const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${user.id}/${monthStr}/${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from('receipts')
          .upload(filePath, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true,
          });

        if (uploadErr) {
          console.warn('Supabase storage upload error:', uploadErr.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);
          fileUrl = publicUrlData.publicUrl;
        }
      } catch (fileErr: any) {
        console.warn('File processing error:', fileErr);
      }
    }

    const insertRows = items.map((item: any) => {
      const qty = Number(item.qty) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const totalItemPrice = Number(item.totalItemPrice) || qty * unitPrice;

      return {
        bill_date: billDate,
        month: monthStr,
        bill_no: billNo,
        vendor: vendor,
        category: item.category || 'เบ็ดเตล็ด/อื่นๆ',
        item_name: item.itemName,
        qty: qty,
        unit: item.unit || 'ชิ้น',
        unit_price: unitPrice,
        total_item_price: totalItemPrice,
        payment_method: paymentMethod,
        file_url: fileUrl,
        note: note,
        user_id: user.id,
      };
    });

    let { error: insertErr } = await supabase.from('expenses').insert(insertRows);

    // Fallback if user_id column doesn't exist yet
    if (insertErr && insertErr.message.includes('user_id')) {
      const fallbackRows = insertRows.map((r: any) => {
        const copy = { ...r };
        delete copy.user_id;
        return copy;
      });
      const fallback = await supabase.from('expenses').insert(fallbackRows);
      insertErr = fallback.error;
    }

    if (insertErr) {
      throw new Error(`บันทึกค่าใช้จ่ายลง Supabase ไม่สำเร็จ: ${insertErr.message}`);
    }

    return NextResponse.json({ success: true, fileUrl });
  } catch (error: any) {
    console.error('Error in POST /api/expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let rowNumber: number;
    let billDate: string;
    let billNo: string;
    let vendor: string;
    let category: string;
    let itemName: string;
    let qty: number;
    let unit: string;
    let totalPrice: number;
    let paymentMethod: string;
    let note: string;
    let fileUrl: string | undefined;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      rowNumber = Number(formData.get('rowNumber'));
      billDate = (formData.get('billDate') as string) || '';
      billNo = (formData.get('billNo') as string) || '';
      vendor = (formData.get('vendor') as string) || '';
      category = (formData.get('category') as string) || 'เบ็ดเตล็ด/อื่นๆ';
      itemName = (formData.get('itemName') as string) || '';
      qty = Number(formData.get('qty')) || 1;
      unit = (formData.get('unit') as string) || 'ชิ้น';
      totalPrice = Number(formData.get('totalPrice')) || 0;
      paymentMethod = (formData.get('paymentMethod') as string) || 'โอนเงิน';
      note = (formData.get('note') as string) || '';
      fileUrl = (formData.get('fileUrl') as string) || undefined;
      file = formData.get('file') as File | null;
    } else {
      const body = await req.json();
      rowNumber = Number(body.rowNumber);
      billDate = body.billDate || '';
      billNo = body.billNo || '';
      vendor = body.vendor || '';
      category = body.category || 'เบ็ดเตล็ด/อื่นๆ';
      itemName = body.itemName || '';
      qty = Number(body.qty) || 1;
      unit = body.unit || 'ชิ้น';
      totalPrice = Number(body.totalPrice) || Number(body.totalItemPrice) || 0;
      paymentMethod = body.paymentMethod || 'โอนเงิน';
      note = body.note || '';
      fileUrl = body.fileUrl;
    }

    if (!rowNumber) {
      return NextResponse.json({ error: 'ไม่พบหมายเลข ID (rowNumber)' }, { status: 400 });
    }

    if (!itemName || !vendor || !billDate) {
      return NextResponse.json({ error: 'กรุณากรอกรายการสินค้า ร้านค้า และวันที่' }, { status: 400 });
    }

    const unitPrice = totalPrice > 0 && qty > 0 ? totalPrice / qty : 0;
    const totalItemPrice = totalPrice;
    const monthStr = billDate.substring(0, 7);

    const { user, token } = await getAuthUser(req);

    // If a new file was uploaded
    if (file && file.size > 0) {
      if (!isSupabaseConfigured() || !user) {
        fileUrl = `[จำลองไฟล์: ${file.name}]`;
      } else {
        try {
          const supabase = getAuthenticatedSupabaseClient(token);
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const fileExt = file.name.split('.').pop() || 'jpg';
          const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `${user.id}/${monthStr}/${cleanName}`;

          const { error: uploadErr } = await supabase.storage
            .from('receipts')
            .upload(filePath, buffer, {
              contentType: file.type || 'image/jpeg',
              upsert: true,
            });

          if (!uploadErr) {
            const { data: publicUrlData } = supabase.storage
              .from('receipts')
              .getPublicUrl(filePath);
            fileUrl = publicUrlData.publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Upload error during update:', uploadErr);
        }
      }
    }

    if (!isSupabaseConfigured() || !user) {
      const updated = updateMockExpense(rowNumber, {
        billDate,
        month: monthStr,
        billNo,
        vendor,
        category,
        itemName,
        qty,
        unit,
        unitPrice,
        totalItemPrice,
        paymentMethod,
        ...(fileUrl !== undefined ? { fileUrl } : {}),
        note,
      });
      return NextResponse.json({ success: updated, isDemo: true, message: 'อัปเดตค่าใช้จ่ายสำเร็จ' });
    }

    const supabase = getAuthenticatedSupabaseClient(token);
    const updatePayload: Record<string, any> = {
      bill_date: billDate,
      month: monthStr,
      bill_no: billNo,
      vendor,
      category,
      item_name: itemName,
      qty,
      unit,
      unit_price: unitPrice,
      total_item_price: totalItemPrice,
      payment_method: paymentMethod,
      note,
    };
    if (fileUrl !== undefined) {
      updatePayload.file_url = fileUrl;
    }

    const { error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', rowNumber);

    if (error) {
      throw new Error(`อัปเดตข้อมูลใน Supabase ไม่สำเร็จ: ${error.message}`);
    }

    return NextResponse.json({ success: true, message: 'อัปเดตค่าใช้จ่ายสำเร็จ' });
  } catch (error: any) {
    console.error('Error in PUT /api/expenses:', error);
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
      const deleted = deleteMockExpense(Number(rowNumber));
      return NextResponse.json({ success: deleted, isDemo: true, message: 'ลบรายการค่าใช้จ่ายสำเร็จ' });
    }

    const supabase = getAuthenticatedSupabaseClient(token);
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', rowNumber);

    if (error) {
      throw new Error(`ลบข้อมูลใน Supabase ไม่สำเร็จ: ${error.message}`);
    }

    return NextResponse.json({ success: true, message: 'ลบรายการค่าใช้จ่ายสำเร็จ' });
  } catch (error: any) {
    console.error('Error in DELETE /api/expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
