/**
 * โครงสร้างข้อมูลสำหรับเอกสารทางการค้า (Commercial Documents)
 * รองรับ: ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จรับเงิน, ใบกำกับภาษี, ใบส่งสินค้า
 */

export type DocumentType =
  | 'QUOTATION'     // ใบเสนอราคา
  | 'INVOICE'       // ใบแจ้งหนี้ / ใบวางบิล
  | 'RECEIPT'       // ใบเสร็จรับเงิน
  | 'TAX_INVOICE'   // ใบกำกับภาษี / ใบเสร็จรับเงิน
  | 'DELIVERY_NOTE';// ใบส่งของ / ใบส่งสินค้า

export interface DocumentItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  amount: number;
}

export type VatType = 'NONE' | 'INCLUDED' | 'EXCLUDED';
export type WhtType = 'NONE' | '1%' | '2%' | '3%' | '5%';

export interface CommercialDocumentData {
  type: DocumentType;
  docNumber: string;
  docDate: string;
  dueDate: string;
  referenceOrderNo?: string;

  // ข้อมูลผู้ออกเอกสาร (ผู้ขาย / ร้านค้า)
  seller: {
    businessName: string;
    tagline?: string;
    address: string;
    phone: string;
    taxId?: string;
    logoUrl?: string | null;
    bankName?: string;
    bankAccountNo?: string;
    bankAccountName?: string;
    promptPayId?: string;
  };

  // ข้อมูลผู้รับเอกสาร (ลูกค้า)
  buyer: {
    customerName: string;
    phone?: string;
    address?: string;
    taxId?: string;
    branch?: string; // สำนักงานใหญ่ หรือ สาขาที่...
  };

  // รายการสินค้า / บริการ
  items: DocumentItem[];

  // การคำนวณและภาษี
  vatType: VatType;
  vatRate: number; // ปกติ 7%
  whtType: WhtType;
  whtRate: number; // 0, 1, 2, 3, 5%

  subtotal: number;
  discountTotal: number;
  amountAfterDiscount: number;
  vatAmount: number;
  whtAmount: number;
  grandTotal: number;
  depositPaid: number;
  netPayable: number;

  // เงื่อนไขและลายเซ็น
  notes: string;
  paymentTerms: string;
  signatureName: string;
  includePromptPayQR: boolean;
}

export const DOCUMENT_TITLES: Record<DocumentType, { th: string; en: string; prefix: string; color: string }> = {
  QUOTATION: {
    th: 'ใบเสนอราคา',
    en: 'QUOTATION',
    prefix: 'QT',
    color: '#6C5DD3',
  },
  INVOICE: {
    th: 'ใบแจ้งหนี้ / ใบวางบิล',
    en: 'INVOICE / BILL',
    prefix: 'INV',
    color: '#2563EB',
  },
  RECEIPT: {
    th: 'ใบเสร็จรับเงิน',
    en: 'RECEIPT',
    prefix: 'REC',
    color: '#059669',
  },
  TAX_INVOICE: {
    th: 'ใบเสร็จรับเงิน / ใบกำกับภาษี',
    en: 'TAX INVOICE / RECEIPT',
    prefix: 'TAX',
    color: '#D97706',
  },
  DELIVERY_NOTE: {
    th: 'ใบส่งสินค้า / ใบส่งของ',
    en: 'DELIVERY NOTE',
    prefix: 'DO',
    color: '#475569',
  },
};

