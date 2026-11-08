export interface TimelineStepConfig {
  id: number;
  name: string;
  category: 'การเงิน' | 'คิวงาน' | 'การผลิต' | 'ขนส่ง' | 'เสร็จสิ้น';
  shortDesc: string;
  detail: string;
  colorName: 'rose' | 'purple' | 'amber' | 'blue' | 'teal' | 'indigo' | 'cyan' | 'emerald';
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  ringColor: string;
  legacy: {
    paymentStatus: string;
    prodStatus: string;
    deliveryStatus: string;
  };
}

export const ORDER_TIMELINE_STEPS: TimelineStepConfig[] = [
  {
    id: 1,
    name: 'รอชำระเงิน',
    category: 'การเงิน',
    shortDesc: 'รอชำระเงิน',
    detail: 'เปิดคำสั่งซื้อแล้ว รอการชำระเงินมัดจำจากลูกค้า',
    colorName: 'rose',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-600',
    dotColor: 'bg-rose-500',
    ringColor: 'ring-rose-200',
    legacy: {
      paymentStatus: 'รอชำระ',
      prodStatus: 'รอดำเนินการ',
      deliveryStatus: 'รอจัดส่ง',
    },
  },
  {
    id: 2,
    name: 'มัดจำแล้ว',
    category: 'การเงิน',
    shortDesc: 'มัดจำเรียบร้อย',
    detail: 'ได้รับยอดเงินมัดจำเรียบร้อย ยืนยันการจองคิว',
    colorName: 'purple',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeText: 'text-purple-600',
    dotColor: 'bg-[#6C5DD3]',
    ringColor: 'ring-purple-200',
    legacy: {
      paymentStatus: 'มัดจำแล้ว',
      prodStatus: 'รอดำเนินการ',
      deliveryStatus: 'รอจัดส่ง',
    },
  },
  {
    id: 3,
    name: 'รอดำเนินการ',
    category: 'คิวงาน',
    shortDesc: 'อยู่ในคิวผลิต',
    detail: 'จัดทำแบบและสเปกไม้เรียบร้อย อยู่ในคิวงานเตรียมเข้าไลน์ผลิต',
    colorName: 'amber',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300/80',
    badgeText: 'text-amber-700',
    dotColor: 'bg-amber-500',
    ringColor: 'ring-amber-200',
    legacy: {
      paymentStatus: 'มัดจำแล้ว',
      prodStatus: 'รอดำเนินการ',
      deliveryStatus: 'รอจัดส่ง',
    },
  },
  {
    id: 4,
    name: 'กำลังดำเนินการ',
    category: 'การผลิต',
    shortDesc: 'กำลังผลิตชิ้นงาน',
    detail: 'ฝ่ายผลิตกำลังตัดไม้ ขัด ประกอบ และทำสีตามสเปก',
    colorName: 'amber',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300/80',
    badgeText: 'text-amber-700',
    dotColor: 'bg-amber-500',
    ringColor: 'ring-amber-200',
    legacy: {
      paymentStatus: 'มัดจำแล้ว',
      prodStatus: 'กำลังจัดทำ',
      deliveryStatus: 'รอจัดส่ง',
    },
  },
  {
    id: 5,
    name: 'จัดทำเสร็จสิ้น',
    category: 'การผลิต',
    shortDesc: 'ผลิตเสร็จแล้ว',
    detail: 'งานประกอบเสร็จสมบูรณ์ ผ่านการตรวจเช็คคุณภาพ (QC)',
    colorName: 'teal',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    badgeText: 'text-teal-600',
    dotColor: 'bg-teal-500',
    ringColor: 'ring-teal-200',
    legacy: {
      paymentStatus: 'มัดจำแล้ว',
      prodStatus: 'จัดทำเสร็จสิ้น',
      deliveryStatus: 'รอจัดส่ง',
    },
  },
  {
    id: 6,
    name: 'รอจัดส่ง',
    category: 'ขนส่ง',
    shortDesc: 'รอรถเข้ารับ',
    detail: 'แพ็คสินค้าเรียบร้อย รอคิวรถของร้านหรือลูกค้ารับเอง',
    colorName: 'indigo',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeText: 'text-indigo-600',
    dotColor: 'bg-indigo-500',
    ringColor: 'ring-indigo-200',
    legacy: {
      paymentStatus: 'มัดจำแล้ว',
      prodStatus: 'จัดทำเสร็จสิ้น',
      deliveryStatus: 'รอจัดส่ง',
    },
  },
  {
    id: 7,
    name: 'กำลังจัดส่ง',
    category: 'ขนส่ง',
    shortDesc: 'กำลังเดินทางส่ง',
    detail: 'สินค้าขึ้นรถแล้ว คนขับกำลังออกเดินทางไปยังสถานที่จัดส่ง',
    colorName: 'cyan',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    badgeText: 'text-cyan-600',
    dotColor: 'bg-cyan-500',
    ringColor: 'ring-cyan-200',
    legacy: {
      paymentStatus: 'มัดจำแล้ว',
      prodStatus: 'จัดทำเสร็จสิ้น',
      deliveryStatus: 'กำลังจัดส่ง',
    },
  },
  {
    id: 8,
    name: 'จัดส่งสำเร็จ',
    category: 'ขนส่ง',
    shortDesc: 'ส่งมอบสำเร็จ',
    detail: 'สินค้าส่งถึงมือลูกค้าปลายทางเรียบร้อยแล้ว',
    colorName: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
    ringColor: 'ring-emerald-200',
    legacy: {
      paymentStatus: 'มัดจำแล้ว',
      prodStatus: 'จัดทำเสร็จสิ้น',
      deliveryStatus: 'จัดส่งสำเร็จ',
    },
  },
  {
    id: 9,
    name: 'ชำระเงินส่วนที่เหลือ',
    category: 'การเงิน',
    shortDesc: 'ชำระยอดครบแล้ว',
    detail: 'ลูกค้าตรวจรับสินค้าและชำระเงินส่วนที่เหลือครบถ้วน 100%',
    colorName: 'purple',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeText: 'text-purple-600',
    dotColor: 'bg-[#6C5DD3]',
    ringColor: 'ring-purple-200',
    legacy: {
      paymentStatus: 'ชำระครบแล้ว',
      prodStatus: 'จัดทำเสร็จสิ้น',
      deliveryStatus: 'จัดส่งสำเร็จ',
    },
  },
  {
    id: 10,
    name: 'เสร็จสิ้น',
    category: 'เสร็จสิ้น',
    shortDesc: 'ปิดออเดอร์สมบูรณ์',
    detail: 'คำสั่งซื้อสำเร็จสมบูรณ์ทุกขั้นตอน ปิดงานเรียบร้อย',
    colorName: 'emerald',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    badgeText: 'text-emerald-700',
    dotColor: 'bg-emerald-600',
    ringColor: 'ring-emerald-300',
    legacy: {
      paymentStatus: 'ชำระครบแล้ว',
      prodStatus: 'จัดทำเสร็จสิ้น',
      deliveryStatus: 'จัดส่งสำเร็จ',
    },
  },
];

