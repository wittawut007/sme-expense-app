import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getAuthUser } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Check (by IP or User ID)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const { user } = await getAuthUser(req);
    const rateLimitKey = user ? `user:${user.id}:scan` : `ip:${ip}:scan`;

    const rateLimit = checkRateLimit(rateLimitKey, 10, 60000); // Max 10 scans / min
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `คุณสแกนบิลบ่อยเกินไป กรุณารอ ${rateLimit.resetInSec} วินาทีก่อนลองใหม่อีกครั้ง`,
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'กรุณาอัปโหลดรูปภาพใบเสร็จหรือไฟล์เอกสาร (JPG, PNG, WebP, PDF)' },
        { status: 400 }
      );
    }

    // 2. File Size Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 10MB)' },
        { status: 400 }
      );
    }

    // 3. File Type Validation
    let mimeType = file.type || '';
    if (!mimeType || mimeType === 'application/octet-stream') {
      const name = file.name.toLowerCase();
      if (name.endsWith('.png')) mimeType = 'image/png';
      else if (name.endsWith('.webp')) mimeType = 'image/webp';
      else if (name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (name.endsWith('.heic')) mimeType = 'image/heic';
      else mimeType = 'image/jpeg';
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'ประเภทไฟล์ไม่ถูกต้อง รองรับเฉพาะ JPG, PNG, WebP และ PDF' },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      '';

    // 4. Demo fallback if user is not authenticated or API key is missing
    if (!user || !apiKey || apiKey.trim() === '' || apiKey.includes('your_')) {
      return NextResponse.json({
        success: true,
        isDemo: true,
        message: user
          ? 'โหมดจำลอง (กรุณาตั้งค่า GEMINI_API_KEY ใน .env.local เพื่อสแกนบิลจริง)'
          : 'โหมดจำลอง (กรุณาเข้าสู่ระบบเพื่อสแกนบิลจริงด้วย AI ประจำร้านของคุณ)',
        data: {
          vendor: 'บริษัท สยาม ซัพพลาย แอนด์ โลจิสติกส์ จำกัด',
          billDate: new Date().toISOString().substring(0, 10),
          billNo: `INV-${Date.now().toString().slice(-8)}`,
          paymentMethod: 'PromptPay',
          category: 'ต้นทุนสินค้า/วัตถุดิบ',
          totalPrice: 1975.89,
          note: user
            ? 'สแกนผ่านระบบจำลอง'
            : 'สแกนผ่านระบบจำลอง (เข้าสู่ระบบเพื่อใช้ AI สแกนบิลจริงของร้าน)',
          items: [
            {
              itemName: 'สินค้าและวัตถุดิบสำหรับการขาย (แพ็คละ 5 ชิ้น)',
              category: 'ต้นทุนสินค้า/วัตถุดิบ',
              qty: 1,
              unit: 'แพ็ค',
              unitPrice: 1727.57,
              totalItemPrice: 1727.57,
            },
            {
              itemName: 'กล่องพัสดุและบรรจุภัณฑ์มาตรฐาน',
              category: 'อุปกรณ์และบรรจุภัณฑ์',
              qty: 1,
              unit: 'แพ็ค',
              unitPrice: 155.2,
              totalItemPrice: 155.2,
            },
            {
              itemName: 'อุปกรณ์และเทปกาวสำหรับแพ็คสินค้า',
              category: 'อุปกรณ์และบรรจุภัณฑ์',
              qty: 1,
              unit: 'กล่อง',
              unitPrice: 93.12,
              totalItemPrice: 93.12,
            },
          ],
        },
      });
    }

    // Convert file to Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `คุณคือผู้เชี่ยวชาญด้านระบบบัญชีและตรวจเอกสารใบเสร็จ/บิลค่าใช้จ่ายของธุรกิจ SME ในไทย
หน้าที่ของคุณคือ สแกนภาพใบเสร็จ/บิล/สลิปโอนเงินนี้อย่างละเอียด แล้วสกัดข้อมูลออกมาเป็น JSON ตามโครงสร้างที่กำหนด:
1. vendor: ชื่อร้านค้า บริษัท หรือผู้จำหน่าย (ตัดคำว่า บจก. หรือคงไว้ให้ชัดเจน เช่น "บริษัท ดูโฮม จำกัด (มหาชน)", "พร้อมภัณฑ์ นครราชสีมา", "MR. D.I.Y.")
2. billDate: วันที่ตามที่ระบุในบิล แปลงเป็น ค.ศ. ในรูปแบบ "YYYY-MM-DD" เสมอ (เช่น 30 ต.ค. 2569 -> "2026-10-30", หรือถ้าปี 2567 -> "2024-10-30")
3. billNo: เลขที่บิล, เลขที่ใบเสร็จรับเงิน, เลขที่ใบกำกับภาษี หรือ Invoice No.
4. paymentMethod: ตรวจดูว่าชำระด้วยอะไร เลือกหนึ่งในนี้: "โอนเงิน", "PromptPay", "เงินสด", "บัตรเครดิต"
5. category: วิเคราะห์ประเภทสินค้าหลักของบิล แล้วเลือก 1 หมวดที่ตรงที่สุดจากรายการต่อไปนี้เท่านั้น:
   - "ต้นทุนสินค้า/วัตถุดิบ" (เช่น สินค้าเพื่อจำหน่าย, วัตถุดิบการผลิต, ส่วนประกอบ, สินค้าสต็อก)
   - "อุปกรณ์และบรรจุภัณฑ์" (เช่น กล่อง, ซอง, เทป, ถุง, วัสดุห่อหุ้ม, บรรจุภัณฑ์)
   - "ค่าขนส่ง/น้ำมัน" (เช่น ค่าจัดส่งพัสดุ, ขนส่งสินค้า, ค่าน้ำมัน, ค่าทางด่วน)
   - "ค่าจ้างและค่าบริการ" (เช่น ค่าแรง, ค่าจ้างรายวัน, ค่าบริการภายนอก, ฟรีแลนซ์)
   - "ค่าเช่าและสถานที่" (เช่น ค่าเช่าร้าน, ค่าเช่าโกดัง, ค่าน้ำ/ค่าไฟ/อินเทอร์เน็ต)
   - "การตลาดและโฆษณา" (เช่น ยิงแอด, ค่าป้าย, สื่อประชาสัมพันธ์, ค่าโฆษณา)
   - "ซ่อมบำรุง/เครื่องมือ" (เช่น ค่าซ่อมแซม, ดูแลรักษาอุปกรณ์, เครื่องมือเครื่องใช้)
   - "เบ็ดเตล็ด/อื่นๆ" (ค่าใช้จ่ายทั่วไปอื่นๆ)
6. totalPrice: ยอดเงินรวมสุทธิของบิล (เป็นตัวเลขทศนิยม ไม่มีเครื่องหมายจุลภาค)
7. items: รายการสินค้าแต่ละแถวในบิล (ถ้ามีหลายรายการให้แยกออกมาทุกรายการ):
   - itemName: ชื่อสินค้าและขนาด/สเปก
   - category: หมวดหมู่ของสินค้านั้น (อ้างอิงจากตัวเลือกด้านบน)
   - qty: จำนวน (ตัวเลข)
   - unit: หน่วยนับ (เช่น แผ่น, ชิ้น, กล่อง, ม้วน, มัด, แพ็ค, ถัง)
   - unitPrice: ราคาต่อหน่วย
   - totalItemPrice: ยอดรวมของแถวนั้น
8. note: รายละเอียดเพิ่มเติม เช่น เวลาที่ชำระ, สาขา, พนักงานขาย หรือส่วนลดพิเศษ

ตรวจความถูกต้องของตัวเลขให้แม่นยำที่สุด`;

    // Call Gemini API with structured JSON schema
    let responseText = '';
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            prompt,
          ],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: {
              type: Type.OBJECT,
              properties: {
                vendor: { type: Type.STRING, description: 'ชื่อร้านค้า หรือผู้จำหน่าย' },
                billDate: { type: Type.STRING, description: 'วันที่ในบิล YYYY-MM-DD' },
                billNo: { type: Type.STRING, description: 'เลขที่บิล หรือ Invoice #' },
                paymentMethod: { type: Type.STRING, description: 'วิธีชำระเงิน โอนเงิน/PromptPay/เงินสด/บัตรเครดิต' },
                category: { type: Type.STRING, description: 'หมวดหมู่ค่าใช้จ่ายหลัก' },
                totalPrice: { type: Type.NUMBER, description: 'ยอดรวมทั้งสิ้น (บาท)' },
                note: { type: Type.STRING, description: 'หมายเหตุเพิ่มเติม' },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      itemName: { type: Type.STRING, description: 'ชื่อรายการสินค้า' },
                      category: { type: Type.STRING, description: 'หมวดหมู่' },
                      qty: { type: Type.NUMBER, description: 'จำนวน' },
                      unit: { type: Type.STRING, description: 'หน่วยนับ' },
                      unitPrice: { type: Type.NUMBER, description: 'ราคาต่อหน่วย' },
                      totalItemPrice: { type: Type.NUMBER, description: 'ราคารวมรายการ' },
                    },
                    required: ['itemName', 'qty', 'unitPrice', 'totalItemPrice'],
                  },
                },
              },
              required: ['vendor', 'billDate', 'totalPrice', 'category'],
            },
          },
        });
        if (result.text) {
          responseText = result.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} failed, trying next...:`, err.message);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('Gemini ไม่ได้ส่งผลลัพธ์กลับมา');
    }

    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/scan-receipt:', error);
    return NextResponse.json(
      {
        error: error.message || 'ไม่สามารถวิเคราะห์เอกสารได้',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
