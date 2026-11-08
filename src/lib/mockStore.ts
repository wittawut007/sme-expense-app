export interface OrderItem {
  rowNumber: number;
  orderDate: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryMethod: string;
  deliveryDate: string;
  productDetails: string;
  totalPrice: number;
  deposit: number;
  balance: number;
  orderStatus?: string;
  paymentStatus: string;
  prodStatus: string;
  deliveryStatus: string;
  note: string;
}

export interface ExpenseItem {
  rowNumber: number;
  billDate: string;
  month: string;
  billNo: string;
  vendor: string;
  category: string;
  itemName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalItemPrice: number;
  paymentMethod: string;
  fileUrl: string;
  note: string;
}

const initialOrders: OrderItem[] = [
  {
    rowNumber: 1,
    orderDate: '2026-10-23',
    orderId: 'ORD-202610-001',
    customerName: 'บริษัท ดับบลิว. เค. ดี. เอ็นไวรอนเม้นท์ เชอร์วิส จำกัด (คุณวัลลภ)',
    phone: '086-1865254',
    address: '141 ม.2 ต. บ้านใหม่ อ. เมืองนครราชสีมา จ. นครราชสีมา 30000',
    deliveryMethod: 'ลูกค้ารับเอง',
    deliveryDate: '2026-10-28',
    productDetails: 'ลังไม้ยางพาราประสาน ขนาด 139.5x25x36 cm มีฝาปิดด้านบน บานพับ ตัวล็อก ด้านนอกพ่นสีดำ',
    totalPrice: 1900,
    deposit: 900,
    balance: 0,
    orderStatus: 'เสร็จสิ้น',
    paymentStatus: 'ชำระครบแล้ว',
    prodStatus: 'จัดทำเสร็จสิ้น',
    deliveryStatus: 'จัดส่งสำเร็จ',
    note: 'ลูกค้ามารับเองที่ร้าน, เลขประจำตัวผู้เสียภาษี 0305566003742',
  },
  {
    rowNumber: 2,
    orderDate: '2026-10-22',
    orderId: 'ORD-202610-002',
    customerName: 'บริษัท ก่อเกียรติ เขาใหญ่ จำกัด (สำนักงานใหญ่) (คุณกอล์ฟ)',
    phone: '096-7635959',
    address: 'เลขที่ 369 หมู่ที่ 4 ตำบลหมูสี อำเภอปากช่อง จังหวัดนครราชสีมา 30450',
    deliveryMethod: 'รถกระบะร้าน',
    deliveryDate: '2026-11-01',
    productDetails: 'ไม้อัดยาง ตัดวงกลม ขนาด เส้นผ่านศูนย์กลาง 180 cm ความหนา 20 มิล',
    totalPrice: 16000,
    deposit: 8000,
    balance: 8000,
    orderStatus: 'กำลังดำเนินการ',
    paymentStatus: 'มัดจำแล้ว',
    prodStatus: 'กำลังจัดทำ',
    deliveryStatus: 'รอจัดส่ง',
    note: 'จัดส่งลูกค้าที่ปากช่องเขาใหญ่, เลขประจำตัวผู้เสียภาษี 0305560005590',
  },
  {
    rowNumber: 3,
    orderDate: '2026-10-25',
    orderId: 'ORD-202610-003',
    customerName: 'นายกฤษฎา ศรีกิตติกุล (กอล์ฟ)',
    phone: '087-7287969',
    address: 'จอหอ อ.เมือง จ.นครราชสีมา',
    deliveryMethod: 'รถกระบะร้าน',
    deliveryDate: '2026-10-28',
    productDetails: 'ไม้ยางพาราประสานหนา 20 มิล ขนาด 120x65 cm ขัดเคลือบเงา 2 แผ่น + ค่าส่ง 100 บาท',
    totalPrice: 2100,
    deposit: 1000,
    balance: 0,
    orderStatus: 'เสร็จสิ้น',
    paymentStatus: 'ชำระครบแล้ว',
    prodStatus: 'จัดทำเสร็จสิ้น',
    deliveryStatus: 'จัดส่งสำเร็จ',
    note: 'จัดส่งลูกค้าที่จอหอ (ค่าสินค้า 2,000 + ค่าจัดส่ง 100)',
  },
  {
    rowNumber: 4,
    orderDate: '2026-10-28',
    orderId: 'ORD-202610-004',
    customerName: 'จารวี (แนน)',
    phone: '0610575288',
    address: 'มทส',
    deliveryMethod: 'รถกระบะร้าน',
    deliveryDate: '2026-11-06',
    productDetails: 'ซุ้มไม้งานแต่งแบบพับได้ ขนาด กว้าง 3.5 เมตร สูง 2.3 เมตร (ชุดละ 2,600 บาท จำนวน 2 ชุด)',
    totalPrice: 5200,
    deposit: 2600,
    balance: 2600,
    orderStatus: 'กำลังดำเนินการ',
    paymentStatus: 'มัดจำแล้ว',
    prodStatus: 'กำลังจัดทำ',
    deliveryStatus: 'รอจัดส่ง',
    note: 'มัดจำแล้ว 2,600 บาท จัดส่ง มทส วันที่ 6 พ.ย. 69',
  },
  {
    rowNumber: 5,
    orderDate: '2026-10-28',
    orderId: 'ORD-202610-005',
    customerName: 'Star Carpet Co., Ltd',
    phone: '-',
    address: 'เขตอุตสาหกรรม',
    deliveryMethod: 'รถกระบะร้าน',
    deliveryDate: '2026-11-06',
    productDetails: 'สินค้ามาตรฐานสำหรับธุรกิจ (ชุดละ 450 บาท จำนวน 10 ชุด)',
    totalPrice: 4500,
    deposit: 0,
    balance: 4500,
    orderStatus: 'รอชำระเงิน',
    paymentStatus: 'รอชำระ',
    prodStatus: 'รอดำเนินการ',
    deliveryStatus: 'รอจัดส่ง',
    note: 'จ่ายครั้งเดียวหลังส่งของ 7 วัน, จัดส่งเขตอุตสาหกรรม วันที่ 6 พ.ย. 69',
  },
  {
    rowNumber: 6,
    orderDate: '2026-10-28',
    orderId: 'ORD-202610-006',
    customerName: 'กิตติพงษ์',
    phone: '0922840488',
    address: 'ปักธงชัย',
    deliveryMethod: 'รถกระบะร้าน',
    deliveryDate: '2026-11-04',
    productDetails: 'แผ่นไม้ยางพาราประสาน 120*120 cm ตามแบบ ความหนา 18 มิล 1 แผ่น (1,800 บาท) + ค่าส่ง 300 บาท',
    totalPrice: 2100,
    deposit: 1000,
    balance: 1100,
    orderStatus: 'มัดจำแล้ว',
    paymentStatus: 'มัดจำแล้ว',
    prodStatus: 'รอดำเนินการ',
    deliveryStatus: 'รอจัดส่ง',
    note: 'จัดส่งปักธงชัย (ค่าสินค้า 1,800 + ค่าจัดส่ง 300) มัดจำแล้ว 1,000 บาท',
  },
];

