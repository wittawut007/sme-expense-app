'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  Percent,
  QrCode,
  Plus,
  Trash2,
  Settings2,
  Download,
  Share2,
  Eye,
  CheckCircle2,
  Receipt,
  Truck,
  ArrowRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { OrderItem } from '@/lib/mockStore';
import { StoreSettingsData } from './StoreSettingsModal';
import { thaiBahtText } from '@/lib/thaiBahtText';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { parseOrderToDocumentItems } from '@/lib/orderParser';
import {
  CommercialDocumentData,
  DocumentItem,
  DocumentType,
  DOCUMENT_TITLES,
  VatType,
  WhtType,
} from '@/lib/documentTypes';

interface CommercialDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
  storeSettings: StoreSettingsData;
}

export function CommercialDocumentModal({
  isOpen,
  onClose,
  order,
  storeSettings,
}: CommercialDocumentModalProps) {
  // Document Type
  const [docType, setDocType] = useState<DocumentType>('QUOTATION');

  // Document Number & Dates
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Seller Details
  const [sellerName, setSellerName] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerTaxId, setSellerTaxId] = useState('');
  const [sellerBankName, setSellerBankName] = useState('กสิกรไทย (KBANK)');
  const [sellerBankAccountNo, setSellerBankAccountNo] = useState('');
  const [sellerBankAccountName, setSellerBankAccountName] = useState('');
  const [sellerPromptPay, setSellerPromptPay] = useState('');

  // Buyer Details
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerTaxId, setBuyerTaxId] = useState('');
  const [buyerBranch, setBuyerBranch] = useState('สำนักงานใหญ่');

  // Items
  const [items, setItems] = useState<DocumentItem[]>([]);

  // Taxes & Options
  const [vatType, setVatType] = useState<VatType>('NONE');
  const [vatRate] = useState(7);
  const [whtType, setWhtType] = useState<WhtType>('NONE');
  const [includePromptPayQR, setIncludePromptPayQR] = useState(true);
  const [depositPaid, setDepositPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('โอนชำระเงินผ่านบัญชีธนาคาร หรือ สแกน PromptPay QR Code');

  // UI state
  const [showConfig, setShowConfig] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLine, setCopiedLine] = useState(false);

  // A4 Scaling & Fit Mode State
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isFitMode, setIsFitMode] = useState(true);
  const [fitScale, setFitScale] = useState(0.48);

  useEffect(() => {
    if (!isOpen) return;

    const calculateScale = () => {
      if (!previewContainerRef.current) return;
      const el = previewContainerRef.current;
      const rect = el.getBoundingClientRect();

      // Leave padding around preview container
      const padX = window.innerWidth < 640 ? 16 : 40;
      const padY = window.innerWidth < 640 ? 20 : 40;

      const availWidth = Math.max(120, rect.width - padX);
      const availHeight = Math.max(120, rect.height - padY);

      const scaleX = availWidth / 794;
      const scaleY = availHeight / 1123;
      const s = Math.min(scaleX, scaleY);

      setFitScale(Math.max(0.2, Math.min(s, 1.2)));
    };

    calculateScale();

    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }

    window.addEventListener('resize', calculateScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, [isOpen, showConfig, isFitMode]);

  // Initialize or Reset form whenever order or modal opens
  useEffect(() => {
    if (!isOpen) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const due = new Date();
    due.setDate(due.getDate() + 15);
    const dueStr = due.toISOString().split('T')[0];

    const currentYearMonth = todayStr.substring(0, 7).replace('-', '');
    const initialType: DocumentType = order
      ? order.paymentStatus === 'ชำระครบแล้ว' || order.orderStatus === 'เสร็จสิ้น'
        ? 'RECEIPT'
        : order.deposit > 0
        ? 'INVOICE'
        : 'QUOTATION'
      : 'QUOTATION';
    setDocType(initialType);

    const defaultPrefix = DOCUMENT_TITLES[initialType].prefix;
    const randomSuffix = order?.orderId ? order.orderId.replace(/[^0-9]/g, '').slice(-3) : '001';
    
    setDocNumber(`${defaultPrefix}-${currentYearMonth}-${randomSuffix || '001'}`);
    setDocDate(order?.orderDate || todayStr);
    setDueDate(order?.deliveryDate || dueStr);

    // Load Seller from StoreSettings
    setSellerName(storeSettings.businessName || 'ร้านค้าของฉัน');
    setSellerAddress(storeSettings.address || '');
    setSellerPhone(storeSettings.phone || '');
    setSellerTaxId(storeSettings.taxId || '');
    setSellerPromptPay(storeSettings.phone || storeSettings.taxId || '');
    setSellerBankAccountName(storeSettings.businessName || '');

    // Load Buyer from Order
    if (order) {
      setBuyerName(order.customerName || '');
      setBuyerPhone(order.phone || '');
      setBuyerAddress(order.address || '');
      setDepositPaid(order.deposit || 0);

      // Extract taxId from note if present
      const taxMatch = order.note?.match(/เลขประจำตัวผู้เสียภาษี\s*([0-9]{13})/);
      if (taxMatch && taxMatch[1]) {
        setBuyerTaxId(taxMatch[1]);
      } else {
        setBuyerTaxId('');
      }

      // Automatically parse product details into separated line items with quantities, units, and prices
      const parsedItems = parseOrderToDocumentItems(
        order.productDetails || '',
        order.totalPrice || 0,
        order.note || ''
      );
      setItems(parsedItems);
    } else {
      setBuyerName('ลูกค้าทั่วไป');
      setBuyerPhone('');
      setBuyerAddress('');
      setBuyerTaxId('');
      setDepositPaid(0);
      setItems([
        {
          id: '1',
          description: 'สินค้า / บริการ',
          quantity: 1,
          unit: 'ชิ้น',
          unitPrice: 1000,
          discount: 0,
          amount: 1000,
        },
      ]);
    }
  }, [isOpen, order, storeSettings]);

  // Update docNumber prefix when docType changes
  const handleDocTypeChange = (newType: DocumentType) => {
    setDocType(newType);
    const prefix = DOCUMENT_TITLES[newType].prefix;
    setDocNumber((prev) => {
      const parts = prev.split('-');
      if (parts.length >= 2) {
        parts[0] = prefix;
        return parts.join('-');
      }
      return `${prefix}-${new Date().toISOString().substring(0, 7).replace('-', '')}-001`;
    });
  };

  // Calculations
  const calculations = useMemo(() => {
    // 1. Subtotal of items
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const discountTotal = items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
    const amountAfterDiscount = Math.max(0, subtotal - discountTotal);

    let vatAmount = 0;
    let grandTotal = amountAfterDiscount;

    if (vatType === 'INCLUDED') {
      // ราคารวม VAT 7% อยู่แล้ว
      vatAmount = (amountAfterDiscount * vatRate) / (100 + vatRate);
      grandTotal = amountAfterDiscount;
    } else if (vatType === 'EXCLUDED') {
      // ราคาแยก VAT 7% ต้องบวกเพิ่ม
      vatAmount = (amountAfterDiscount * vatRate) / 100;
      grandTotal = amountAfterDiscount + vatAmount;
    }

    // ภาษีหัก ณ ที่จ่าย (Withholding Tax)
    let whtRate = 0;
    if (whtType === '1%') whtRate = 1;
    if (whtType === '2%') whtRate = 2;
    if (whtType === '3%') whtRate = 3;
    if (whtType === '5%') whtRate = 5;

    const baseForWht = vatType === 'INCLUDED' ? amountAfterDiscount - vatAmount : amountAfterDiscount;
    const whtAmount = (baseForWht * whtRate) / 100;

    // ยอดค้างชำระสุทธิ (Net Payable)
    // สำหรับใบเสนอราคา = ยอดเต็ม
    // สำหรับใบเสร็จ = ยอดที่ได้รับ
    // สำหรับใบแจ้งหนี้ = ยอดเต็ม - มัดจำ - หัก ณ ที่จ่าย
    let netPayable = grandTotal - depositPaid - whtAmount;
    if (docType === 'QUOTATION') {
      netPayable = grandTotal;
    } else if (docType === 'RECEIPT') {
      netPayable = depositPaid > 0 && order?.balance === 0 ? grandTotal : (depositPaid || grandTotal);
    }

    if (netPayable < 0) netPayable = 0;

    return {
      subtotal,
      discountTotal,
      amountAfterDiscount,
      vatAmount,
      whtAmount,
      whtRate,
      grandTotal,
      netPayable,
    };
  }, [items, vatType, vatRate, whtType, depositPaid, docType, order]);

  // Generate PromptPay QR Code
  useEffect(() => {
    if (!includePromptPayQR || !sellerPromptPay) {
      setQrCodeDataUrl('');
      return;
    }

    const targetAmount = calculations.netPayable > 0 ? calculations.netPayable : calculations.grandTotal;
    const payload = generatePromptPayPayload(sellerPromptPay, targetAmount);

    if (payload) {
      QRCode.toDataURL(
        payload,
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#1e293b',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrCodeDataUrl(url);
          } else {
            setQrCodeDataUrl('');
          }
        }
      );
    } else {
      setQrCodeDataUrl('');
    }
  }, [includePromptPayQR, sellerPromptPay, calculations.netPayable, calculations.grandTotal]);

  // Item Handlers
  const handleItemChange = (index: number, field: keyof DocumentItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
        const q = Number(field === 'quantity' ? value : target.quantity) || 0;
        const p = Number(field === 'unitPrice' ? value : target.unitPrice) || 0;
        const d = Number(field === 'discount' ? value : target.discount) || 0;
        target.amount = Math.max(0, q * p - d);
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleAddItem = () => {
    const nextId = String(items.length + 1);
    setItems((prev) => [
      ...prev,
      {
        id: nextId,
        description: '',
        quantity: 1,
        unit: 'ชิ้น',
        unitPrice: 0,
        discount: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Print Document (Opens browser print dialog targeting A4 document)
  const handlePrint = () => {
    window.print();
  };

  // Copy Summary text for LINE / Chat
  const handleCopyLineSummary = () => {
    const titleInfo = DOCUMENT_TITLES[docType];
    const textLines = [
      `📄 ${titleInfo.th} (${titleInfo.en})`,
      `เลขที่: ${docNumber}`,
      `วันที่: ${docDate}`,
      `ลูกค้า: ${buyerName}`,
      `------------------------`,
      ...items.map(
        (it, idx) =>
          `${idx + 1}. ${it.description} x ${it.quantity} ${it.unit} = ${it.amount.toLocaleString()} บ.`
      ),
      `------------------------`,
      `ยอดรวมทั้งสิ้น: ${calculations.grandTotal.toLocaleString()} บาท`,
    ];

    if (depositPaid > 0 && docType !== 'QUOTATION') {
      textLines.push(`ชำระแล้ว/มัดจำ: ${depositPaid.toLocaleString()} บาท`);
      textLines.push(`ยอดคงเหลือชำระ: ${calculations.netPayable.toLocaleString()} บาท`);
    }

    if (sellerPromptPay) {
      textLines.push(`ชำระผ่าน PromptPay: ${sellerPromptPay}`);
    }
    if (sellerBankAccountNo) {
      textLines.push(`ธนาคาร: ${sellerBankName} เลขที่ ${sellerBankAccountNo} (${sellerBankAccountName})`);
    }

    textLines.push(`ขอขอบพระคุณที่ไว้วางใจใช้บริการครับ 🙏`);

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopiedLine(true);
    setTimeout(() => setCopiedLine(false), 2500);
  };

  if (!isOpen) return null;

  const currentTitle = DOCUMENT_TITLES[docType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* ── Main Container ── */}
      <div className={`w-full ${!isFitMode ? 'max-w-none h-full sm:h-full sm:rounded-none' : 'max-w-5xl sm:rounded-3xl h-full sm:h-[95vh]'} bg-slate-100 shadow-2xl flex flex-col overflow-hidden border border-slate-200/60 print:border-none print:shadow-none print:h-auto print:rounded-none print:w-full print:bg-white transition-all duration-200`}>
        
        {/* ── Modal Toolbar (Hidden during printing) ── */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden z-20">
          
          {/* Left: Document Type Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            {(
              [
                { type: 'QUOTATION', label: 'ใบเสนอราคา', icon: FileText },
                { type: 'INVOICE', label: 'ใบแจ้งหนี้', icon: CreditCard },
                { type: 'RECEIPT', label: 'ใบเสร็จรับเงิน', icon: Receipt },
                { type: 'TAX_INVOICE', label: 'ใบกำกับภาษี', icon: Building2 },
                { type: 'DELIVERY_NOTE', label: 'ใบส่งของ', icon: Truck },
              ] as const
            ).map((tab) => {
              const active = docType === tab.type;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => handleDocTypeChange(tab.type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                    active
                      ? 'bg-[#6C5DD3] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Actions (Fullscreen toggle, Print, LINE copy, Settings, Close) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Full Screen / Fit A4 */}
            <button
              type="button"
              onClick={() => setIsFitMode(!isFitMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border active:scale-95 ${
                !isFitMode
                  ? 'bg-purple-100 text-[#6C5DD3] border-[#6C5DD3]/40 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={isFitMode ? 'ขยายเต็มหน้าจอ (100%)' : 'ย่อให้เห็นทั้งหน้า A4 พอดีจอ'}
            >
              {isFitMode ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#6C5DD3]" />
                  <span className="hidden sm:inline">ขยายเต็มจอ</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#6C5DD3]" />
                  <span className="hidden sm:inline">ย่อพอดีจอ A4</span>
                </>
              )}
            </button>

            {/* Toggle Config Drawer */}
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showConfig
                  ? 'bg-purple-50 text-[#6C5DD3] border-[#6C5DD3]/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="ตั้งค่าภาษี, บัญชีรับเงิน และข้อมูลเอกสาร"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ปรับแต่งข้อมูล</span>
            </button>

            {/* Copy LINE Summary */}
            <button
              type="button"
              onClick={handleCopyLineSummary}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="คัดลอกข้อความสรุปเพื่อส่งในแชต LINE"
            >
              {copiedLine ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">สรุปส่ง LINE</span>
                </>
              )}
            </button>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              title="สั่งพิมพ์ หรือ บันทึกเป็นไฟล์ PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Modal Body (Split: Config Sidebar + Document Preview) ── */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* ── Left / Collapsible Configuration Sidebar ── */}
          {showConfig && (
            <div className="w-full sm:w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto space-y-4 shrink-0 z-10 print:hidden text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-[#6C5DD3]" />
                  <span>ตั้งค่าเอกสาร</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. หมายเลขเอกสาร & วันที่ */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">เลขที่ & วันที่เอกสาร</label>
                <div>
                  <span className="text-[10px] text-slate-400">เลขที่เอกสาร</span>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#6C5DD3]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400">วันที่ออก</span>
                    <input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">ครบกำหนด</span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. ภาษีมูลค่าเพิ่ม (VAT) & หัก ณ ที่จ่าย (WHT) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">ภาษี (Tax Settings)</label>
                <div>
                  <span className="text-[10px] text-slate-400">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                  <select
                    value={vatType}
                    onChange={(e) => setVatType(e.target.value as VatType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none"
                  >
                    <option value="NONE">ไม่มีภาษีมูลค่าเพิ่ม (0%)</option>
                    <option value="INCLUDED">ราคารวม VAT 7% แล้ว</option>
                    <option value="EXCLUDED">ราคาแยก VAT 7% (บวกเพิ่ม)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">ภาษีหัก ณ ที่จ่าย (WHT)</span>
                  <select
                    value={whtType}
                    onChange={(e) => setWhtType(e.target.value as WhtType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none"
                  >
                    <option value="NONE">ไม่หัก ณ ที่จ่าย (0%)</option>
                    <option value="1%">หัก 1% (ค่าขนส่ง)</option>
                    <option value="2%">หัก 2% (ค่าโฆษณา)</option>
                    <option value="3%">หัก 3% (ค่าบริการ / รับจ้าง)</option>
                    <option value="5%">หัก 5% (ค่าเช่า)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">ยอดเงินมัดจำ / ชำระแล้ว (บาท)</span>
                  <input
                    type="number"
                    value={depositPaid}
                    onChange={(e) => setDepositPaid(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* 3. บัญชีรับเงิน & PromptPay QR */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">ข้อมูลรับเงิน & PromptPay</label>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-xs">แสดง QR PromptPay</span>
                  <input
                    type="checkbox"
                    checked={includePromptPayQR}
                    onChange={(e) => setIncludePromptPayQR(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6C5DD3] cursor-pointer"
                  />
                </div>
                {includePromptPayQR && (
                  <div>
                    <span className="text-[10px] text-slate-400">เบอร์มือถือ หรือ เลขภาษี 13 หลัก</span>
                    <input
                      type="text"
                      placeholder="0812345678 หรือ 0305566003742"
                      value={sellerPromptPay}
                      onChange={(e) => setSellerPromptPay(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                    />
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400">ชื่อธนาคาร</span>
                  <input
                    type="text"
                    value={sellerBankName}
                    onChange={(e) => setSellerBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">เลขที่บัญชี</span>
                  <input
                    type="text"
                    value={sellerBankAccountNo}
                    placeholder="xxx-x-xxxxx-x"
                    onChange={(e) => setSellerBankAccountNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">ชื่อบัญชี</span>
                  <input
                    type="text"
                    value={sellerBankAccountName}
                    onChange={(e) => setSellerBankAccountName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* 4. ข้อมูลลูกค้า */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">ข้อมูลลูกค้า</label>
                <div>
                  <span className="text-[10px] text-slate-400">ชื่อลูกค้า / บริษัท</span>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">เลขประจำตัวผู้เสียภาษี 13 หลัก</span>
                  <input
                    type="text"
                    placeholder="เช่น 0305566003742"
                    value={buyerTaxId}
                    onChange={(e) => setBuyerTaxId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">สาขา</span>
                  <input
                    type="text"
                    value={buyerBranch}
                    placeholder="สำนักงานใหญ่"
                    onChange={(e) => setBuyerBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">ที่อยู่</span>
                  <textarea
                    rows={2}
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* 5. หมายเหตุ & เงื่อนไข */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">หมายเหตุท้ายเอกสาร</label>
                <textarea
                  rows={2}
                  value={notes}
                  placeholder="เช่น ราคานี้ยืนยัน 15 วัน, มัดจำ 50% ก่อนเริ่มงาน"
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>
            </div>
          )}

          {/* ── Document Preview Screen (Simulating A4 Sheet) ── */}
          <div
            ref={previewContainerRef}
            className={`flex-1 ${
              isFitMode
                ? 'bg-slate-700/80 overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4'
                : 'bg-slate-700/80 overflow-auto flex justify-center p-4 sm:p-8'
            } relative select-none print:p-0 print:bg-white print:overflow-visible transition-colors`}
          >
            {/* A4 Paper Scaled Wrapper (Exact 1:1.414 A4 Proportion) */}
            <div
              className={`relative transition-all duration-300 ${
                isFitMode
                  ? 'cursor-pointer group hover:ring-4 hover:ring-[#6C5DD3]/50 rounded-sm'
                  : 'my-auto shrink-0'
              }`}
              style={{
                width: isFitMode ? `${Math.round(794 * fitScale)}px` : '794px',
                height: isFitMode ? `${Math.round(1123 * fitScale)}px` : 'auto',
                minHeight: isFitMode ? undefined : '1123px',
                flexShrink: 0,
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.1)',
              }}
              onClick={() => {
                if (isFitMode) setIsFitMode(false);
              }}
              title={isFitMode ? 'แตะหรือคลิกเพื่อขยายเต็มหน้าจอ' : undefined}
            >
              {/* The Actual A4 Document Content */}
              <div
                id="commercial-document-print-area"
                className="bg-white p-8 sm:p-10 text-slate-800 flex flex-col justify-between print:p-0 print:shadow-none print:border-none print:w-full"
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  transform: isFitMode ? `scale(${fitScale})` : 'none',
                  transformOrigin: 'top left',
                  boxSizing: 'border-box',
                }}
              >
              <div>
                {/* ── 1. Document Header (Corporate 2-Column Standard) ── */}
                <div className="flex flex-row justify-between items-start gap-4 border-b-2 border-slate-800 pb-4">
                  {/* Left: Seller Information */}
                  <div className="flex flex-row items-start gap-3.5 flex-1">
                    {storeSettings.logoUrl ? (
                      <img
                        src={storeSettings.logoUrl}
                        alt="Logo"
                        className="w-16 h-16 rounded-xl object-contain border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-sm"
                        style={{ backgroundColor: currentTitle.color }}
                      >
                        {sellerName.substring(0, 1)}
                      </div>
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <h1 className="text-lg font-black text-slate-900 leading-snug">
                        {sellerName}
                      </h1>
                      {storeSettings.tagline && (
                        <p className="text-[11px] text-slate-500 font-medium truncate">{storeSettings.tagline}</p>
                      )}
                      <p className="text-[11px] text-slate-600 leading-relaxed max-w-sm pt-0.5">
                        {sellerAddress || 'ไม่ระบุที่อยู่ร้านค้า'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-600 pt-0.5">
                        {sellerTaxId && (
                          <span>
                            เลขประจำตัวผู้เสียภาษี: <strong className="text-slate-900">{sellerTaxId}</strong> (สำนักงานใหญ่)
                          </span>
                        )}
                        {sellerPhone && <span>โทร: <strong className="text-slate-900">{sellerPhone}</strong></span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Document Title & Info Box */}
                  <div className="w-64 shrink-0 text-right">
                    <div>
                      <h2
                        className="text-2xl font-black uppercase tracking-tight leading-none"
                        style={{ color: currentTitle.color }}
                      >
                        {currentTitle.th}
                      </h2>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                          {currentTitle.en}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          ต้นฉบับ / ORIGINAL
                        </span>
                      </div>
                    </div>

                    {/* Metadata Table */}
                    <div className="mt-3 border border-slate-300 rounded-lg overflow-hidden text-xs text-left bg-slate-50/60">
                      <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-200">
                        <span className="px-2.5 py-1 text-[11px] text-slate-500 bg-slate-100/70">เลขที่ / No:</span>
                        <strong className="px-2.5 py-1 text-slate-900 font-mono text-[11px]">{docNumber}</strong>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-200">
                        <span className="px-2.5 py-1 text-[11px] text-slate-500 bg-slate-100/70">วันที่ / Date:</span>
                        <span className="px-2.5 py-1 text-slate-800 text-[11px]">{docDate}</span>
                      </div>
                      {docType !== 'RECEIPT' && dueDate && (
                        <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-200">
                          <span className="px-2.5 py-1 text-[11px] text-slate-500 bg-slate-100/70">ครบกำหนด / Due:</span>
                          <span className="px-2.5 py-1 text-slate-800 text-[11px]">{dueDate}</span>
                        </div>
                      )}
                      {order?.orderId && (
                        <div className="grid grid-cols-2 divide-x divide-slate-300">
                          <span className="px-2.5 py-1 text-[11px] text-slate-500 bg-slate-100/70">อ้างอิง / Ref:</span>
                          <span className="px-2.5 py-1 text-slate-800 font-mono text-[11px]">#{order.orderId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 2. Customer & Shipping Info Box (Strict 2-Column Grid) ── */}
                <div className="mt-3.5 border border-slate-300 rounded-lg overflow-hidden grid grid-cols-2 divide-x divide-slate-300 text-xs bg-white">
                  {/* Left Column: Customer Info */}
                  <div className="p-3 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      ข้อมูลผู้ซื้อ / ลูกค้า (CUSTOMER)
                    </span>
                    <p className="font-bold text-slate-900 text-xs">{buyerName || 'ลูกค้าทั่วไป'}</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                      {buyerAddress || 'ไม่ระบุที่อยู่'}
                    </p>
                    {buyerTaxId && (
                      <p className="text-[11px] text-slate-700 pt-0.5">
                        เลขประจำตัวผู้เสียภาษี: <strong className="text-slate-900">{buyerTaxId}</strong> ({buyerBranch || 'สำนักงานใหญ่'})
                      </p>
                    )}
                  </div>

                  {/* Right Column: Delivery & Contact Info */}
                  <div className="p-3 space-y-1 bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      การจัดส่งและการติดต่อ (SHIPPING & CONTACT)
                    </span>
                    {buyerPhone && (
                      <p className="text-[11px] text-slate-700">
                        เบอร์ติดต่อ: <strong className="text-slate-900">{buyerPhone}</strong>
                      </p>
                    )}
                    {order?.deliveryMethod && (
                      <p className="text-[11px] text-slate-700">
                        วิธีจัดส่ง: <span className="font-medium text-slate-900">{order.deliveryMethod}</span>
                      </p>
                    )}
                    {order?.deliveryDate && (
                      <p className="text-[11px] text-slate-700">
                        กำหนดส่งมอบ: <span className="font-medium text-amber-800">{order.deliveryDate}</span>
                      </p>
                    )}
                    {order?.address && order.address !== buyerAddress && (
                      <p className="text-[10px] text-slate-500 leading-snug pt-0.5">
                        จุดส่งของ: {order.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── 3. Items Table (Financial Accounting Grid with Minimum Rows) ── */}
                <div className="mt-3.5 border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className="text-white text-xs font-bold"
                        style={{ backgroundColor: currentTitle.color }}
                      >
                        <th className="py-2 px-2.5 w-12 text-center border-r border-white/20">ลำดับ</th>
                        <th className="py-2 px-3 border-r border-white/20">รายการสินค้าและบริการ / รายละเอียด</th>
                        <th className="py-2 px-2.5 w-16 text-center border-r border-white/20">จำนวน</th>
                        <th className="py-2 px-2.5 w-16 text-center border-r border-white/20">หน่วย</th>
                        <th className="py-2 px-3 w-24 text-right border-r border-white/20">ราคา/หน่วย</th>
                        <th className="py-2 px-3 w-28 text-right">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                      {items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-mono border-r border-slate-200">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="รายละเอียดสินค้า..."
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#6C5DD3] outline-none font-medium text-slate-900 py-0.5 print:border-none"
                            />
                          </td>
                          <td className="py-2 px-2.5 text-center border-r border-slate-200">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#6C5DD3] outline-none font-mono py-0.5 print:border-none"
                            />
                          </td>
                          <td className="py-2 px-2.5 text-center border-r border-slate-200">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#6C5DD3] outline-none text-slate-600 py-0.5 print:border-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-right border-r border-slate-200">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#6C5DD3] outline-none font-mono py-0.5 print:border-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                            {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}

                      {/* Empty padding rows to maintain standard financial document height */}
                      {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, idx) => (
                        <tr key={`empty-${idx}`} className="h-8">
                          <td className="border-r border-slate-200 text-center text-slate-200 font-mono text-[10px]">
                            {items.length + idx + 1}
                          </td>
                          <td className="border-r border-slate-200"></td>
                          <td className="border-r border-slate-200"></td>
                          <td className="border-r border-slate-200"></td>
                          <td className="border-r border-slate-200"></td>
                          <td></td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Baht Text & Subtotal Row */}
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-50/80 font-bold text-xs">
                        <td colSpan={4} className="py-2 px-3 border-r border-slate-300 text-slate-800">
                          <span className="text-[10px] text-slate-400 font-normal block">
                            จำนวนเงินตัวอักษร / TOTAL IN WORDS:
                          </span>
                          <span className="text-slate-900 font-bold">
                            ({thaiBahtText(calculations.grandTotal)})
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right border-r border-slate-300 text-slate-600 text-xs">
                          รวมเป็นเงิน
                        </td>
                        <td className="py-2 px-3 text-right font-black font-mono text-slate-900 text-xs">
                          {calculations.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Add Row Button (Hidden during print) */}
                <div className="mt-1 flex justify-start print:hidden">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] font-bold text-[#6C5DD3] hover:text-[#5b4eb8] flex items-center gap-1 px-2 py-0.5 rounded hover:bg-purple-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มแถวรายการสินค้า</span>
                  </button>
                </div>

                {/* ── 4. Totals, Payment & Terms (Strict 12-Column Layout) ── */}
                <div className="mt-3 grid grid-cols-12 gap-3 items-start text-xs">
                  {/* Left Column (7 cols): Payment methods & Terms */}
                  <div className="col-span-7 border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 flex flex-row items-start gap-3">
                    {includePromptPayQR && qrCodeDataUrl && (
                      <div className="bg-white p-1 rounded-md border border-slate-200 shadow-2xs shrink-0 text-center">
                        <img src={qrCodeDataUrl} alt="PromptPay QR" className="w-20 h-20 object-contain" />
                        <span className="text-[8px] font-black text-purple-700 block mt-0.5">
                          PromptPay QR
                        </span>
                      </div>
                    )}
                    <div className="space-y-0.5 text-[11px] text-slate-600 flex-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-[#6C5DD3]" />
                        <span>ช่องทางการชำระเงิน (PAYMENT METHOD)</span>
                      </span>
                      {sellerPromptPay && (
                        <p>
                          พร้อมเพย์: <strong className="text-slate-900 font-mono">{sellerPromptPay}</strong>
                        </p>
                      )}
                      {sellerBankAccountNo && (
                        <p>
                          {sellerBankName}: <strong className="text-slate-900 font-mono">{sellerBankAccountNo}</strong> ({sellerBankAccountName})
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 pt-1 leading-snug italic border-t border-slate-200 mt-1">
                        หมายเหตุ: {notes || 'กรุณาตรวจสอบความถูกต้องของสินค้าและเอกสารเมื่อได้รับสินค้า'}
                      </p>
                    </div>
                  </div>

                  {/* Right Column (5 cols): Accounting Summary Table */}
                  <div className="col-span-5 border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-xs divide-y divide-slate-200">
                      <tbody>
                        {calculations.discountTotal > 0 && (
                          <tr>
                            <td className="py-1 px-2.5 text-slate-600">ส่วนลด (Discount)</td>
                            <td className="py-1 px-2.5 text-right font-mono text-rose-600">
                              -{calculations.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        {vatType !== 'NONE' && (
                          <tr>
                            <td className="py-1 px-2.5 text-slate-600">
                              ภาษีมูลค่าเพิ่ม 7%{vatType === 'INCLUDED' ? ' (รวมใน)' : ''}
                            </td>
                            <td className="py-1 px-2.5 text-right font-mono text-slate-800">
                              {calculations.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-400">
                          <td className="py-1.5 px-2.5 text-slate-900">จำนวนเงินรวมทั้งสิ้น</td>
                          <td className="py-1.5 px-2.5 text-right font-black font-mono text-sm" style={{ color: currentTitle.color }}>
                            {calculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {depositPaid > 0 && (
                          <>
                            <tr>
                              <td className="py-1 px-2.5 text-slate-600">ชำระแล้ว / มัดจำ</td>
                              <td className="py-1 px-2.5 text-right font-mono text-emerald-600 font-bold">
                                -{depositPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                            {calculations.whtAmount > 0 && (
                              <tr>
                                <td className="py-1 px-2.5 text-slate-600">หัก ณ ที่จ่าย ({whtType})</td>
                                <td className="py-1 px-2.5 text-right font-mono text-amber-700 font-bold">
                                  -{calculations.whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            )}
                            <tr className="bg-rose-50/70 font-bold border-t border-rose-200">
                              <td className="py-1.5 px-2.5 text-rose-900">ยอดที่ต้องชำระสุทธิ</td>
                              <td className="py-1.5 px-2.5 text-right font-black font-mono text-rose-600 text-sm">
                                {calculations.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ── 5. Standard Signatures Block (Strict 2-Column Grid) ── */}
              <div className="mt-8 pt-4 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-700">
                <div className="space-y-3 p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50/40">
                  <p className="text-[11px] text-slate-500 font-medium">ในนาม ผู้สั่งซื้อ / ผู้รับสินค้า (Received by)</p>
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="text-slate-300 text-[10px]">(ลงลายมือชื่อ)</span>
                  </div>
                  <div className="text-[11px] space-y-0.5">
                    <p className="text-slate-800 font-medium">( ................................................................ )</p>
                    <p className="text-slate-500 text-[10px]">วันที่: ........ / ........ / ................</p>
                  </div>
                </div>

                <div className="space-y-3 p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50/40">
                  <p className="text-[11px] text-slate-500 font-medium">ในนาม {sellerName} (Authorized Signature)</p>
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="text-slate-300 text-[10px]">(ผู้มีอำนาจลงนาม / ผู้รับเงิน)</span>
                  </div>
                  <div className="text-[11px] space-y-0.5">
                    <p className="text-slate-800 font-medium">( ................................................................ )</p>
                    <p className="text-slate-500 text-[10px]">วันที่: ........ / ........ / ................</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Hover / Tap Hint on fit mode */}
            {isFitMode && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white text-xs px-3.5 py-2 rounded-full shadow-xl flex items-center gap-1.5 backdrop-blur-sm font-bold border border-white/20">
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>แตะเพื่อขยายเต็มจอ</span>
                </div>
              </div>
            )}
          </div>

          {/* Floating Action Badge at bottom of preview area */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 print:hidden pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsFitMode(!isFitMode)}
              className="px-4 py-2 rounded-full bg-slate-900/95 hover:bg-slate-900 text-white text-xs font-bold shadow-2xl border border-white/20 backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              {isFitMode ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#8F7CFF]" />
                  <span>ขยายเต็มหน้าจอ (100%)</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#8F7CFF]" />
                  <span>ย่อพอดีจอ (A4 ทั้งหน้า)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