/**
 * Normalizes user-input status string or aliases to official timeline status name
 */
export function normalizeTimelineStatus(statusName?: string): string {
  if (!statusName) return 'รอชำระเงิน';
  const clean = statusName.trim();

  // Alias checks
  if (clean === 'จัดทำเส็จสิ้น') return 'จัดทำเสร็จสิ้น';
  if (clean === 'จัดส่งเสร็จสิ้น') return 'จัดส่งสำเร็จ';
  if (clean === 'กำลังจัดทำ') return 'กำลังดำเนินการ';
  if (clean === 'รอชำระ') return 'รอชำระเงิน';
  if (clean === 'ชำระครบแล้ว') return 'ชำระเงินส่วนที่เหลือ';

  const found = ORDER_TIMELINE_STEPS.find((s) => s.name === clean);
  return found ? found.name : clean;
}

/**
 * Get step config by step number (1-10)
 */
export function getStepByIndex(stepIndex: number): TimelineStepConfig {
  const clamped = Math.max(1, Math.min(10, stepIndex));
  return ORDER_TIMELINE_STEPS[clamped - 1];
}

/**
 * Get step config by name
 */
export function getStepByName(name?: string): TimelineStepConfig {
  const normalized = normalizeTimelineStatus(name);
  const found = ORDER_TIMELINE_STEPS.find((s) => s.name === normalized);
  return found || ORDER_TIMELINE_STEPS[0];
}