const initialExpenses: ExpenseItem[] = [
  {
    rowNumber: 1,
    billDate: '2026-10-26',
    month: '2026-10',
    billNo: '887019',
    vendor: 'พร้อมภัณฑ์ นครราชสีมา',
    category: 'ต้นทุนสินค้า/วัตถุดิบ',
    itemName: 'ไม้พาราประสาน 20 มม. BC',
    qty: 1,
    unit: 'แผ่น',
    unitPrice: 1380,
    totalItemPrice: 1380,
    paymentMethod: 'เงินสด',
    fileUrl: 'https://drive.google.com/file/d/1XF6e2zUuH7K7WlB_vY1iFkLz2uJp-mD1/view?usp=drivesdk',
    note: 'ใบเสร็จ 887019 จ่ายเงินสด',
  },
  {
    rowNumber: 2,
    billDate: '2026-10-29',
    month: '2026-10',
    billNo: '887258',
    vendor: 'พร้อมภัณฑ์ นครราชสีมา',
    category: 'ต้นทุนสินค้า/วัตถุดิบ',
    itemName: 'ไม้อัดยาง 20 มม. A INDO เบา หน้าชมพู ++',
    qty: 6,
    unit: 'แผ่น',
    unitPrice: 1300,
    totalItemPrice: 7800,
    paymentMethod: 'PromptPay',
    fileUrl: 'https://drive.google.com/file/d/13y7a5Ucx0577n_d19P6uX4xWb3w8Kx-8/view?usp=drivesdk',
    note: 'ใบเสร็จ 887258 สแกน PromptPay ธ.ไทยพาณิชย์ เวลา 14:15 น.',
  },
  {
    rowNumber: 3,
    billDate: '2026-10-28',
    month: '2026-10',
    billNo: 'KRA-04261623916',
    vendor: 'บริษัท ดูโฮม จำกัด (มหาชน) สาขานครราชสีมา',
    category: 'อุปกรณ์/เครื่องมือช่าง',
    itemName: 'ลวดเชื่อม/วอดกลาง 1-004B-B3LI1 NASH (ส่วนลดช่าง 1.80 บาท ยอดสุทธิ 58.20 บาท)',
    qty: 1,
    unit: 'แพ็ค',
    unitPrice: 58.2,
    totalItemPrice: 58.2,
    paymentMethod: 'PromptPay',
    fileUrl: 'https://drive.google.com/file/d/1PqC20c15N3w83P-68yQ1jP6M3x7w8q-x/view?usp=drivesdk',
    note: 'ใบเสร็จ KRA-04261623916',
  },
  {
    rowNumber: 4,
    billDate: '2026-10-29',
    month: '2026-10',
    billNo: 'KRA-04261629865',
    vendor: 'บริษัท ดูโฮม จำกัด (มหาชน) สาขานครราชสีมา',
    category: 'ตะปู/อุปกรณ์ประกอบ',
    itemName: 'ตะปูยิงเฟอร์นิเจอร์ (BUEOX)',
    qty: 1,
    unit: 'กล่อง',
    unitPrice: 93.12,
    totalItemPrice: 93.12,
    paymentMethod: 'PromptPay',
    fileUrl: 'https://drive.google.com/file/d/15eSINtOOnmHK3keXM7Z-__hhxrGlffi9/view?usp=drivesdk',
    note: 'ใบเสร็จ KRA-04261629865',
  },
  {
    rowNumber: 5,
    billDate: '2026-10-29',
    month: '2026-10',
    billNo: 'KRA-04261629865',
    vendor: 'บริษัท ดูโฮม จำกัด (มหาชน) สาขานครราชสีมา',
    category: 'สีและเคมีภัณฑ์',
    itemName: 'กาวลาเท็กซ์ TOA LA22S 1.8กก.',
    qty: 1,
    unit: 'แกลลอน',
    unitPrice: 155.2,
    totalItemPrice: 155.2,
    paymentMethod: 'PromptPay',
    fileUrl: 'https://drive.google.com/file/d/15eSINtOOnmHK3keXM7Z-__hhxrGlffi9/view?usp=drivesdk',
    note: 'ใบเสร็จ KRA-04261629865',
  },
  {
    rowNumber: 6,
    billDate: '2026-10-29',
    month: '2026-10',
    billNo: 'KRA-04261629865',
    vendor: 'บริษัท ดูโฮม จำกัด (มหาชน) สาขานครราชสีมา',
    category: 'ต้นทุนสินค้า/วัตถุดิบ',
    itemName: 'ไม้แบบ 100*17*3.00ม.',
    qty: 1,
    unit: 'มัด (5 ท่อน)',
    unitPrice: 1727.57,
    totalItemPrice: 1727.57,
    paymentMethod: 'PromptPay',
    fileUrl: 'https://drive.google.com/file/d/15eSINtOOnmHK3keXM7Z-__hhxrGlffi9/view?usp=drivesdk',
    note: 'ใบเสร็จ KRA-04261629865 ยอดรวมทั้งบิลหลังหักส่วนลดช่าง 61.11 บาท คือ 1,975.89 บาท',
  },
  {
    rowNumber: 7,
    billDate: '2026-10-30',
    month: '2026-10',
    billNo: 'JH 6910002624',
    vendor: 'บริษัท เน็กซ่า สเปซ ดีไซน์ จำกัด',
    category: 'อุปกรณ์/เครื่องมือช่าง',
    itemName: 'ฟิล์มยืด 50 ซม. 15 ไมครอน + 300 ม.',
    qty: 1,
    unit: 'ม้วน',
    unitPrice: 150,
    totalItemPrice: 150,
    paymentMethod: 'โอนเงิน',
    fileUrl: 'https://drive.google.com/file/d/11wViuqa5qON8UEsscBoHeGLa4-Hy0g_D/view?usp=drivesdk',
    note: 'ชำระผ่าน SCB QR เวลา 08:43 น., พนักงานขาย: เสาวลักษณ์',
  },
  {
    rowNumber: 8,
    billDate: '2026-10-30',
    month: '2026-10',
    billNo: 'JH 6910002624',
    vendor: 'บริษัท เน็กซ่า สเปซ ดีไซน์ จำกัด',
    category: 'ต้นทุนสินค้า/วัตถุดิบ',
    itemName: 'ไม้พาราประสาน 18 มม. BC',
    qty: 1,
    unit: 'แผ่น',
    unitPrice: 1330,
    totalItemPrice: 1330,
    paymentMethod: 'โอนเงิน',
    fileUrl: 'https://drive.google.com/file/d/11wViuqa5qON8UEsscBoHeGLa4-Hy0g_D/view?usp=drivesdk',
    note: 'ชำระผ่าน SCB QR เวลา 08:43 น., ยอดรวมบิล 1,480.00 บาท',
  },
  {
    rowNumber: 9,
    billDate: '2026-10-30',
    month: '2026-10',
    billNo: 'T1 R000193280',
    vendor: 'MR. D.I.Y. สาขาหัวทะเล (00797)',
    category: 'สีและเคมีภัณฑ์',
    itemName: 'DAICO HOT GLUE 503 15g (กาวร้อน)',
    qty: 3,
    unit: 'ชิ้น',
    unitPrice: 15,
    totalItemPrice: 45,
    paymentMethod: 'PromptPay',
    fileUrl: 'https://drive.google.com/file/d/1VNtfbxCm8MnmkYM7rsKPbo-hKuzbhjj8/view?usp=drivesdk',
    note: 'สแกน PromptPay (KPLUS) เวลา 12:24 น., POS: E093000002A4866',
  },
];

