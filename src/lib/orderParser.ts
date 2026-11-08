import { DocumentItem } from './documentTypes';

const COUNTING_UNITS = [
  'แผ่น',
  'ตัว',
  'ชุด',
  'ชิ้น',
  'กล่อง',
  'มัด',
  'ท่อน',
  'บาน',
  'คู่',
  'แพ็ค',
  'ใบ',
  'ลัง',
  'เครื่อง',
  'อัน',
  'รายการ',
  'เที่ยว',
  'คัน',
  'ตารางเมตร',
  'กก.',
  'กิโลกรัม',
];

/**
 * ฟังก์ชันดึงและแยกรายการสินค้า, จำนวน, หน่วย, ราคาต่อหน่วย และยอดรวม
 * จากข้อความ productDetails และ note ของคำสั่งซื้ออัตโนมัติ
 */
export function parseOrderToDocumentItems(
  productDetails: string,
  totalPrice: number,
  note: string = ''
): DocumentItem[] {
  if (!productDetails || !productDetails.trim()) {
    return [
      {
        id: '1',
        description: 'สินค้า / บริการ',
        quantity: 1,
        unit: 'รายการ',
        unitPrice: totalPrice || 0,
        discount: 0,
        amount: totalPrice || 0,
      },
    ];
  }

  const rawText = productDetails.trim();

  // 1. ตรวจสอบการแยกบรรทัด หรือเครื่องหมายบวก '+'
  let segments: string[] = [];
  if (rawText.includes('\n')) {
    segments = rawText.split('\n');
  } else if (rawText.includes(' + ')) {
    segments = rawText.split(' + ');
  } else if (rawText.includes('+') && /ค่า(?:ส่ง|จัดส่ง|ขนส่ง)/.test(rawText)) {
    segments = rawText.split(/\s*\+\s*/);
  } else if (/;\s*/.test(rawText)) {
    segments = rawText.split(/;\s*/);
  } else {
    segments = [rawText];
  }

  segments = segments.map((s) => s.trim()).filter(Boolean);

  // ตรวจสอบข้อมูลใน note เผื่อมีการระบุราคาแยก เช่น (ค่าสินค้า 2,000 + ค่าจัดส่ง 100)
  let shippingPriceFromNote: number | null = null;
  let productPriceFromNote: number | null = null;
  if (note) {
    const shipMatch = note.match(/ค่า(?:จัด)?ส่ง\s*([\d,]+(?:\.\d+)?)/);
    if (shipMatch) shippingPriceFromNote = parseFloat(shipMatch[1].replace(/,/g, ''));

    const prodMatch = note.match(/ค่าสินค้า\s*([\d,]+(?:\.\d+)?)/);
    if (prodMatch) productPriceFromNote = parseFloat(prodMatch[1].replace(/,/g, ''));
  }

  // 2. ประมวลผลแต่ละรายการ
  const items: DocumentItem[] = segments.map((seg, idx) => {
    const isShipping = /ค่า(?:ส่ง|จัดส่ง|ขนส่ง)/i.test(seg);
    let qty = 1;
    let unit = isShipping ? 'เที่ยว' : 'ชิ้น';

    if (isShipping) {
      unit = 'เที่ยว';
      qty = 1;
    } else {
      // ตรวจสอบ 'จำนวน X [unit]'
      const explicitMatch = seg.match(
        new RegExp(
          '(?:จำนวน|รวม)\\s*(\\d+(?:\\.\\d+)?)\\s*(' + COUNTING_UNITS.join('|') + ')'
        )
      );
      if (explicitMatch) {
        qty = parseFloat(explicitMatch[1]);
        unit = explicitMatch[2];
      } else {
        // ตรวจสอบ 'X [unit]' ทั่วไป
        const countingMatch = seg.match(
          new RegExp('(\\d+(?:\\.\\d+)?)\\s*(' + COUNTING_UNITS.join('|') + ')')
        );
        if (countingMatch) {
          qty = parseFloat(countingMatch[1]);
          unit = countingMatch[2];
        }
      }
    }

    // สกัดราคา
    let unitPrice: number | null = null;
    let amount: number | null = null;

    if (isShipping && shippingPriceFromNote !== null) {
      amount = shippingPriceFromNote;
      unitPrice = shippingPriceFromNote;
    } else if (!isShipping && segments.length === 2 && productPriceFromNote !== null) {
      amount = productPriceFromNote;
      unitPrice = qty > 0 ? productPriceFromNote / qty : productPriceFromNote;
    }

    if (amount === null) {
      // ตรวจสอบราคาต่อหน่วย เช่น ชุดละ 2,600 or ชิ้นละ 450
      const upMatch = seg.match(/(?:ชุด|ชิ้น|แผ่น|ตัว|อัน|ลัง)?ละ\s*([\d,]+(?:\.\d+)?)\s*(?:บาท|บ\.)?/);
      if (upMatch) {
        unitPrice = parseFloat(upMatch[1].replace(/,/g, ''));
        amount = unitPrice * qty;
      }

      // ตรวจสอบราคารวมในวงเล็บ เช่น (1,800 บาท) หรือ ค่าส่ง 100 บาท
      const amMatch = seg.match(/(?:รวม|ราคา|\()?\s*([\d,]+(?:\.\d+)?)\s*(?:บาท|บ\.)\)?/);
      if (amMatch && !upMatch) {
        amount = parseFloat(amMatch[1].replace(/,/g, ''));
        unitPrice = qty > 0 ? amount / qty : amount;
      }
    }

    // ทำความสะอาดชื่อรายการ
    let desc = seg;
    if (isShipping) {
      desc = 'ค่าบริการจัดส่งสินค้า';
    } else {
      desc = desc
        .replace(/\s*\([^)]*(?:บาท|จำนวน|ละ)[^)]*\)/g, '')
        .replace(/(?:รวม\s*)?(?:ค่าส่ง|ค่าจัดส่ง|ค่าขนส่ง)\s*[\d,]*\s*(?:บาท|บ\.)?/g, '')
        .replace(/\s*[\d,]+(?:\.\d+)?\s*(?:บาท|บ\.)\s*$/g, '')
        .trim();
    }

    return {
      id: String(idx + 1),
      description: desc || 'สินค้าสั่งทำตามสเปก',
      quantity: qty,
      unit,
      unitPrice: unitPrice !== null ? unitPrice : 0,
      discount: 0,
      amount: amount !== null ? amount : 0,
    };
  });

  // 3. ปรับสมดุลราคาระหว่างรายการกับ totalPrice
  const knownTotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const unpricedItems = items.filter((it) => it.amount === 0);

  if (unpricedItems.length > 0 && totalPrice > knownTotal) {
    const remaining = totalPrice - knownTotal;
    const perItem = remaining / unpricedItems.length;
    unpricedItems.forEach((it) => {
      it.amount = Math.round(perItem * 100) / 100;
      it.unitPrice = it.quantity > 0 ? Math.round((it.amount / it.quantity) * 100) / 100 : it.amount;
    });
  } else if (items.length === 1 && (!items[0].amount || items[0].amount === 0)) {
    items[0].amount = totalPrice;
    items[0].unitPrice = items[0].quantity > 0 ? Math.round((totalPrice / items[0].quantity) * 100) / 100 : totalPrice;
  }

  return items;
}