/**
 * Deduce timeline step from legacy order fields if order_status is not directly stored
 */
export function deduceTimelineStep(order: {
  orderStatus?: string;
  paymentStatus?: string;
  prodStatus?: string;
  deliveryStatus?: string;
  note?: string;
}): TimelineStepConfig {
  // 1. Direct orderStatus if present
  if (order.orderStatus) {
    const direct = ORDER_TIMELINE_STEPS.find((s) => s.name === normalizeTimelineStatus(order.orderStatus));
    if (direct) return direct;
  }

  // 2. Note tag if present: e.g. [status:กำลังดำเนินการ]
  if (order.note) {
    const extracted = extractStatusFromNote(order.note);
    if (extracted) {
      const match = ORDER_TIMELINE_STEPS.find((s) => s.name === normalizeTimelineStatus(extracted));
      if (match) return match;
    }
  }

  // 3. Deduce from combination of legacy fields
  const pay = order.paymentStatus || 'รอชำระ';
  const prod = order.prodStatus || 'รอดำเนินการ';
  const deliv = order.deliveryStatus || 'รอจัดส่ง';

  if (pay === 'ชำระครบแล้ว' && (deliv === 'จัดส่งสำเร็จ' || deliv === 'จัดส่งเสร็จสิ้น')) {
    return ORDER_TIMELINE_STEPS[9]; // 10: เสร็จสิ้น
  }
  if (deliv === 'จัดส่งสำเร็จ' || deliv === 'จัดส่งเสร็จสิ้น') {
    return ORDER_TIMELINE_STEPS[7]; // 8: จัดส่งสำเร็จ
  }
  if (deliv === 'กำลังจัดส่ง') {
    return ORDER_TIMELINE_STEPS[6]; // 7: กำลังจัดส่ง
  }
  if (prod === 'จัดทำเสร็จสิ้น' && deliv === 'รอจัดส่ง') {
    return ORDER_TIMELINE_STEPS[4]; // 5: จัดทำเสร็จสิ้น / 6: รอจัดส่ง
  }
  if (prod === 'กำลังจัดทำ' || prod === 'กำลังดำเนินการ') {
    return ORDER_TIMELINE_STEPS[3]; // 4: กำลังดำเนินการ
  }
  if (prod === 'รอดำเนินการ' && pay === 'มัดจำแล้ว') {
    return ORDER_TIMELINE_STEPS[2]; // 3: รอดำเนินการ
  }
  if (pay === 'มัดจำแล้ว') {
    return ORDER_TIMELINE_STEPS[1]; // 2: มัดจำแล้ว
  }

  return ORDER_TIMELINE_STEPS[0]; // 1: รอชำระเงิน
}

/**
 * Extracts [status:xxxx] tag from note string
 */
export function extractStatusFromNote(note?: string): string | null {
  if (!note) return null;
  const match = note.match(/\[status:([^\]]+)\]/);
  return match ? match[1].trim() : null;
}

/**
 * Strips [status:xxxx] tag from note string to show clean note to user
 */
export function cleanNote(note?: string): string {
  if (!note) return '';
  return note.replace(/\[status:[^\]]+\]/g, '').trim();
}

/**
 * Injects or updates [status:xxxx] tag into note string
 */
export function formatNoteWithStatus(note: string | undefined, statusName: string): string {
  const base = cleanNote(note);
  return base ? `${base} [status:${statusName}]` : `[status:${statusName}]`;
}