// Global in-memory storage for demo mode
declare global {
  var __sme_mock_orders: OrderItem[] | undefined;
  var __sme_mock_expenses: ExpenseItem[] | undefined;
}

if (!globalThis.__sme_mock_orders) {
  globalThis.__sme_mock_orders = [...initialOrders];
}

if (!globalThis.__sme_mock_expenses) {
  globalThis.__sme_mock_expenses = [...initialExpenses];
}

export function getMockOrders(): OrderItem[] {
  return globalThis.__sme_mock_orders || initialOrders;
}

export function addMockOrder(order: Omit<OrderItem, 'rowNumber'>): OrderItem {
  const current = getMockOrders();
  const nextRow = current.length > 0 ? Math.max(...current.map((o) => o.rowNumber)) + 1 : 2;
  const newOrder: OrderItem = { ...order, rowNumber: nextRow };
  globalThis.__sme_mock_orders = [newOrder, ...current];
  return newOrder;
}

export function updateMockOrderStatus(
  rowNumber: number,
  paymentStatus?: string,
  prodStatus?: string,
  deliveryStatus?: string,
  orderStatus?: string,
  deliveryDate?: string,
  deposit?: number,
  balance?: number,
  note?: string
): boolean {
  const current = getMockOrders();
  const index = current.findIndex((o) => o.rowNumber === rowNumber);
  if (index !== -1) {
    current[index] = {
      ...current[index],
      ...(paymentStatus !== undefined ? { paymentStatus } : {}),
      ...(prodStatus !== undefined ? { prodStatus } : {}),
      ...(deliveryStatus !== undefined ? { deliveryStatus } : {}),
      ...(orderStatus !== undefined ? { orderStatus } : {}),
      ...(deliveryDate !== undefined ? { deliveryDate } : {}),
      ...(deposit !== undefined ? { deposit } : {}),
      ...(balance !== undefined ? { balance } : {}),
      ...(note !== undefined ? { note } : {}),
    };
    globalThis.__sme_mock_orders = [...current];
    return true;
  }
  return false;
}

export function updateMockOrder(rowNumber: number, updatedFields: Partial<OrderItem>): boolean {
  const current = getMockOrders();
  const index = current.findIndex((o) => o.rowNumber === rowNumber);
  if (index !== -1) {
    current[index] = {
      ...current[index],
      ...updatedFields,
      rowNumber,
    };
    globalThis.__sme_mock_orders = [...current];
    return true;
  }
  return false;
}

export function deleteMockOrder(rowNumber: number): boolean {
  const current = getMockOrders();
  const filtered = current.filter((o) => o.rowNumber !== rowNumber);
  if (filtered.length !== current.length) {
    globalThis.__sme_mock_orders = filtered;
    return true;
  }
  return false;
}

export function getMockExpenses(): ExpenseItem[] {
  return globalThis.__sme_mock_expenses || initialExpenses;
}

export function addMockExpenses(items: Omit<ExpenseItem, 'rowNumber'>[]): ExpenseItem[] {
  const current = getMockExpenses();
  let nextRow = current.length > 0 ? Math.max(...current.map((e) => e.rowNumber)) + 1 : 2;
  const newExpenses: ExpenseItem[] = [];

  for (const item of items) {
    const newItem: ExpenseItem = { ...item, rowNumber: nextRow++ };
    newExpenses.push(newItem);
  }

  globalThis.__sme_mock_expenses = [...newExpenses.reverse(), ...current];
  return newExpenses;
}

export function updateMockExpense(rowNumber: number, updatedFields: Partial<ExpenseItem>): boolean {
  const current = getMockExpenses();
  const index = current.findIndex((e) => e.rowNumber === rowNumber);
  if (index !== -1) {
    current[index] = {
      ...current[index],
      ...updatedFields,
      rowNumber,
    };
    globalThis.__sme_mock_expenses = [...current];
    return true;
  }
  return false;
}

export function deleteMockExpense(rowNumber: number): boolean {
  const current = getMockExpenses();
  const filtered = current.filter((e) => e.rowNumber !== rowNumber);
  if (filtered.length !== current.length) {
    globalThis.__sme_mock_expenses = filtered;
    return true;
  }
  return false;
}
