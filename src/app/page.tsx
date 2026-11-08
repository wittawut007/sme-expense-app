'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  Receipt,
  History,
  Plus,
  RefreshCw,
  Phone,
  Truck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Pencil,
  X,
  Search,
  ChevronRight,
  Info,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Eye,
  Wallet,
  TrendingUp,
  FileText,
  User,
  ShieldCheck,
  Building2,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Camera,
  ScanLine,
  Image as LucideImage,
  BarChart3,
  Clock,
  CreditCard,
  LogOut,
  Settings,
  Store,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { compressImageFile } from '@/lib/imageCompressor';
import { OrderTimeline } from './components/OrderTimeline';
import { AuthModal } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import {
  StoreSettingsModal,
  StoreSettingsData,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_DELIVERY_METHODS,
} from './components/StoreSettingsModal';
import { getBrowserSupabaseClient } from '@/lib/supabase';
import {
  ORDER_TIMELINE_STEPS,
  deduceTimelineStep,
  getStepByName,
  normalizeTimelineStatus,
} from '@/lib/orderTimeline';

/* ─── Interfaces ─────────────────────────────────────── */
interface OrderItem {
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

interface ExpenseItem {
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

/* ─── Helpers ────────────────────────────────────────── */
const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const [y, m, d] = dateStr.split('-');
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${parseInt(y) + 543}`;
  } catch {
    return dateStr;
  }
};

const formatThaiMonth = (ym: string) => {
  if (!ym || ym === 'ALL') return 'ทุกรอบเดือน';
  try {
    const [year, month] = ym.split('-');
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${months[parseInt(month) - 1]} ${parseInt(year) + 543}`;
  } catch {
    return ym;
  }
};

const extractYearMonth = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  const match = clean.match(/^(\d{4})[-/](\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return clean.length >= 7 ? clean.substring(0, 7) : '';
};

const formatThaiMonthShort = (ym: string) => {
  if (!ym || ym === 'ALL') return 'ทุกเดือน';
  try {
    const [year, month] = ym.split('-');
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const shortYear = String(parseInt(year) + 543).slice(-2);
    return `${months[parseInt(month) - 1]} ${shortYear}`;
  } catch {
    return ym;
  }
};

/* ─── Status Badge Component (Flat & Borderless) ─────────────────────── */
function StatusPill({ status, noBg = false }: { status: string; noBg?: boolean }) {
  const configs: Record<string, { bg: string; text: string; dot: string }> = {
    // 10 Timeline Steps
    'รอชำระเงิน': { bg: 'bg-[#FF5630]/15', text: 'text-[#FF5630]', dot: 'bg-[#FF5630]' },
    'มัดจำแล้ว': { bg: 'bg-[#6C5DD3]/15', text: 'text-[#6C5DD3]', dot: 'bg-[#6C5DD3]' },
    'รอดำเนินการ': { bg: 'bg-[#FF9F43]/15', text: 'text-amber-800', dot: 'bg-[#FF9F43]' },
    'กำลังดำเนินการ': { bg: 'bg-[#FF9F43]/15', text: 'text-amber-800', dot: 'bg-[#FF9F43]' },
    'จัดทำเสร็จสิ้น': { bg: 'bg-[#00B8D9]/15', text: 'text-[#00B8D9]', dot: 'bg-[#00B8D9]' },
    'รอจัดส่ง': { bg: 'bg-indigo-500/15', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    'กำลังจัดส่ง': { bg: 'bg-cyan-500/15', text: 'text-cyan-700', dot: 'bg-cyan-500' },
    'จัดส่งสำเร็จ': { bg: 'bg-[#05CD99]/15', text: 'text-[#05CD99]', dot: 'bg-[#05CD99]' },
    'ชำระเงินส่วนที่เหลือ': { bg: 'bg-purple-500/15', text: 'text-purple-700', dot: 'bg-[#6C5DD3]' },
    'เสร็จสิ้น': { bg: 'bg-[#05CD99]/20', text: 'text-[#05CD99]', dot: 'bg-[#05CD99]' },

    // Legacy Aliases
    'ชำระครบแล้ว': { bg: 'bg-[#05CD99]/15', text: 'text-[#05CD99]', dot: 'bg-[#05CD99]' },
    'Paid': { bg: 'bg-[#05CD99]/15', text: 'text-[#05CD99]', dot: 'bg-[#05CD99]' },
    'จ่ายแล้ว': { bg: 'bg-[#05CD99]/15', text: 'text-[#05CD99]', dot: 'bg-[#05CD99]' },
    'Draft': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
    'รอชำระ': { bg: 'bg-[#FF5630]/15', text: 'text-[#FF5630]', dot: 'bg-[#FF5630]' },
    'Due': { bg: 'bg-[#FF5630]/15', text: 'text-[#FF5630]', dot: 'bg-[#FF5630]' },
    'Scheduled': { bg: 'bg-[#FF9F43]/15', text: 'text-[#FF9F43]', dot: 'bg-[#FF9F43]' },
    'กำลังจัดทำ': { bg: 'bg-[#FF9F43]/15', text: 'text-amber-800', dot: 'bg-[#FF9F43]' },
    'จัดส่งเสร็จสิ้น': { bg: 'bg-[#05CD99]/15', text: 'text-[#05CD99]', dot: 'bg-[#05CD99]' },
  };

  const style = configs[status] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
  const label = status === 'Paid' ? 'จ่ายแล้ว' : status;

  if (noBg) {
    return (
      <span className={`inline-flex items-center text-xs font-semibold ${style.text}`}>
        <span className={`w-2 h-2 rounded-full ${style.dot} mr-1.5`} />
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot} mr-1.5`} />
      {label}
    </span>
  );
}

const getPaymentStatusBtnStyle = (status: string) => {
  switch (status) {
    case 'ชำระครบแล้ว':
      return {
        btn: 'bg-emerald-100/90 text-emerald-900 hover:bg-emerald-200/90',
        dot: 'bg-emerald-500',
      };
    case 'มัดจำแล้ว':
      return {
        btn: 'bg-purple-100/90 text-purple-900 hover:bg-purple-200/90',
        dot: 'bg-[#6C5DD3]',
      };
    case 'รอชำระ':
    default:
      return {
        btn: 'bg-rose-100/90 text-rose-900 hover:bg-rose-200/90',
        dot: 'bg-rose-500',
      };
  }
};

const getProdStatusBtnStyle = (status: string) => {
  switch (status) {
    case 'จัดทำเสร็จสิ้น':
      return {
        btn: 'bg-teal-100/90 text-teal-900 hover:bg-teal-200/90',
        dot: 'bg-teal-500',
      };
    case 'กำลังจัดทำ':
    case 'กำลังดำเนินการ':
      return {
        btn: 'bg-amber-100/90 text-amber-900 hover:bg-amber-200/90',
        dot: 'bg-amber-500',
      };
    case 'รอดำเนินการ':
    default:
      return {
        btn: 'bg-amber-100/90 text-amber-900 hover:bg-amber-200/90',
        dot: 'bg-amber-500',
      };
  }
};

const getDeliveryStatusBtnStyle = (status: string) => {
  switch (status) {
    case 'จัดส่งสำเร็จ':
      return {
        btn: 'bg-emerald-100/90 text-emerald-900 hover:bg-emerald-200/90',
        dot: 'bg-emerald-500',
      };
    case 'กำลังจัดส่ง':
      return {
        btn: 'bg-cyan-100/90 text-cyan-900 hover:bg-cyan-200/90',
        dot: 'bg-cyan-500',
      };
    case 'รอจัดส่ง':
    default:
      return {
        btn: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
        dot: 'bg-slate-500',
      };
  }
};

/* ─── Wood Log Icon (ท่อนไม้) ─────────────────────────── */
function WoodLogIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Front cut cross-section of the log with tree rings */}
      <ellipse cx="6" cy="12" rx="3.5" ry="5.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="6" cy="12" rx="2" ry="3.2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
      <circle cx="6" cy="12" r="0.75" fill="currentColor" />

      {/* Log cylinder body */}
      <path
        d="M6 6.5H18.5C20.43 6.5 22 8.96 22 12C22 15.04 20.43 17.5 18.5 17.5H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Bark wood grain lines */}
      <path d="M11 9.5H17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 12.5H19" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 15H16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Expense Category Styles (สีแยกแต่ละหมวดหมู่) ───────── */
const getExpenseCategoryStyle = (category: string) => {
  switch (category) {
    case 'ไม้พาเลท/วัตถุดิบ':
      return {
        badge: '',
        text: 'text-amber-700',
        dot: 'bg-amber-600',
        iconBg: 'bg-amber-50 text-amber-700',
        pillActive: 'text-amber-700',
      };
    case 'ตะปู/อุปกรณ์ประกอบ':
      return {
        badge: '',
        text: 'text-slate-700',
        dot: 'bg-slate-600',
        iconBg: 'bg-slate-100 text-slate-700',
        pillActive: 'text-slate-800',
      };
    case 'สีและเคมีภัณฑ์':
      return {
        badge: '',
        text: 'text-indigo-600',
        dot: 'bg-indigo-600',
        iconBg: 'bg-indigo-50 text-indigo-600',
        pillActive: 'text-indigo-700',
      };
    case 'อุปกรณ์/เครื่องมือช่าง':
      return {
        badge: '',
        text: 'text-sky-600',
        dot: 'bg-sky-600',
        iconBg: 'bg-sky-50 text-sky-600',
        pillActive: 'text-sky-700',
      };
    case 'ค่าขนส่ง/น้ำมัน':
      return {
        badge: '',
        text: 'text-orange-600',
        dot: 'bg-orange-500',
        iconBg: 'bg-orange-50 text-orange-600',
        pillActive: 'text-orange-700',
      };
    case 'ค่าแรงช่าง':
      return {
        badge: '',
        text: 'text-emerald-700',
        dot: 'bg-emerald-600',
        iconBg: 'bg-emerald-50 text-emerald-700',
        pillActive: 'text-emerald-800',
      };
    case 'ซ่อมบำรุง/เครื่องมือ':
      return {
        badge: '',
        text: 'text-rose-600',
        dot: 'bg-rose-500',
        iconBg: 'bg-rose-50 text-rose-600',
        pillActive: 'text-rose-700',
      };
    case 'เบ็ดเตล็ด/อื่นๆ':
    default:
      return {
        badge: '',
        text: 'text-purple-600',
        dot: 'bg-purple-600',
        iconBg: 'bg-purple-50 text-purple-600',
        pillActive: 'text-purple-700',
      };
  }
};

/* ─── Expense Categories Constant ────────────────────────── */
const EXPENSE_CATEGORIES = [
  'ไม้พาเลท/วัตถุดิบ',
  'ตะปู/อุปกรณ์ประกอบ',
  'สีและเคมีภัณฑ์',
  'อุปกรณ์/เครื่องมือช่าง',
  'ค่าขนส่ง/น้ำมัน',
  'ค่าแรงช่าง',
  'ซ่อมบำรุง/เครื่องมือ',
  'เบ็ดเตล็ด/อื่นๆ',
] as const;

/* ─── Circular Progress Donut Chart (Large & Clear) ──────────────────── */
function DonutLarge({ percent, color, label }: { percent: number; color: string; label?: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 72 72" width="96" height="96">
        <circle cx="36" cy="36" r={radius} className="stroke-slate-100 fill-none" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-base sm:text-lg font-black text-slate-900 leading-none">
          {Math.round(safePercent)}%
        </span>
        {label && (
          <span className="text-xs font-bold text-slate-500 mt-1 leading-none">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Sales Donut Chart (กราฟโดนัท สัดส่วนยอดขาย: ยอดรวม แบ่งเป็น มัดจำ และ คงเหลือ) ─── */
function SalesDonutChart({
  totalSales,
  totalDeposit,
  totalBalance,
  depositPercent,
  balancePercent,
}: {
  totalSales: number;
  totalDeposit: number;
  totalBalance: number;
  depositPercent: number;
  balancePercent: number;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.292

  // Fractions of circle
  const depFraction = totalSales > 0 ? Math.min(1, Math.max(0, totalDeposit / totalSales)) : 0;
  const balFraction = totalSales > 0 ? Math.min(1 - depFraction, Math.max(0, totalBalance / totalSales)) : 0;

  const depStrokeLength = depFraction * circumference;
  const balStrokeLength = balFraction * circumference;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/50 shadow-xs space-y-4">
      {/* Header (ไม่มี icon ด้านหน้า ตามดีไซน์) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide">
            สัดส่วนยอดขาย
          </h2>
          <p className="text-[11px] text-slate-400">
            จากยอดรวม แบ่งเป็น มัดจำ และ ยอดคงเหลือ
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-[#05CD99]" />
            <span>มัดจำแล้ว</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9F43]" />
            <span>ยอดคงเหลือ</span>
          </span>
        </div>
      </div>

      {/* Donut Chart Display */}
      <div className="py-2 flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center shrink-0">
          <svg className="w-44 h-44 sm:w-48 sm:h-48 -rotate-90" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="stroke-slate-100 fill-none"
              strokeWidth="16"
            />

            {/* Segment 1: มัดจำ / รับชำระแล้ว (Emerald #05CD99) */}
            {totalSales > 0 && depStrokeLength > 0 && (
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#05CD99"
                strokeWidth="16"
                strokeDasharray={`${depStrokeLength} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            )}

            {/* Segment 2: ยอดคงเหลือ (Amber #FF9F43) */}
            {totalSales > 0 && balStrokeLength > 0 && (
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#FF9F43"
                strokeWidth="16"
                strokeDasharray={`${balStrokeLength} ${circumference}`}
                strokeDashoffset={-depStrokeLength}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            )}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="text-[11px] font-semibold text-slate-400">
              ยอดขายรวม
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">
              {totalSales.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-slate-400 mt-1">
              บาท
            </span>
          </div>
        </div>

        {/* Breakdown Breakdown Cards */}
        <div className="w-full sm:w-auto flex-1 grid grid-cols-2 sm:grid-cols-1 gap-2.5">
          {/* Card: มัดจำแล้ว */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-[#05CD99]" />
                มัดจำแล้ว
              </span>
              <span className="text-[11px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700">
                {depositPercent}%
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-emerald-700 leading-tight">
              {totalDeposit.toLocaleString()}{' '}
              <span className="text-xs font-medium text-emerald-600">บาท</span>
            </p>
            <p className="text-[10px] text-emerald-600/80">
              รับชำระแล้ว / เงินเข้าบัญชี
            </p>
          </div>

          {/* Card: ยอดคงเหลือ */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <span className="w-2 h-2 rounded-full bg-[#FF9F43]" />
                ยอดคงเหลือ
              </span>
              <span className="text-[11px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700">
                {balancePercent}%
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-[#FF9F43] leading-tight">
              {totalBalance.toLocaleString()}{' '}
              <span className="text-xs font-medium text-amber-600">บาท</span>
            </p>
            <p className="text-[10px] text-amber-600/80">
              รอเรียกเก็บ / ชำระงวดจบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Financial Bar Chart (กราฟแท่งเปรียบเทียบ เดือนนี้ vs เดือนที่แล้ว) ─────── */
function FinancialBarChart({
  prevMonth,
  currMonth,
  prevLabel,
  currLabel,
}: {
  prevMonth: { sales: number; expenses: number; profit: number };
  currMonth: { sales: number; expenses: number; profit: number };
  prevLabel: string;
  currLabel: string;
}) {
  // Find highest value across both months for scaling bar heights
  const maxVal = Math.max(
    prevMonth.sales,
    currMonth.sales,
    prevMonth.expenses,
    currMonth.expenses,
    Math.abs(prevMonth.profit),
    Math.abs(currMonth.profit),
    1000
  );

  const formatShortAmount = (num: number) => {
    if (num === 0) return '0';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 100000) return `${sign}${(abs / 1000).toFixed(0)}k`;
    if (abs >= 10000) return `${sign}${(abs / 1000).toFixed(1)}k`;
    return `${sign}${abs.toLocaleString()}`;
  };

  const getDiffText = (curr: number, prev: number) => {
    const diff = curr - prev;
    if (prev === 0 && curr === 0) return '0%';
    if (prev === 0) return diff > 0 ? '+100%' : '0%';
    const pct = ((diff / Math.abs(prev)) * 100).toFixed(0);
    return `${diff >= 0 ? '+' : ''}${pct}%`;
  };

  const salesDiff = currMonth.sales - prevMonth.sales;
  const expDiff = currMonth.expenses - prevMonth.expenses;
  const profitDiff = currMonth.profit - prevMonth.profit;

  const metrics = [
    {
      id: 'sales',
      label: 'รายได้',
      prevVal: prevMonth.sales,
      currVal: currMonth.sales,
      diff: salesDiff,
      diffText: getDiffText(currMonth.sales, prevMonth.sales),
      prevColor: 'bg-[#6C5DD3]/30',
      currGradient: 'bg-gradient-to-t from-[#6C5DD3] to-[#8E78FB]',
      currText: 'text-[#6C5DD3]',
      isGoodPositive: true,
    },
    {
      id: 'expenses',
      label: 'รายจ่าย',
      prevVal: prevMonth.expenses,
      currVal: currMonth.expenses,
      diff: expDiff,
      diffText: getDiffText(currMonth.expenses, prevMonth.expenses),
      prevColor: 'bg-[#FF8A00]/30',
      currGradient: 'bg-gradient-to-t from-[#FF8A00] to-[#FFA742]',
      currText: 'text-[#FF8A00]',
      isGoodPositive: false,
    },
    {
      id: 'profit',
      label: 'กำไร',
      prevVal: prevMonth.profit,
      currVal: currMonth.profit,
      diff: profitDiff,
      diffText: getDiffText(currMonth.profit, prevMonth.profit),
      prevColor: 'bg-[#05CD99]/30',
      currGradient:
        currMonth.profit >= 0
          ? 'bg-gradient-to-t from-[#05CD99] to-[#20E4AB]'
          : 'bg-gradient-to-t from-rose-500 to-rose-400',
      currText: currMonth.profit >= 0 ? 'text-[#05CD99]' : 'text-rose-600',
      isGoodPositive: true,
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/50 shadow-xs space-y-3.5">
      {/* Header (ไม่มี icon ด้านหน้า และไม่มีแท็บ) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide">
            เปรียบเทียบการเงิน
          </h2>
          <p className="text-[11px] text-slate-400">
            {prevLabel} vs {currLabel}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> {prevLabel}
          </span>
          <span className="flex items-center gap-1.5 text-slate-800">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6C5DD3]" /> {currLabel}
          </span>
        </div>
      </div>

      {/* Main Comparative Bar Chart (3 Paired Groups - ปรับแท่งกว้างขึ้น มองเห็นชัดเจน) */}
      <div className="h-56 sm:h-64 flex items-end justify-around gap-2.5 sm:gap-5 pt-9 pb-3 px-2 sm:px-4 bg-white rounded-2xl border border-slate-200/50 relative">
        {/* Guideline lines */}
        <div className="absolute inset-x-3 top-9 border-b border-dashed border-slate-200/40 pointer-events-none" />
        <div className="absolute inset-x-3 top-1/2 border-b border-dashed border-slate-200/40 pointer-events-none" />

        {metrics.map((m) => {
          const isPositiveDiff = m.diff >= 0;
          const isGood = m.isGoodPositive ? isPositiveDiff : !isPositiveDiff;

          return (
            <div
              key={m.id}
              className="flex-1 flex flex-col items-center h-full justify-end max-w-[130px] sm:max-w-[160px]"
            >
              {/* Paired Bars (เดือนที่แล้ว vs เดือนนี้ - เพิ่มความกว้างของแท่งกราฟ) */}
              <div className="w-full flex items-end justify-center gap-1.5 sm:gap-3 h-full pb-1">
                {/* Bar 1: เดือนที่แล้ว */}
                <div className="flex flex-col items-center h-full justify-end flex-1 max-w-[38px] sm:max-w-[48px]">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 mb-1.5 leading-none text-center truncate max-w-full">
                    {formatShortAmount(m.prevVal)}
                  </span>
                  <div className="w-full bg-slate-100/70 rounded-t-xl h-full flex items-end overflow-hidden p-0.5 border border-slate-200/30">
                    <div
                      className={`w-full ${m.prevColor} rounded-t-lg transition-all duration-700`}
                      style={{ height: `${Math.max(6, (Math.max(0, m.prevVal) / maxVal) * 100)}%` }}
                      title={`${prevLabel}: ฿${m.prevVal.toLocaleString()}`}
                    />
                  </div>
                </div>

                {/* Bar 2: เดือนนี้ */}
                <div className="flex flex-col items-center h-full justify-end flex-1 max-w-[38px] sm:max-w-[48px]">
                  <span
                    className={`text-[10px] sm:text-xs font-black ${m.currText} mb-1.5 leading-none text-center truncate max-w-full`}
                  >
                    {formatShortAmount(m.currVal)}
                  </span>
                  <div className="w-full bg-slate-100/70 rounded-t-xl h-full flex items-end overflow-hidden p-0.5 border border-slate-200/30">
                    <div
                      className={`w-full ${m.currGradient} rounded-t-lg transition-all duration-700 shadow-xs`}
                      style={{ height: `${Math.max(6, (Math.max(0, m.currVal) / maxVal) * 100)}%` }}
                      title={`${currLabel}: ฿${m.currVal.toLocaleString()}`}
                    />
                  </div>
                </div>
              </div>

              {/* Metric Title */}
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-2 truncate max-w-full">
                {m.label}
              </span>

              {/* Diff Indicator Pill */}
              <span
                className={`text-[10px] sm:text-[11px] font-black mt-1 flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                  isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {isPositiveDiff ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {m.diffText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── สีขอบการ์ดคำสั่งซื้อตามสถานะ (ล้อกับสถานะ 10 ขั้นตอน มองเห็นได้ชัดเจน) ─── */
function getOrderStatusBorderClass(stepId: number): string {
  switch (stepId) {
    case 1: // รอชำระเงิน (Rose/Red)
      return 'border-2 border-rose-300 hover:border-rose-400';
    case 2: // มัดจำแล้ว (Purple)
      return 'border-2 border-purple-300 hover:border-purple-400';
    case 3: // รอดำเนินการ (ส้มเหลือง / Amber)
      return 'border-2 border-amber-300 hover:border-amber-400';
    case 4: // กำลังดำเนินการ (ส้มเหลือง / Amber)
      return 'border-2 border-amber-300 hover:border-amber-400';
    case 5: // จัดทำเสร็จสิ้น (Teal)
      return 'border-2 border-teal-300 hover:border-teal-400';
    case 6: // รอจัดส่ง (Indigo)
      return 'border-2 border-indigo-300 hover:border-indigo-400';
    case 7: // กำลังจัดส่ง (Cyan)
      return 'border-2 border-cyan-300 hover:border-cyan-400';
    case 8: // จัดส่งสำเร็จ (Emerald)
      return 'border-2 border-emerald-300 hover:border-emerald-400';
    case 9: // ชำระเงินส่วนที่เหลือ (Purple)
      return 'border-2 border-purple-300 hover:border-purple-400';
    case 10: // เสร็จสิ้น (Emerald Dark)
      return 'border-2 border-emerald-400 hover:border-emerald-500';
    default:
      return 'border-2 border-slate-200 hover:border-slate-300';
  }
}

/* ─── Swipeable Order Item Card (เลื่อนซ้ายเพื่อแสดงไอคอน ดินสอ และ ถังขยะ - Ultra Smooth & Lock) ──── */
function SwipeableOrderCard({
  order,
  isExpanded,
  onToggleExpand,
  handleStatusChange,
  onTimelineStatusChange,
  onDeliveryDateChange,
  onEdit,
  onDelete,
  isSwiped,
  onSwipeChange,
  isUpdating = false,
}: {
  order: OrderItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  handleStatusChange?: (
    rowNumber: number,
    paymentStatus: string,
    prodStatus: string,
    deliveryStatus: string,
    deliveryDate?: string
  ) => void;
  onTimelineStatusChange: (
    rowNumber: number,
    newStatus: string,
    paymentDetails?: {
      deposit?: number;
      balance?: number;
      paymentMethod?: string;
      paymentNote?: string;
    }
  ) => Promise<void> | void;
  onDeliveryDateChange?: (rowNumber: number, date: string) => Promise<void> | void;
  onEdit: (o: OrderItem) => void;
  onDelete: (o: OrderItem) => void;
  isSwiped: boolean;
  onSwipeChange: (swiped: boolean) => void;
  isUpdating?: boolean;
}) {
  const o = order;
  const cardRef = React.useRef<HTMLDivElement>(null);
  const startXRef = React.useRef(0);
  const startYRef = React.useRef(0);
  const currentXRef = React.useRef(0);
  const isHorizontalRef = React.useRef<boolean | null>(null);
  const isDraggingRef = React.useRef(false);
  const isSwipedRef = React.useRef(isSwiped);

  // Keep ref updated
  isSwipedRef.current = isSwiped;

  // Sync transform when parent changes isSwiped state (e.g. another card swiped)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
    if (isSwiped) {
      el.style.transform = 'translate3d(-120px, 0, 0)';
      currentXRef.current = -120;
    } else {
      el.style.transform = 'translate3d(0, 0, 0)';
      currentXRef.current = 0;
    }
  }, [isSwiped]);

  // Non-passive Touch Handlers: Guarantees 0-lag 120fps hardware composite and locks page from shifting
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      currentXRef.current = isSwipedRef.current ? -120 : 0;
      isHorizontalRef.current = null;
      isDraggingRef.current = true;
      el.style.transition = 'none';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const diffX = touch.clientX - startXRef.current;
      const diffY = touch.clientY - startYRef.current;

      if (isHorizontalRef.current === null) {
        if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
          isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      // If swiping horizontally, LOCK page scroll completely & slide card in real-time
      if (isHorizontalRef.current === true) {
        if (e.cancelable) {
          e.preventDefault();
        }
        const base = isSwipedRef.current ? -120 : 0;
        let newX = base + diffX;
        if (newX > 8) newX = 8;
        if (newX < -135) newX = -135;
        currentXRef.current = newX;
        el.style.transform = `translate3d(${newX}px, 0, 0)`;
      }
    };

    const onTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      if (isHorizontalRef.current === true) {
        el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
        const shouldOpen = currentXRef.current < -45;
        if (shouldOpen) {
          el.style.transform = 'translate3d(-120px, 0, 0)';
          currentXRef.current = -120;
          onSwipeChange(true);
        } else {
          el.style.transform = 'translate3d(0, 0, 0)';
          currentXRef.current = 0;
          onSwipeChange(false);
        }
      }
      isHorizontalRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [onSwipeChange]);

  // Desktop Mouse Drag Support
  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = isSwipedRef.current ? -120 : 0;
    isHorizontalRef.current = null;
    isDraggingRef.current = true;
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(diffX) > 6) {
        isHorizontalRef.current = true;
      }
    }

    if (isHorizontalRef.current && cardRef.current) {
      const base = isSwipedRef.current ? -120 : 0;
      let newX = base + diffX;
      if (newX > 8) newX = 8;
      if (newX < -135) newX = -135;
      currentXRef.current = newX;
      cardRef.current.style.transform = `translate3d(${newX}px, 0, 0)`;
    }
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const el = cardRef.current;
    if (el && isHorizontalRef.current) {
      el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
      const shouldOpen = currentXRef.current < -45;
      if (shouldOpen) {
        el.style.transform = 'translate3d(-120px, 0, 0)';
        currentXRef.current = -120;
        onSwipeChange(true);
      } else {
        el.style.transform = 'translate3d(0, 0, 0)';
        currentXRef.current = 0;
        onSwipeChange(false);
      }
    }
    isHorizontalRef.current = null;
  };

  const stepConfig = deduceTimelineStep(o);
  const statusBorderClass = getOrderStatusBorderClass(stepConfig.id);

  return (
    <div className="relative overflow-hidden rounded-3xl select-none touch-pan-y">
      {/* ── Action Buttons Revealed on Swipe Left (รูปดินสอ และ รูปถังขยะ) ── */}
      <div className="absolute inset-y-0 right-0 w-[120px] flex items-stretch z-0 bg-slate-200/90 rounded-r-3xl overflow-hidden">
        {/* รูปดินสอ (แก้ไข) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(o);
          }}
          className="flex-1 bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer"
          title="แก้ไขข้อมูลคำสั่งซื้อ"
        >
          <Pencil className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold">แก้ไข</span>
        </button>

        {/* รูปถังขยะ (ลบ) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(o);
          }}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer"
          title="ลบคำสั่งซื้อ"
        >
          <Trash2 className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold">ลบ</span>
        </button>
      </div>

      {/* ── Foreground Sliding Card (Hardware accelerated translate3d) ── */}
      <div
        ref={cardRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`bg-white rounded-3xl overflow-hidden relative z-10 will-change-transform ${statusBorderClass} shadow-xs touch-pan-y transition-colors`}
      >
        {/* Single-Row Header */}
        <div
          onClick={() => {
            if (isSwipedRef.current || Math.abs(currentXRef.current) > 20) {
              if (cardRef.current) {
                cardRef.current.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
                cardRef.current.style.transform = 'translate3d(0, 0, 0)';
              }
              currentXRef.current = 0;
              onSwipeChange(false);
              return;
            }
            onToggleExpand();
          }}
          className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
        >
          {/* Left: Info (No icon) */}
          <div className="min-w-0 flex-1">
            {/* แถวแรก: รายละเอียดสินค้า สีดำตัวใหญ่ ปรับใหญ่ขึ้น 20% */}
            <p className="text-[17px] font-bold text-slate-900 truncate leading-snug">
              {o.productDetails || 'ไม้พาเลท'}
            </p>
            {/* แถวที่สอง: ชื่อลูกค้า สีเทา ตัวบาง ตัวเล็ก พร้อมรหัสออเดอร์ */}
            <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
              {o.customerName} <span className="opacity-75">· #{o.orderId}</span>
            </p>
            {/* แถวที่สาม: วันที่สั่ง วันที่ส่ง */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
              <span>สั่ง: {formatThaiDate(o.orderDate)}</span>
              <span>·</span>
              <span className={o.deliveryDate ? 'text-amber-700 font-medium' : ''}>
                ส่ง: {o.deliveryDate ? formatThaiDate(o.deliveryDate) : 'ไม่ระบุ'}
              </span>
            </div>
          </div>

          {/* Right: Price (ยอดรวม/ยอดคงเหลือ สีม่วงและสีแดง), Timeline Step Pill, Mini Progress Bar, Chevron */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              {/* ยอดรวม / ยอดคงเหลือ (เช่น 1400/700 สีม่วงและสีแดง) */}
              <div
                className="flex items-baseline justify-end gap-1 leading-tight whitespace-nowrap"
                title={`ยอดรวม ${o.totalPrice.toLocaleString()} บาท / ยอดคงเหลือ ${o.balance.toLocaleString()} บาท`}
              >
                <span className="text-base sm:text-lg font-black text-[#6C5DD3]">
                  {o.totalPrice.toLocaleString()}
                </span>
                <span className="text-slate-300 font-bold text-xs sm:text-sm">/</span>
                <span
                  className={`text-base sm:text-lg font-black ${
                    o.balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {o.balance.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 flex justify-end">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${stepConfig.badgeBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stepConfig.dotColor} mr-1 animate-pulse`} />
                  {stepConfig.id}. {stepConfig.name}
                </span>
              </div>
              <div className="w-16 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden ml-auto">
                <div
                  className="h-full bg-gradient-to-r from-[#6C5DD3] to-emerald-500 rounded-full"
                  style={{ width: `${(stepConfig.id / 10) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-6 h-6 flex items-center justify-center text-slate-400">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180 text-[#6C5DD3]' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* ── Expanded Details (Revealed on click) ── */}
        {isExpanded && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="px-4 pb-4 pt-3 bg-white border-t border-slate-200/50 space-y-3 animate-fadeIn"
          >
            {/* Single Unified Details Box */}
            <div className="bg-white rounded-2xl p-4 space-y-3.5 border border-slate-200/50">
              {/* 1. รายละเอียดสินค้า */}
              <div>
                <span className="text-[10px] font-bold text-[#6C5DD3] uppercase tracking-wider block mb-1">
                  รายละเอียดสินค้า
                </span>
                <p className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                  {o.productDetails || 'ไม่ระบุรายการสินค้า'}
                </p>
              </div>

              {/* 2. ข้อมูลผู้สั่งซื้อ, เบอร์ติดต่อ, วันสั่งซื้อ, วันจัดส่ง, สถานที่จัดส่ง */}
              <div className="bg-white rounded-2xl p-3.5 space-y-2.5 text-xs border border-slate-200/50">
                {/* ผู้สั่งซื้อ & เบอร์ติดต่อ */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-medium">ข้อมูลผู้สั่งซื้อ</span>
                    <p className="font-bold text-slate-800 text-xs mt-0.5 truncate">{o.customerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-medium">เบอร์ติดต่อ</span>
                    {o.phone ? (
                      <a
                        href={`tel:${o.phone}`}
                        className="text-xs font-bold text-[#6C5DD3] hover:underline inline-flex items-center gap-1 mt-0.5"
                        title={`โทรหา ${o.customerName}: ${o.phone}`}
                      >
                        <Phone className="w-3 h-3 text-[#6C5DD3]" />
                        <span>{o.phone}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 mt-0.5 block">-</span>
                    )}
                  </div>
                </div>

                {/* วันสั่งซื้อ & วันจัดส่ง */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">วันสั่งซื้อ</span>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      {formatThaiDate(o.orderDate)}
                    </p>
                  </div>
                  <div className="relative group cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-800 font-bold block">วันจัดส่ง</span>
                      <span className="text-[9px] text-amber-600 font-medium">เปลี่ยนวัน ✏️</span>
                    </div>
                    <p className="text-xs font-black text-amber-900 mt-0.5">
                      {o.deliveryDate ? formatThaiDate(o.deliveryDate) : '⚠️ ยังไม่ระบุ'}
                    </p>
                    <input
                      type="date"
                      value={o.deliveryDate || ''}
                      onChange={(e) => {
                        if (onDeliveryDateChange) {
                          onDeliveryDateChange(o.rowNumber, e.target.value);
                        } else if (handleStatusChange) {
                          handleStatusChange(
                            o.rowNumber,
                            o.paymentStatus,
                            o.prodStatus,
                            o.deliveryStatus,
                            e.target.value
                          );
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="คลิกเพื่อเลือกหรือแก้ไขวันจัดส่ง"
                    />
                  </div>
                </div>

                {/* สถานที่จัดส่ง */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block font-medium">สถานที่จัดส่ง</span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5 leading-relaxed">
                    {o.address || 'รับเองหน้าร้าน / ไม่ได้ระบุสถานที่จัดส่ง'}
                    {o.deliveryMethod && (
                      <span className="text-[10px] text-slate-500 font-normal ml-1">
                        ({o.deliveryMethod})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* 3. ยอดเงิน 3 ส่วน: ยอดรวม, มัดจำ, คงเหลือ */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="py-1">
                  <span className="text-[10px] text-purple-700 font-bold block uppercase tracking-wider">
                    ยอดรวม
                  </span>
                  <p className="text-base sm:text-xl font-black text-[#6C5DD3] mt-0.5 leading-tight">
                    {o.totalPrice.toLocaleString()}
                  </p>
                </div>
                <div className="py-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                    มัดจำ
                  </span>
                  <p className="text-base sm:text-xl font-black text-slate-800 mt-0.5 leading-tight">
                    {o.deposit.toLocaleString()}
                  </p>
                </div>
                <div className="py-1">
                  <span className="text-[10px] text-rose-600 font-bold block uppercase tracking-wider">
                    คงเหลือ
                  </span>
                  <p
                    className={`text-base sm:text-xl font-black mt-0.5 leading-tight ${
                      o.balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {o.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Timeline Status Controller (10 ขั้นตอน พร้อมปุ่มอัปเดตและรายงาน) */}
            <OrderTimeline
              order={o}
              onUpdateStatus={onTimelineStatusChange}
              isUpdating={isUpdating}
            />

            {/* Quick Actions inside expanded view: Edit and Delete buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
              <button
                type="button"
                onClick={() => onEdit(o)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer border border-slate-200/50"
              >
                <Pencil className="w-3.5 h-3.5 text-[#6C5DD3]" /> แก้ไขข้อมูลคำสั่งซื้อ
              </button>
              <button
                type="button"
                onClick={() => onDelete(o)}
                className="py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> ลบออเดอร์
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



/* ─── Swipeable Expense Card (เลื่อนซ้ายเพื่อ แก้ไข/ลบ) ──── */
function SwipeableExpenseCard({
  expense,
  onEdit,
  onDelete,
  onPreviewBill,
  isSwiped,
  onSwipeChange,
}: {
  expense: ExpenseItem;
  onEdit: (e: ExpenseItem) => void;
  onDelete: (e: ExpenseItem) => void;
  onPreviewBill?: (e: ExpenseItem) => void;
  isSwiped: boolean;
  onSwipeChange: (swiped: boolean) => void;
}) {
  const e = expense;
  const cardRef = React.useRef<HTMLDivElement>(null);
  const startXRef = React.useRef(0);
  const startYRef = React.useRef(0);
  const currentXRef = React.useRef(0);
  const isHorizontalRef = React.useRef<boolean | null>(null);
  const isDraggingRef = React.useRef(false);
  const isSwipedRef = React.useRef(isSwiped);

  isSwipedRef.current = isSwiped;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
    if (isSwiped) {
      el.style.transform = 'translate3d(-120px, 0, 0)';
      currentXRef.current = -120;
    } else {
      el.style.transform = 'translate3d(0, 0, 0)';
      currentXRef.current = 0;
    }
  }, [isSwiped]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return;
      startXRef.current = ev.touches[0].clientX;
      startYRef.current = ev.touches[0].clientY;
      currentXRef.current = isSwipedRef.current ? -120 : 0;
      isHorizontalRef.current = null;
      isDraggingRef.current = true;
      el.style.transition = 'none';
    };

    const onTouchMove = (ev: TouchEvent) => {
      if (!isDraggingRef.current || ev.touches.length !== 1) return;
      const touch = ev.touches[0];
      const diffX = touch.clientX - startXRef.current;
      const diffY = touch.clientY - startYRef.current;

      if (isHorizontalRef.current === null) {
        if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
          isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      if (isHorizontalRef.current === true) {
        if (ev.cancelable) {
          ev.preventDefault();
        }
        const base = isSwipedRef.current ? -120 : 0;
        let newX = base + diffX;
        if (newX > 8) newX = 8;
        if (newX < -135) newX = -135;
        currentXRef.current = newX;
        el.style.transform = `translate3d(${newX}px, 0, 0)`;
      }
    };

    const onTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      if (isHorizontalRef.current === true) {
        el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
        const shouldOpen = currentXRef.current < -45;
        if (shouldOpen) {
          el.style.transform = 'translate3d(-120px, 0, 0)';
          currentXRef.current = -120;
          onSwipeChange(true);
        } else {
          el.style.transform = 'translate3d(0, 0, 0)';
          currentXRef.current = 0;
          onSwipeChange(false);
        }
      }
      isHorizontalRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [onSwipeChange]);

  const handleMouseDown = (ev: React.MouseEvent) => {
    startXRef.current = ev.clientX;
    startYRef.current = ev.clientY;
    currentXRef.current = isSwipedRef.current ? -120 : 0;
    isHorizontalRef.current = null;
    isDraggingRef.current = true;
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  };

  const handleMouseMove = (ev: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const diffX = ev.clientX - startXRef.current;
    const diffY = ev.clientY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(diffX) > 6) {
        isHorizontalRef.current = true;
      }
    }

    if (isHorizontalRef.current && cardRef.current) {
      const base = isSwipedRef.current ? -120 : 0;
      let newX = base + diffX;
      if (newX > 8) newX = 8;
      if (newX < -135) newX = -135;
      currentXRef.current = newX;
      cardRef.current.style.transform = `translate3d(${newX}px, 0, 0)`;
    }
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const el = cardRef.current;
    if (el && isHorizontalRef.current) {
      el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
      const shouldOpen = currentXRef.current < -45;
      if (shouldOpen) {
        el.style.transform = 'translate3d(-120px, 0, 0)';
        currentXRef.current = -120;
        onSwipeChange(true);
      } else {
        el.style.transform = 'translate3d(0, 0, 0)';
        currentXRef.current = 0;
        onSwipeChange(false);
      }
    }
    isHorizontalRef.current = null;
  };

  const catStyle = getExpenseCategoryStyle(e.category);

  return (
    <div className="relative overflow-hidden rounded-2xl select-none touch-pan-y">
      {/* ── Action Buttons Revealed on Swipe Left ── */}
      <div className="absolute inset-y-0 right-0 w-[120px] flex items-stretch z-0 bg-slate-200/90 rounded-r-2xl overflow-hidden">
        {/* รูปดินสอ (แก้ไข) */}
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            onEdit(e);
          }}
          className="flex-1 bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer"
          title="แก้ไขรายการค่าใช้จ่าย"
        >
          <Pencil className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold">แก้ไข</span>
        </button>

        {/* รูปถังขยะ (ลบ) */}
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            onDelete(e);
          }}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer"
          title="ลบรายการค่าใช้จ่าย"
        >
          <Trash2 className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold">ลบ</span>
        </button>
      </div>

      {/* ── Foreground Sliding Card ── */}
      <div
        ref={cardRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => {
          if (isSwipedRef.current || Math.abs(currentXRef.current) > 20) {
            if (cardRef.current) {
              cardRef.current.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
              cardRef.current.style.transform = 'translate3d(0, 0, 0)';
            }
            currentXRef.current = 0;
            onSwipeChange(false);
          }
        }}
        className="bg-white rounded-2xl p-4 flex items-center justify-between relative z-10 will-change-transform border border-slate-200/50 shadow-xs touch-pan-y cursor-pointer"
      >
        {/* Details (No icon) */}
        <div className="min-w-0 flex-1 mr-2">
          {/* แถวแรก: รายละเอียดสินค้า / รายการ สีดำตัวใหญ่ ปรับใหญ่ขึ้น 20% */}
          <p className="text-[17px] font-bold text-slate-900 truncate leading-snug">
            {e.itemName} <span className="text-slate-400 font-normal text-xs">({e.qty} {e.unit})</span>
          </p>
          {/* แถวที่สอง: ร้านค้า สีเทา ตัวบาง ตัวเล็ก */}
          <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
            {e.vendor} {e.billNo ? `· #${e.billNo}` : ''}
          </p>
          {/* แถวที่สาม: หมวดหมู่ และ วันที่ */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 flex-wrap">
            <span className={`font-bold flex items-center gap-1 bg-transparent border-0 ${catStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${catStyle.dot}`} />
              {e.category}
            </span>
            <span>·</span>
            <span>{formatThaiDate(e.billDate)}</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-base sm:text-lg font-black text-[#FF8A00] leading-tight">
            -{e.totalItemPrice.toLocaleString()}
          </p>
          {e.fileUrl && (
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                if (onPreviewBill) {
                  onPreviewBill(e);
                } else {
                  window.open(e.fileUrl, '_blank');
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6C5DD3] hover:text-[#5244ad] bg-purple-50 hover:bg-purple-100/80 px-2 py-0.5 rounded-lg border border-purple-200/70 transition-all cursor-pointer mt-1 active:scale-95 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" /> ดูบิล
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



/* ─── Main Application Component ─────────────────────── */
export default function SMEExpenseApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'expenses' | 'profile' | 'history'>('home');

  // Reference to Home tab white sheet & scroll state
  const homeWhiteSheetRef = useRef<HTMLElement | null>(null);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);

  // Monitor scroll position on Home tab
  useEffect(() => {
    if (activeTab !== 'home') {
      setIsScrolledPastHero(false);
      return;
    }

    const checkScroll = () => {
      if (homeWhiteSheetRef.current) {
        const rect = homeWhiteSheetRef.current.getBoundingClientRect();
        // When top of white sheet reaches status bar area (<= 54px)
        setIsScrolledPastHero(rect.top <= 54);
      } else {
        setIsScrolledPastHero(window.scrollY > 280);
      }
    };

    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, [activeTab]);

  // Compute current top color:
  // On Home: #0E0B22 at top, #ffffff when scrolled down into white sheet
  // On Orders, Expenses, History, Profile: #ffffff
  const currentTopColor = useMemo(() => {
    if (activeTab === 'home') {
      return isScrolledPastHero ? '#ffffff' : '#0E0B22';
    }
    return '#ffffff';
  }, [activeTab, isScrolledPastHero]);

  // Sync top browser bar / status bar color dynamically
  useEffect(() => {
    document.body.style.backgroundColor = currentTopColor;
    document.documentElement.style.backgroundColor = currentTopColor;

    // Force update meta[name="theme-color"] (remove existing and re-insert)
    const existingTags = document.querySelectorAll('meta[name="theme-color"]');
    existingTags.forEach((t) => t.remove());

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', currentTopColor);
    document.head.appendChild(meta);
  }, [currentTopColor]);

  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  // User Authentication & Multi-Tenant State (Phase 1)
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<{
    businessName?: string;
    role?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    tagline?: string;
    categories?: string[];
    deliveryMethods?: string[];
    logoUrl?: string;
  } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initialize and listen to Supabase Auth state changes
  useEffect(() => {
    let mounted = true;
    let authSub: { unsubscribe: () => void } | null = null;

    try {
      const supabase = getBrowserSupabaseClient();

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!mounted) return;
          if (session?.user) {
            setCurrentUser(session.user);
            setAuthToken(session.access_token);
            if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          } else {
            setCurrentUser(null);
            setAuthToken(null);
          }
        })
        .catch((err) => {
          console.warn('Session check error:', err);
        });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setCurrentUser(session.user);
          setAuthToken(session.access_token);
          if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          setCurrentUser(null);
          setAuthToken(null);
          setUserProfile(null);
        }
      });
      authSub = data.subscription;
    } catch (e) {
      console.warn('Supabase auth listener initialization error:', e);
    }

    return () => {
      mounted = false;
      if (authSub) authSub.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
      setCurrentUser(null);
      setAuthToken(null);
      setUserProfile(null);
      showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    } catch (err: any) {
      showToast('ไม่สามารถออกจากระบบได้: ' + err.message, 'error');
    }
  };

  // Authenticated fetch wrapper passing Bearer token
  const apiFetch = React.useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      return fetch(input, { ...init, headers });
    },
    [authToken]
  );
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  // Phase 2: Online / Offline Network Monitor
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Phase 2: Restore data immediately from LocalStorage SWR Cache (0ms Instant Display)
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const cachedRaw = localStorage.getItem(`sme_cache_data_${currentUser.id}`);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (Array.isArray(cached.orders) && cached.orders.length > 0) {
          setOrders((prev) => (prev.length === 0 ? cached.orders : prev));
        }
        if (Array.isArray(cached.expenses) && cached.expenses.length > 0) {
          setExpenses((prev) => (prev.length === 0 ? cached.expenses : prev));
        }
      }
    } catch (e) {
      console.warn('Cache restoration warning:', e);
    }
  }, [currentUser]);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [orderFilter, setOrderFilter] = useState<
    | 'ALL'
    | 'PAYMENT'
    | 'PRODUCTION'
    | 'DELIVERY'
    | 'COMPLETED'
    | 'ACTION_PENDING_DEPOSIT'
    | 'ACTION_OVERDUE'
    | 'ACTION_PENDING_BALANCE'
    | 'ACTION_READY_FOR_DELIVERY'
  >('ALL');
  const [updatingOrderRow, setUpdatingOrderRow] = useState<number | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<OrderItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [swipedOrderRow, setSwipedOrderRow] = useState<number | null>(null);

  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<ExpenseItem | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [swipedExpenseRow, setSwipedExpenseRow] = useState<number | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [previewBill, setPreviewBill] = useState<{
    url: string;
    vendor?: string;
    itemName?: string;
    billNo?: string;
    amount?: number;
    date?: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ORDERS' | 'EXPENSES'>('ALL');
  const [historyExpenseCat, setHistoryExpenseCat] = useState('ALL');
  const [historyOrderStatus, setHistoryOrderStatus] = useState('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(DEFAULT_DELIVERY_METHODS);
  const [storeDetails, setStoreDetails] = useState({
    phone: '',
    address: '',
    taxId: '',
    tagline: '',
  });

  // Load saved store logo & settings per user
  useEffect(() => {
    try {
      if (currentUser?.id) {
        const userLogo = localStorage.getItem(`sme_store_logo_${currentUser.id}`);
        if (userLogo) setStoreLogo(userLogo);

        const savedSettingsRaw = localStorage.getItem(`sme_store_settings_${currentUser.id}`);
        if (savedSettingsRaw) {
          const parsed = JSON.parse(savedSettingsRaw);
          if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
            setExpenseCategories(parsed.categories);
          }
          if (Array.isArray(parsed.deliveryMethods) && parsed.deliveryMethods.length > 0) {
            setDeliveryMethods(parsed.deliveryMethods);
          }
          setStoreDetails({
            phone: parsed.phone || '',
            address: parsed.address || '',
            taxId: parsed.taxId || '',
            tagline: parsed.tagline || '',
          });
          if (parsed.logoUrl !== undefined) setStoreLogo(parsed.logoUrl);
          return;
        }
      }

      const saved = localStorage.getItem('sme_store_logo');
      if (saved) setStoreLogo(saved);
      else setStoreLogo(null);

      const generalSettings = localStorage.getItem('sme_store_settings');
      if (generalSettings) {
        const parsed = JSON.parse(generalSettings);
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          setExpenseCategories(parsed.categories);
        }
        if (Array.isArray(parsed.deliveryMethods) && parsed.deliveryMethods.length > 0) {
          setDeliveryMethods(parsed.deliveryMethods);
        }
        setStoreDetails({
          phone: parsed.phone || '',
          address: parsed.address || '',
          taxId: parsed.taxId || '',
          tagline: parsed.tagline || '',
        });
      }
    } catch {}
  }, [currentUser]);

  const handleSaveStoreSettings = async (newSettings: StoreSettingsData) => {
    // 1. Update React state immediately
    setUserProfile((prev) => ({
      ...(prev || {}),
      businessName: newSettings.businessName,
      phone: newSettings.phone,
    }));
    setStoreLogo(newSettings.logoUrl);
    setExpenseCategories(newSettings.categories);
    setDeliveryMethods(newSettings.deliveryMethods);
    setStoreDetails({
      phone: newSettings.phone,
      address: newSettings.address,
      taxId: newSettings.taxId,
      tagline: newSettings.tagline,
    });

    // 2. Persist to localStorage
    try {
      const storageKey = currentUser?.id ? `sme_store_settings_${currentUser.id}` : 'sme_store_settings';
      localStorage.setItem(storageKey, JSON.stringify(newSettings));
      if (newSettings.logoUrl) {
        if (currentUser?.id) {
          localStorage.setItem(`sme_store_logo_${currentUser.id}`, newSettings.logoUrl);
        }
        localStorage.setItem('sme_store_logo', newSettings.logoUrl);
      } else {
        if (currentUser?.id) {
          localStorage.removeItem(`sme_store_logo_${currentUser.id}`);
        }
        localStorage.removeItem('sme_store_logo');
      }
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }

    // 3. Persist to Supabase if logged in
    if (currentUser) {
      try {
        const supabase = getBrowserSupabaseClient();
        
        // Never put base64 images into JWT user_metadata to avoid HTTP 431 Request Header Too Large
        const metaToUpdate: Record<string, any> = {
          business_name: newSettings.businessName,
          phone: newSettings.phone,
          address: newSettings.address,
          tax_id: newSettings.taxId,
          tagline: newSettings.tagline,
          categories: newSettings.categories,
          delivery_methods: newSettings.deliveryMethods,
        };
        if (newSettings.logoUrl && !newSettings.logoUrl.startsWith('data:')) {
          metaToUpdate.logo_url = newSettings.logoUrl;
        } else {
          metaToUpdate.logo_url = null;
        }

        await supabase.auth.updateUser({
          data: metaToUpdate,
        });

        try {
          await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            business_name: newSettings.businessName,
            phone: newSettings.phone,
            address: newSettings.address,
            tax_id: newSettings.taxId,
            tagline: newSettings.tagline,
            logo_url: newSettings.logoUrl || '',
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Ignore if profile columns do not exist
        }
      } catch (authErr: any) {
        console.warn('Supabase profile sync warning:', authErr);
      }
    }

    showToast('บันทึกการตั้งค่าร้านค้าเรียบร้อยแล้ว ✨', 'success');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    if (rawFile.size > 10 * 1024 * 1024) {
      showToast('ไฟล์ภาพมีขนาดใหญ่เกิน 10MB', 'error');
      return;
    }

    // Phase 2: Downscale & compress logo image to 400x400
    const file = await compressImageFile(rawFile, { maxWidth: 400, maxHeight: 400, quality: 0.85 });

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setStoreLogo(base64);
      try {
        if (currentUser?.id) {
          localStorage.setItem(`sme_store_logo_${currentUser.id}`, base64);
        }
        localStorage.setItem('sme_store_logo', base64);
        showToast('อัปเดตรูปภาพร้านของคุณเรียบร้อยแล้ว', 'success');
      } catch {
        showToast('อัปเดตรูปภาพสำเร็จ (ขนาดรูปใหญ่เกินพื้นที่จัดเก็บบราวเซอร์)', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const blankOrder = {
    customerName: '',
    phone: '',
    address: '',
    productDetails: '',
    orderDate: getLocalDateString(),
    deliveryDate: '',
    deliveryMethod: 'รถกระบะร้าน',
    orderStatus: 'มัดจำแล้ว',
    prodStatus: 'รอดำเนินการ',
    paymentStatus: 'มัดจำแล้ว',
    deliveryStatus: 'รอจัดส่ง',
    totalPrice: '',
    deposit: '',
    note: '',
  };
  const [newOrder, setNewOrder] = useState(blankOrder);

  interface ExpenseSubItem {
    id: string;
    category: string;
    itemName: string;
    qty: number | string;
    unit: string;
    unitPrice: number | string;
    totalItemPrice: number | string;
  }

  const blankExpenseForm = {
    vendor: '',
    billDate: getLocalDateString(),
    paymentMethod: 'โอนเงิน',
    billNo: '',
    note: '',
  };
  const [expenseForm, setExpenseForm] = useState(blankExpenseForm);

  const createBlankSubItem = (cat = 'ไม้พาเลท/วัตถุดิบ'): ExpenseSubItem => ({
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    category: cat,
    itemName: '',
    qty: '',
    unit: '',
    unitPrice: '',
    totalItemPrice: '',
  });

  const [expenseItems, setExpenseItems] = useState<ExpenseSubItem[]>([createBlankSubItem()]);
  const [billFile, setBillFile] = useState<File | null>(null);

  // สรุปยอดเงินรวมทุกรายการย่อยในบิล
  const totalBillAmount = useMemo(() => {
    return expenseItems.reduce((sum, it) => {
      const price = Number(it.totalItemPrice) || (Number(it.qty) * (Number(it.unitPrice) || 0)) || 0;
      return sum + price;
    }, 0);
  }, [expenseItems]);

  const handleUpdateSubItem = (id: string, patch: Partial<ExpenseSubItem>) => {
    setExpenseItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return { ...it, ...patch };
      })
    );
  };

  const handleAddSubItem = () => {
    setExpenseItems((prev) => [...prev, createBlankSubItem()]);
  };

  const handleRemoveSubItem = (id: string) => {
    setExpenseItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  /* ─── Fetch Data ───────────────────────────────────── */
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = '/api/data';
      const res = await apiFetch(endpoint, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`เซิร์ฟเวอร์ตอบกลับสถานะ ${res.status}`);
      }
      const data = await res.json();
      setIsConfigured(Boolean(data.isConfigured));
      if (data.user) {
        setUserProfile(data.user);
        if (Array.isArray(data.user.categories) && data.user.categories.length > 0) {
          setExpenseCategories(data.user.categories);
        }
        if (Array.isArray(data.user.deliveryMethods) && data.user.deliveryMethods.length > 0) {
          setDeliveryMethods(data.user.deliveryMethods);
        }
        setStoreDetails((prev) => ({
          phone: data.user.phone ?? prev.phone,
          address: data.user.address ?? prev.address,
          taxId: data.user.taxId ?? prev.taxId,
          tagline: data.user.tagline ?? prev.tagline,
        }));
        if (data.user.logoUrl) {
          setStoreLogo(data.user.logoUrl);
        }
      }
      if (Array.isArray(data.orders)) setOrders(data.orders);
      if (Array.isArray(data.expenses)) setExpenses(data.expenses);

      // Phase 2: Cache to LocalStorage for Instant Stale-While-Revalidate Next Load
      if (currentUser?.id && (data.orders || data.expenses)) {
        try {
          localStorage.setItem(
            `sme_cache_data_${currentUser.id}`,
            JSON.stringify({
              orders: data.orders || [],
              expenses: data.expenses || [],
              savedAt: Date.now(),
            })
          );
        } catch {}
      }
    } catch (err: any) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData, authToken]);

  // Phase 2: Online / Offline Network Monitor
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      showToast('🌐 กลับมาเชื่อมต่ออินเทอร์เน็ตแล้ว กำลังอัปเดตข้อมูล...', 'info');
      fetchData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('📴 คุณกำลังออฟไลน์ (ระบบจะแสดงข้อมูลล่าสุดจากแคชในเครื่อง)', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData]);

  /* ─── Months List ──────────────────────────────────── */
  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    const current = getLocalDateString().substring(0, 7);
    s.add(current);
    orders.forEach((o) => {
      const ym = extractYearMonth(o.orderDate);
      if (ym) s.add(ym);
    });
    expenses.forEach((e) => {
      const ym = extractYearMonth(e.month || e.billDate);
      if (ym) s.add(ym);
    });
    return Array.from(s).sort().reverse();
  }, [orders, expenses]);

  /* ─── Calculations ─────────────────────────────────── */
  const monthOrders = useMemo(() => {
    if (selectedMonth === 'ALL') return orders;
    return orders.filter((o) => extractYearMonth(o.orderDate) === selectedMonth);
  }, [orders, selectedMonth]);

  const monthExpenses = useMemo(() => {
    if (selectedMonth === 'ALL') return expenses;
    return expenses.filter((e) => extractYearMonth(e.month || e.billDate) === selectedMonth);
  }, [expenses, selectedMonth]);

  // ─── ตรวจสอบและคำนวณยอดขาย ยอดมัดจำ/รับชำระแล้ว และยอดคงเหลืออย่างถูกต้องแม่นยำ ───
  const { totalSales, totalDeposit, totalBalance, depositPercent, balancePercent } = useMemo(() => {
    let sales = 0;
    let deposit = 0;
    let balance = 0;

    for (const o of monthOrders) {
      const orderTotal = Number(o.totalPrice) || 0;
      sales += orderTotal;

      const isCompletedOrPaid =
        o.orderStatus === 'เสร็จสิ้น' ||
        o.paymentStatus === 'ชำระครบแล้ว' ||
        (o.balance !== undefined && Number(o.balance) === 0);

      // ยอดคงเหลือที่ยังรอชำระ
      const rem = isCompletedOrPaid
        ? 0
        : Math.max(0, o.balance !== undefined ? Number(o.balance) : (orderTotal - (Number(o.deposit) || 0)));

      // ยอดมัดจำ / รับชำระแล้ว (ยอดรวม - ยอดคงเหลือ)
      const dep = Math.max(0, orderTotal - rem);

      balance += rem;
      deposit += dep;
    }

    const depPct = sales > 0 ? (deposit / sales) * 100 : 0;
    const balPct = sales > 0 ? (balance / sales) * 100 : 0;

    return {
      totalSales: sales,
      totalDeposit: deposit,
      totalBalance: balance,
      depositPercent: Math.round(depPct * 10) / 10,
      balancePercent: Math.round(balPct * 10) / 10,
    };
  }, [monthOrders]);

  const totalExpense = useMemo(() => monthExpenses.reduce((acc, e) => acc + (Number(e.totalItemPrice) || 0), 0), [monthExpenses]);
  const grossProfit = totalSales - totalExpense;
  const expenseRatio = totalSales > 0 ? (totalExpense / totalSales) * 100 : 0;

  /* ─── Month Comparison Data for Financial Bar Chart (เดือนนี้ vs เดือนที่แล้ว) ─── */
  const monthComparisonData = useMemo(() => {
    // Current active month key
    const currKey = selectedMonth !== 'ALL' ? selectedMonth : getLocalDateString().substring(0, 7);

    // Calculate previous month key
    const getPrevMonthKey = (ym: string) => {
      const parts = ym.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!year || !month) return '';
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    };

    const prevKey = getPrevMonthKey(currKey);

    // Filter current month
    const currO = orders.filter((o) => extractYearMonth(o.orderDate) === currKey);
    const currE = expenses.filter((e) => extractYearMonth(e.month || e.billDate) === currKey);
    const currSales = currO.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const currExpenses = currE.reduce((sum, e) => sum + (Number(e.totalItemPrice) || 0), 0);
    const currProfit = currSales - currExpenses;

    // Filter previous month
    const prevO = orders.filter((o) => extractYearMonth(o.orderDate) === prevKey);
    const prevE = expenses.filter((e) => extractYearMonth(e.month || e.billDate) === prevKey);
    const prevSales = prevO.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const prevExpenses = prevE.reduce((sum, e) => sum + (Number(e.totalItemPrice) || 0), 0);
    const prevProfit = prevSales - prevExpenses;

    return {
      currKey,
      prevKey,
      currLabel: `เดือนนี้ (${formatThaiMonthShort(currKey)})`,
      prevLabel: `เดือนที่แล้ว (${formatThaiMonthShort(prevKey)})`,
      curr: { sales: currSales, expenses: currExpenses, profit: currProfit },
      prev: { sales: prevSales, expenses: prevExpenses, profit: prevProfit },
    };
  }, [selectedMonth, orders, expenses]);

  /* Toggle Order Expansion */
  const toggleExpandOrder = (rowNum: number) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) {
        next.delete(rowNum);
      } else {
        next.add(rowNum);
      }
      return next;
    });
  };

  /* Workflow Stage Counts for Filter Badges (10 ขั้นตอน จัดกลุ่ม 4 หมวด) กรองตามเดือนที่เลือก */
  const stepCounts = useMemo(() => {
    let payment = 0;
    let production = 0;
    let delivery = 0;
    let completed = 0;

    for (const o of monthOrders) {
      const step = deduceTimelineStep(o);
      if (step.name === 'เสร็จสิ้น' || step.id === 10) {
        completed++;
      } else if (step.id <= 2) {
        payment++;
      } else if (
        step.id === 5 ||
        step.id === 6 ||
        step.name === 'จัดทำเสร็จสิ้น' ||
        step.name === 'รอจัดส่ง'
      ) {
        delivery++;
      } else if (step.id <= 4) {
        production++;
      }
    }

    const activeTotal = payment + production + delivery;

    return {
      payment,
      production,
      delivery,
      completed,
      activeTotal,
      total: monthOrders.length,
    };
  }, [monthOrders]);

  /* ─── Action Items for 1-Row 3-Button Shortcut Cards (สิ่งที่ต้องดำเนินการ) ─── */
  const actionItems = useMemo(() => {
    const todayStr = getLocalDateString();

    // 1. ยังไม่มัดจำ: ออเดอร์ที่ยังไม่เสร็จสิ้น และ (deposit <= 0 หรือ step.id <= 1 หรือ step.name === 'รอชำระเงิน' หรือ paymentStatus === 'รอชำระ')
    const pendingDeposit = monthOrders.filter((o) => {
      const step = deduceTimelineStep(o);
      const isCompleted =
        step.name === 'เสร็จสิ้น' ||
        step.id === 10 ||
        o.orderStatus === 'เสร็จสิ้น' ||
        o.paymentStatus === 'ชำระครบแล้ว';
      if (isCompleted) return false;
      const dep = Number(o.deposit) || 0;
      return dep === 0 || step.id === 1 || step.name === 'รอชำระเงิน' || o.paymentStatus === 'รอชำระ';
    });

    // 2. งานที่ล่าช้าเกินกำหนดส่ง หรือถึงกำหนดส่งวันนี้ (step.id < 8 และไม่ใช่ออเดอร์เสร็จสิ้น)
    const overdueOrDueToday = monthOrders.filter((o) => {
      const step = deduceTimelineStep(o);
      const isCompleted =
        step.name === 'เสร็จสิ้น' ||
        step.id === 10 ||
        o.orderStatus === 'เสร็จสิ้น' ||
        o.paymentStatus === 'ชำระครบแล้ว';
      if (isCompleted) return false;
      if (!o.deliveryDate) return false;
      const cleanDate = o.deliveryDate.substring(0, 10);
      return cleanDate <= todayStr && step.id < 8;
    });

    // 3. ติดตามยอดเงินงวดสุดท้าย / งานที่เสร็จแล้วแต่รอปิดยอด
    const pendingBalance = monthOrders.filter((o) => {
      const step = deduceTimelineStep(o);
      const isCompleted =
        step.name === 'เสร็จสิ้น' ||
        step.id === 10 ||
        o.orderStatus === 'เสร็จสิ้น' ||
        o.paymentStatus === 'ชำระครบแล้ว';
      if (isCompleted) return false;
      const hasBalance = (Number(o.balance) || 0) > 0;
      return (hasBalance && step.id >= 6) || step.id === 8 || step.id === 9;
    });

    const totalPendingBalanceAmount = pendingBalance.reduce(
      (sum, o) => sum + (Number(o.balance) || 0),
      0
    );

    return {
      pendingDeposit,
      overdueOrDueToday,
      pendingBalance,
      totalPendingBalanceAmount,
    };
  }, [monthOrders]);

  /* Filtered Lists (กรองตามเดือนที่เลือก) */
  const filteredOrders = useMemo(() => {
    return monthOrders.filter((o) => {
      const step = deduceTimelineStep(o);
      const isCompleted =
        step.name === 'เสร็จสิ้น' ||
        step.id === 10 ||
        o.orderStatus === 'เสร็จสิ้น' ||
        o.paymentStatus === 'ชำระครบแล้ว';

      let matchesStatus = true;
      if (orderFilter === 'ALL') {
        // เมื่อกดเข้ามาหน้าคำสั่งซื้อ จะไม่แสดงรายการที่เสร็จสิ้นแล้ว
        matchesStatus = !isCompleted;
      } else if (orderFilter === 'PAYMENT') {
        matchesStatus = step.id <= 2 && !isCompleted;
      } else if (orderFilter === 'PRODUCTION') {
        matchesStatus = step.id >= 3 && step.id <= 4 && !isCompleted;
      } else if (orderFilter === 'DELIVERY' || orderFilter === 'ACTION_READY_FOR_DELIVERY') {
        // กรองเฉพาะ: จัดทำเสร็จแล้ว หรือรอจัดส่ง (คำสั่งลัด "รอส่งมอบ" จากหน้าแรก)
        matchesStatus =
          !isCompleted &&
          (step.id === 5 ||
            step.id === 6 ||
            step.name === 'จัดทำเสร็จสิ้น' ||
            step.name === 'รอจัดส่ง');
      } else if (orderFilter === 'COMPLETED') {
        matchesStatus = isCompleted;
      } else if (orderFilter === 'ACTION_PENDING_DEPOSIT') {
        // กรองเฉพาะ: ยังไม่มัดจำ (คำสั่งลัดจากหน้าแรก)
        const dep = Number(o.deposit) || 0;
        matchesStatus = !isCompleted && (dep === 0 || step.id === 1 || step.name === 'รอชำระเงิน' || o.paymentStatus === 'รอชำระ');
      } else if (orderFilter === 'ACTION_OVERDUE') {
        // กรองเฉพาะ: เกินกำหนดส่ง หรือถึงกำหนดส่งวันนี้ (คำสั่งลัดจากหน้าแรก)
        const todayStr = getLocalDateString();
        const cleanDate = (o.deliveryDate || '').substring(0, 10);
        matchesStatus = !isCompleted && Boolean(cleanDate) && cleanDate <= todayStr && step.id < 8;
      } else if (orderFilter === 'ACTION_PENDING_BALANCE') {
        // กรองเฉพาะ: ตามยอดงวดจบ (คำสั่งลัดจากหน้าแรก)
        const hasBalance = (Number(o.balance) || 0) > 0;
        matchesStatus = !isCompleted && ((hasBalance && step.id >= 6) || step.id === 8 || step.id === 9);
      }

      const query = orderSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        [
          o.customerName,
          o.orderId,
          o.phone,
          o.productDetails,
          step.name,
          o.prodStatus,
          o.deliveryStatus,
          o.paymentStatus,
        ].some((field) => field?.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [monthOrders, orderFilter, orderSearch]);

  const filteredExpenses = useMemo(() => {
    const list = monthExpenses.filter((e) => {
      const matchesCategory = expenseCategoryFilter === 'ALL' || e.category === expenseCategoryFilter;
      const query = expenseSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        [e.itemName, e.vendor, e.billNo].some((field) =>
          field?.toLowerCase().includes(query)
        );
      return matchesCategory && matchesSearch;
    });

    // แสดงรายการล่าสุดอยู่ด้านบน เรียงจากบน ลงล่าง
    return list.sort((a, b) => {
      const dateA = a.billDate ? new Date(a.billDate).getTime() : 0;
      const dateB = b.billDate ? new Date(b.billDate).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return (b.rowNumber || 0) - (a.rowNumber || 0);
    });
  }, [monthExpenses, expenseCategoryFilter, expenseSearch]);

  const modalBalance = Math.max(0, (Number(newOrder.totalPrice) || 0) - (Number(newOrder.deposit) || 0));

  const totalOrdersAmount = useMemo(() => {
    return monthOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  }, [monthOrders]);

  const totalExpensesAmount = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + (Number(e.totalItemPrice) || 0), 0);
  }, [monthExpenses]);

  const totalFilteredExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.totalItemPrice) || 0), 0);
  }, [filteredExpenses]);

  // แสดงรายการล่าสุด 5 รายการ เรียงจากล่าสุดอยู่ด้านบน (กรองตามเดือนที่เลือก)
  const latestTransactions = useMemo(() => {
    type RecentEntry =
      | { type: 'order'; date: string; key: string; order: OrderItem }
      | { type: 'expense'; date: string; key: string; expense: ExpenseItem };

    const list: RecentEntry[] = [];
    monthOrders.forEach((o) => {
      list.push({
        type: 'order',
        date: o.orderDate || '',
        key: `recent-order-${o.orderId}-${o.rowNumber}`,
        order: o,
      });
    });
    monthExpenses.forEach((e) => {
      list.push({
        type: 'expense',
        date: e.billDate || '',
        key: `recent-exp-${e.rowNumber}-${e.billNo}`,
        expense: e,
      });
    });

    list.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      const rowA = a.type === 'order' ? a.order.rowNumber : a.expense.rowNumber;
      const rowB = b.type === 'order' ? b.order.rowNumber : b.expense.rowNumber;
      return (rowB || 0) - (rowA || 0);
    });

    return list.slice(0, 5);
  }, [monthOrders, monthExpenses]);

  const combinedHistory = useMemo(() => {
    type HistoryEntry =
      | { type: 'order'; date: string; key: string; order: OrderItem }
      | { type: 'expense'; date: string; key: string; expense: ExpenseItem };

    const list: HistoryEntry[] = [];

    monthOrders.forEach((o) => {
      list.push({
        type: 'order',
        date: o.orderDate || '',
        key: `order-${o.orderId}-${o.rowNumber}`,
        order: o,
      });
    });

    monthExpenses.forEach((e) => {
      list.push({
        type: 'expense',
        date: e.billDate || '',
        key: `expense-${e.rowNumber}-${e.billNo}`,
        expense: e,
      });
    });

    // Sort newest date first
    list.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    return list.filter((item) => {
      if (historyFilter === 'ORDERS' && item.type !== 'order') return false;
      if (historyFilter === 'EXPENSES' && item.type !== 'expense') return false;

      if (historyFilter === 'EXPENSES' && historyExpenseCat !== 'ALL') {
        if (item.type !== 'expense' || item.expense.category !== historyExpenseCat) return false;
      }

      if (historyFilter === 'ORDERS' && historyOrderStatus !== 'ALL') {
        if (item.type !== 'order') return false;
        const o = item.order;
        if (historyOrderStatus === 'รอชำระ') {
          if (o.paymentStatus !== 'รอชำระ') return false;
        } else if (
          historyOrderStatus === 'กำลังจัดทำ' ||
          historyOrderStatus === 'จัดทำเสร็จสิ้น' ||
          historyOrderStatus === 'รอดำเนินการ'
        ) {
          if (o.prodStatus !== historyOrderStatus) return false;
        } else if (
          historyOrderStatus === 'รอจัดส่ง' ||
          historyOrderStatus === 'กำลังจัดส่ง' ||
          historyOrderStatus === 'จัดส่งเสร็จสิ้น' ||
          historyOrderStatus === 'จัดส่งสำเร็จ'
        ) {
          if (o.deliveryStatus !== historyOrderStatus) return false;
        }
      }

      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase().trim();
      if (item.type === 'order') {
        return [
          item.order.customerName,
          item.order.orderId,
          item.order.productDetails,
          item.order.phone,
          item.order.prodStatus,
          item.order.paymentStatus,
        ].some((s) => s?.toLowerCase().includes(q));
      } else {
        return [
          item.expense.itemName,
          item.expense.vendor,
          item.expense.billNo,
          item.expense.category,
        ].some((s) => s?.toLowerCase().includes(q));
      }
    });
  }, [monthOrders, monthExpenses, historyFilter, historyExpenseCat, historyOrderStatus, historySearch]);

  /* ─── Handlers ─────────────────────────────────────── */
  const handleTimelineStatusChange = async (
    rowNumber: number,
    newStatus: string,
    paymentDetails?: {
      deposit?: number;
      balance?: number;
      paymentMethod?: string;
      paymentNote?: string;
    }
  ) => {
    const step = getStepByName(newStatus);
    const prevOrders = [...orders];

    setUpdatingOrderRow(rowNumber);

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) =>
        o.rowNumber === rowNumber
          ? {
              ...o,
              orderStatus: step.name,
              paymentStatus: step.legacy.paymentStatus,
              prodStatus: step.legacy.prodStatus,
              deliveryStatus: step.legacy.deliveryStatus,
              ...(paymentDetails?.deposit !== undefined ? { deposit: paymentDetails.deposit } : {}),
              ...(paymentDetails?.balance !== undefined ? { balance: paymentDetails.balance } : {}),
              ...(step.name === 'ชำระเงินส่วนที่เหลือ' || step.name === 'เสร็จสิ้น' ? { balance: 0 } : {}),
              ...(paymentDetails?.paymentNote
                ? { note: o.note ? `${o.note} · ${paymentDetails.paymentNote}` : paymentDetails.paymentNote }
                : {}),
            }
          : o
      )
    );

    try {
      const res = await apiFetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowNumber,
          orderStatus: step.name,
          ...(paymentDetails?.deposit !== undefined ? { deposit: paymentDetails.deposit } : {}),
          ...(paymentDetails?.balance !== undefined ? { balance: paymentDetails.balance } : {}),
          ...(paymentDetails?.paymentMethod ? { paymentMethod: paymentDetails.paymentMethod } : {}),
          ...(paymentDetails?.paymentNote ? { paymentNote: paymentDetails.paymentNote } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Update failed');
      showToast(`อัปเดตขั้นตอนเป็น "${step.name}" เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      setOrders(prevOrders);
      showToast('ไม่สามารถอัปเดตได้: ' + err.message, 'error');
    } finally {
      setUpdatingOrderRow(null);
    }
  };

  const handleDeliveryDateChange = async (rowNumber: number, deliveryDate: string) => {
    const prevOrders = [...orders];
    setOrders((prev) =>
      prev.map((o) => (o.rowNumber === rowNumber ? { ...o, deliveryDate } : o))
    );

    try {
      const res = await apiFetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowNumber,
          deliveryDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Update delivery date failed');
      showToast('อัปเดตวันจัดส่งสำเร็จ', 'success');
    } catch (err: any) {
      setOrders(prevOrders);
      showToast('ไม่สามารถเปลี่ยนวันจัดส่งได้: ' + err.message, 'error');
    }
  };

  const handleStatusChange = async (
    rowNumber: number,
    paymentStatus: string,
    prodStatus: string,
    deliveryStatus: string,
    deliveryDate?: string
  ) => {
    // Enforce workflow business rules consistency:
    let finalPaymentStatus = paymentStatus;
    let finalProdStatus = prodStatus;
    let finalDeliveryStatus = deliveryStatus;

    if (finalPaymentStatus === 'รอชำระ') {
      // Rule 1: If payment is pending, production and delivery must stay at initial stage
      finalProdStatus = 'รอดำเนินการ';
      finalDeliveryStatus = 'รอจัดส่ง';
    } else if (finalProdStatus !== 'จัดทำเสร็จสิ้น') {
      // Rule 2: If production is not finished, delivery cannot be in progress or completed
      if (
        finalDeliveryStatus === 'กำลังจัดส่ง' ||
        finalDeliveryStatus === 'จัดส่งเสร็จสิ้น' ||
        finalDeliveryStatus === 'จัดส่งสำเร็จ'
      ) {
        finalDeliveryStatus = 'รอจัดส่ง';
      }
    }

    const prevOrders = [...orders];
    setOrders((prev) =>
      prev.map((o) =>
        o.rowNumber === rowNumber
          ? {
              ...o,
              paymentStatus: finalPaymentStatus,
              prodStatus: finalProdStatus,
              deliveryStatus: finalDeliveryStatus,
              ...(deliveryDate !== undefined ? { deliveryDate } : {}),
            }
          : o
      )
    );

    try {
      const res = await apiFetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowNumber,
          paymentStatus: finalPaymentStatus,
          prodStatus: finalProdStatus,
          deliveryStatus: finalDeliveryStatus,
          ...(deliveryDate !== undefined ? { deliveryDate } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Update failed');
      showToast('อัปเดตสถานะออเดอร์สำเร็จ', 'success');
    } catch (err: any) {
      setOrders(prevOrders);
      showToast('ไม่สามารถอัปเดตได้: ' + err.message, 'error');
    }
  };

  const handleOpenEditOrder = (o: OrderItem) => {
    const step = deduceTimelineStep(o);
    setEditingOrder(o);
    setNewOrder({
      customerName: o.customerName || '',
      phone: o.phone || '',
      deliveryMethod: o.deliveryMethod || 'รถกระบะร้าน',
      address: o.address || '',
      productDetails: o.productDetails || '',
      orderDate: o.orderDate || '',
      deliveryDate: o.deliveryDate || '',
      totalPrice: o.totalPrice !== undefined ? String(o.totalPrice) : '',
      deposit: o.deposit !== undefined ? String(o.deposit) : '',
      orderStatus: step.name,
      paymentStatus: o.paymentStatus || step.legacy.paymentStatus,
      prodStatus: o.prodStatus || step.legacy.prodStatus,
      deliveryStatus: o.deliveryStatus || step.legacy.deliveryStatus,
      note: o.note || '',
    });
    setShowOrderModal(true);
    setSwipedOrderRow(null);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowNumber: deleteConfirmOrder.rowNumber }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to delete');
      showToast(data.message || `ลบคำสั่งซื้อ ${deleteConfirmOrder.orderId} สำเร็จ`, 'success');
      setDeleteConfirmOrder(null);
      await fetchData();
    } catch (err: any) {
      showToast('ไม่สามารถลบคำสั่งซื้อได้: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEditing = Boolean(editingOrder);
      const url = '/api/orders';
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? { ...newOrder, rowNumber: editingOrder!.rowNumber }
        : newOrder;

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to save');
      showToast(
        data.message || (isEditing ? 'อัปเดตคำสั่งซื้อสำเร็จ' : `บันทึกออเดอร์ ${data.orderId} สำเร็จ`),
        'success'
      );
      setShowOrderModal(false);
      setEditingOrder(null);
      setNewOrder(blankOrder);
      await fetchData();
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditExpense = (e: ExpenseItem) => {
    setEditingExpense(e);
    setExpenseForm({
      vendor: e.vendor || '',
      billDate: e.billDate || getLocalDateString(),
      paymentMethod: e.paymentMethod || 'โอนเงิน',
      billNo: e.billNo || '',
      note: e.note || '',
    });
    setExpenseItems([
      {
        id: `edit-${e.rowNumber}`,
        category: e.category || 'ไม้พาเลท/วัตถุดิบ',
        itemName: e.itemName || '',
        qty: e.qty || 1,
        unit: e.unit || 'ชิ้น',
        unitPrice: e.unitPrice !== undefined ? String(e.unitPrice) : '',
        totalItemPrice: e.totalItemPrice !== undefined ? String(e.totalItemPrice) : '',
      },
    ]);
    setBillFile(null);
    setShowExpenseModal(true);
    setSwipedExpenseRow(null);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deleteConfirmExpense) return;
    setIsDeletingExpense(true);
    try {
      const res = await apiFetch('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowNumber: deleteConfirmExpense.rowNumber }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to delete');
      showToast(data.message || `ลบรายการค่าใช้จ่าย "${deleteConfirmExpense.itemName}" สำเร็จ`, 'success');
      setDeleteConfirmExpense(null);
      await fetchData();
    } catch (err: any) {
      showToast('ไม่สามารถลบรายการค่าใช้จ่ายได้: ' + err.message, 'error');
    } finally {
      setIsDeletingExpense(false);
    }
  };

  const handleSaveExpenseModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.vendor.trim()) {
      return showToast('กรุณากรอกชื่อร้านค้าหรือผู้จำหน่าย', 'error');
    }
    if (!expenseForm.billDate) {
      return showToast('กรุณาระบุวันที่ของบิล', 'error');
    }

    if (expenseItems.length === 0) {
      return showToast('กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ', 'error');
    }

    for (let i = 0; i < expenseItems.length; i++) {
      const it = expenseItems[i];
      if (!it.itemName.trim()) {
        return showToast(`กรุณากรอกชื่อสินค้าสำหรับรายการที่ #${i + 1}`, 'error');
      }
      const itemTotal = Number(it.totalItemPrice) || (Number(it.qty) * Number(it.unitPrice));
      if (itemTotal <= 0) {
        return showToast(`กรุณาระบุราคาสำหรับรายการที่ #${i + 1} (${it.itemName || 'ไม่ระบุ'})`, 'error');
      }
    }

    setLoading(true);
    try {
      const isEditing = Boolean(editingExpense);
      const fd = new FormData();
      fd.append('billDate', expenseForm.billDate);
      fd.append('billNo', expenseForm.billNo);
      fd.append('vendor', expenseForm.vendor);
      fd.append('paymentMethod', expenseForm.paymentMethod);
      fd.append('note', expenseForm.note);

      if (isEditing) {
        const singleItem = expenseItems[0];
        const qty = Number(singleItem.qty) || 1;
        const totalAmount = Number(singleItem.totalItemPrice) || (qty * (Number(singleItem.unitPrice) || 0));
        fd.append('rowNumber', String(editingExpense!.rowNumber));
        fd.append('category', singleItem.category);
        fd.append('itemName', singleItem.itemName.trim());
        fd.append('qty', String(qty));
        fd.append('unit', singleItem.unit.trim() || 'ชิ้น');
        fd.append('totalPrice', String(totalAmount));
        if (editingExpense!.fileUrl) {
          fd.append('fileUrl', editingExpense!.fileUrl);
        }
      } else {
        const itemsToSubmit = expenseItems.map((it) => {
          const qty = Number(it.qty) || 1;
          const totalItemPrice = Number(it.totalItemPrice) || (qty * (Number(it.unitPrice) || 0));
          const unitPrice = it.unitPrice !== '' ? Number(it.unitPrice) : (totalItemPrice / qty);

          return {
            category: it.category || 'ไม้พาเลท/วัตถุดิบ',
            itemName: it.itemName.trim(),
            qty,
            unit: it.unit.trim() || 'ชิ้น',
            unitPrice: Number(unitPrice.toFixed(2)),
            totalItemPrice: Number(totalItemPrice.toFixed(2)),
          };
        });

        fd.append('items', JSON.stringify(itemsToSubmit));
      }

      if (billFile) {
        // Phase 2: Client-side compression for expense receipt images to save bandwidth & storage
        const optimizedBill = billFile.type.startsWith('image/')
          ? await compressImageFile(billFile, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 })
          : billFile;
        fd.append('file', optimizedBill);
      }

      const url = '/api/expenses';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to save');

      const savedCount = isEditing ? 1 : expenseItems.length;
      showToast(
        data.message ||
          (isEditing
            ? 'อัปเดตรายการค่าใช้จ่ายสำเร็จ'
            : savedCount > 1
            ? `บันทึกค่าใช้จ่าย ${savedCount} รายการสำเร็จ`
            : 'บันทึกค่าใช้จ่ายสำเร็จ'),
        'success'
      );

      setExpenseForm(blankExpenseForm);
      setExpenseItems([createBlankSubItem()]);
      setEditingExpense(null);
      setBillFile(null);
      setShowExpenseModal(false);
      await fetchData();
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScanReceipt = async (file: File) => {
    setIsScanning(true);
    setEditingExpense(null);
    setShowExpenseModal(true);
    showToast('⚡ AI กำลังสแกนและอ่านข้อมูลจากบิล...', 'info');

    try {
      // Phase 2: Client-side compression for receipt scan before uploading to Gemini API
      // Reduces 5MB-15MB camera files to ~400KB-800KB, speeding up OCR by 4-5x
      const optimizedFile = file.type.startsWith('image/')
        ? await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 })
        : file;

      setBillFile(optimizedFile);

      const fd = new FormData();
      fd.append('file', optimizedFile);

      const res = await apiFetch('/api/scan-receipt', {
        method: 'POST',
        body: fd,
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        if (result.error === 'MISSING_API_KEY') {
          showToast('กรุณาระบุ GEMINI_API_KEY ในไฟล์ .env.local เพื่อใช้ AI สแกนบิล', 'error');
        } else {
          showToast(result.error || 'ไม่สามารถสแกนบิลได้', 'error');
        }
        return;
      }

      const d = result.data;
      if (d) {
        setExpenseForm({
          vendor: d.vendor || '',
          billDate: d.billDate || getLocalDateString(),
          paymentMethod: d.paymentMethod || 'โอนเงิน',
          billNo: d.billNo || '',
          note: d.note || '',
        });

        // Map all sub-items extracted by Gemini AI
        const itemsFromScan: ExpenseSubItem[] =
          Array.isArray(d.items) && d.items.length > 0
            ? d.items.map((it: any, idx: number) => {
                const q = Number(it.qty) || 1;
                const total =
                  it.totalItemPrice !== undefined && it.totalItemPrice !== null
                    ? String(it.totalItemPrice)
                    : it.unitPrice !== undefined
                    ? String(q * Number(it.unitPrice))
                    : '';
                const uPrice =
                  it.unitPrice !== undefined && it.unitPrice !== null
                    ? String(it.unitPrice)
                    : total
                    ? String((Number(total) / q).toFixed(2))
                    : '';

                return {
                  id: `scan-${Date.now()}-${idx}`,
                  category: it.category || d.category || 'ไม้พาเลท/วัตถุดิบ',
                  itemName: it.itemName || '',
                  qty: q,
                  unit: it.unit || 'ชิ้น',
                  unitPrice: uPrice,
                  totalItemPrice: total,
                };
              })
            : [
                {
                  id: `scan-${Date.now()}-0`,
                  category: d.category || 'ไม้พาเลท/วัตถุดิบ',
                  itemName: d.itemName || d.vendor || 'ค่าใช้จ่าย',
                  qty: 1,
                  unit: 'ชิ้น',
                  unitPrice: d.totalPrice !== undefined ? String(d.totalPrice) : '',
                  totalItemPrice: d.totalPrice !== undefined ? String(d.totalPrice) : '',
                },
              ];

        setExpenseItems(itemsFromScan);

        const count = itemsFromScan.length;
        if (result.isDemo) {
          showToast(`✨ สแกนบิลสำเร็จ (โหมดจำลอง — พบ ${count} รายการในบิล)`, 'info');
        } else {
          showToast(`✨ Gemini AI สแกนบิลสำเร็จ (พบ ${count} รายการ ตรวจสอบตารางด้านล่างได้เลย)`, 'success');
        }
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // ─── If not logged in, ALWAYS redirect to Login Screen ───
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={() => {
          fetchData();
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex justify-center items-start overflow-x-hidden overscroll-x-none ${
        activeTab === 'home' && !isScrolledPastHero
          ? 'bg-[#0E0B22]'
          : 'bg-white'
      }`}
    >
      {/* ─── iOS Safari Top Edge Status Bar Color Sampler (Navy on Home top, White on Home scroll, White on other tabs) ─── */}
      <div
        className="fixed top-0 left-0 right-0 w-full pointer-events-none z-[99999] transition-colors duration-150"
        style={{
          height: 'max(12px, env(safe-area-inset-top, 0px))',
          backgroundColor: currentTopColor,
        }}
      />

      {/* ─── iOS Safari Bottom Edge Browser Bar Color Sampler (Pure White #ffffff) ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 w-full pointer-events-none z-[99999] bg-white"
        style={{
          height: 'max(8px, env(safe-area-inset-bottom, 0px))',
          backgroundColor: '#ffffff',
        }}
      />

      {/* ─── Mobile View Container (Locked & Fluid) ─── */}
      <div
        className={`w-full max-w-[430px] min-h-screen flex flex-col relative overflow-x-hidden overscroll-x-none ${
          activeTab === 'home' && !isScrolledPastHero
            ? 'bg-[#0E0B22]'
            : 'bg-white'
        }`}
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
      >

        {/* ─── Toast Alerts ─── */}
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold max-w-[90vw] transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-[#05CD99] text-white'
                : toast.type === 'error'
                ? 'bg-[#FF5630] text-white'
                : 'bg-[#171928] text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
            ) : (
              <Info className="w-4 h-4 shrink-0 text-slate-300" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-1 opacity-80 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  TAB 1: HOME (50% Purple Hero & Rounded White Sheet) */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0E0B22] via-[#1B153D] to-[#281D52]">
            {/* ── Top 50% Purple Gradient Section (Dark to Lighter Purple, Full Width, No Borders) ── */}
            <div
              className="relative w-full min-h-[46vh] sm:min-h-[48vh] text-white px-5 pb-7 flex flex-col justify-between overflow-hidden"
              style={{ paddingTop: 'max(2.5rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
            >
              {/* Concentric ripple rings & ambient glows (matching reference design) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <div className="w-[300px] h-[300px] rounded-full border border-white/[0.04] absolute -top-8" />
                <div className="w-[450px] h-[450px] rounded-full border border-white/[0.04] absolute -top-24" />
                <div className="w-[600px] h-[600px] rounded-full border border-white/[0.04] absolute -top-40" />
                <div className="absolute top-1/4 right-0 w-64 h-64 bg-[#7A5AF8]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#6C5DD3]/20 rounded-full blur-2xl pointer-events-none" />
              </div>

              {/* Top Header Bar: App Name & System Controls */}
              <div className="flex justify-between items-center relative z-10 gap-2.5 sm:gap-3">
                {/* 1. รูป & 2. ชื่อร้าน */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {/* 1. รูป: Circular Store Logo with Photo Upload */}
                  <label
                    htmlFor="store-logo-input"
                    className="relative group w-11 h-11 sm:w-13 sm:h-13 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 shrink-0 cursor-pointer shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-all"
                    title="แตะเพื่อเลือกรูปภาพโลโก้ร้าน"
                  >
                    <input
                      id="store-logo-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />

                    <div className="w-full h-full rounded-full bg-[#1A1325] overflow-hidden flex items-center justify-center relative">
                      {storeLogo ? (
                        <img
                          src={storeLogo}
                          alt="โลโก้ร้าน"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-1 bg-[#1A1325]">
                          <img
                            src="/logo.png"
                            alt="โลโก้ระบบ"
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        </div>
                      )}

                      {/* Small Camera Overlay on Hover / Tap Hint */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                        <Camera className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </div>

                    {/* Visible camera badge on corner for easy mobile tapping */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#6C5DD3] text-white flex items-center justify-center shadow-md ring-2 ring-[#0E0B22]">
                      <Camera className="w-2.5 h-2.5" />
                    </div>
                  </label>

                  {/* 2. ชื่อร้าน: Clickable Store Name opens StoreSettingsModal */}
                  <button
                    type="button"
                    onClick={() => setShowStoreSettings(true)}
                    className="min-w-0 text-left group hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                    title="แตะเพื่อเปิดการตั้งค่าร้านค้า (เปลี่ยนชื่อร้าน, หมวดหมู่, ข้อมูลติดต่อ)"
                  >
                    <h1 className="text-base sm:text-lg md:text-xl font-black text-white leading-snug tracking-tight drop-shadow-sm truncate group-hover:text-purple-200 transition-colors">
                      {userProfile?.businessName || currentUser?.user_metadata?.business_name || 'ร้านพาเลทไอเดียเฟอร์นิเจอร์'}
                    </h1>
                  </button>
                </div>

                {/* 3. live - 4. reload - 5. logout */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Phase 2: Offline status indicator */}
                  {!isOnline && (
                    <div
                      className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      title="ไม่พบสัญญาณอินเทอร์เน็ต (กำลังใช้งานโหมดแคชออฟไลน์ SWR)"
                    >
                      <WifiOff className="w-3 h-3 text-amber-300" />
                      <span className="hidden xs:inline">ออฟไลน์</span>
                    </div>
                  )}

                  {/* 3. Live Badge */}
                  <div
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 ${
                      isConfigured ? 'text-[#05CD99]' : 'text-[#FF9F43]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-[#05CD99]' : 'bg-[#FF9F43] animate-pulse'}`} />
                    <span className="text-[11px] sm:text-xs font-bold">{isConfigured ? 'Live' : 'Demo'}</span>
                  </div>

                  {/* 4. Reload Button */}
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                    title="รีเฟรชข้อมูล"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>

                  {/* 5. Logout Button (Red theme & Optically Centered) */}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-8 h-8 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 inline-flex items-center justify-center transition-all active:scale-95 cursor-pointer p-0 shrink-0 shadow-sm"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Setup Guide Accordion */}
              {showConfigGuide && !isConfigured && (
                <div className="my-2 p-3 rounded-2xl bg-white/10 backdrop-blur-md text-xs space-y-1.5 animate-fadeIn relative z-20">
                  <p className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> เชื่อมต่อ Supabase Cloud จริง
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    ใส่ค่าในไฟล์ <code className="bg-black/30 px-1 py-0.5 rounded text-amber-400">.env.local</code> (NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY)
                  </p>
                </div>
              )}

              {/* Unauthenticated Banner */}
              {!currentUser && (
                <div className="my-2 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between gap-3 text-xs text-white relative z-20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                    <span className="truncate text-white/90">
                      กรุณาเข้าสู่ระบบร้านพาเลทไอเดีย หรือสมัครเปิดร้านใหม่
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="shrink-0 px-3 py-1.5 bg-white text-[#6C5DD3] font-bold rounded-xl hover:bg-white/90 active:scale-95 text-xs transition-all shadow-sm"
                  >
                    เข้าสู่ระบบ
                  </button>
                </div>
              )}

              {/* ── Centered Hero: Huge Sales Number (ตัวเลขยอดขาย อยู่ตรงกลางตัวใหญ่ๆ คมชัดมองเห็นง่าย) ── */}
              <div className="my-auto py-5 flex flex-col items-center justify-center text-center relative z-10">
                {/* Label + Transparent Month Filter (ไม่มีกรอบพื้นหลัง โปร่งแสง แสดงเฉพาะตัวหนังสือ) */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm font-semibold text-purple-100 tracking-wide">
                    ยอดขายรวม
                  </span>
                  <div className="relative inline-flex items-center text-xs sm:text-sm font-bold text-purple-200 hover:text-white cursor-pointer transition-colors">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-purple-200 hover:text-white text-xs sm:text-sm font-bold outline-none cursor-pointer appearance-none pr-3"
                    >
                      <option value="ALL" className="bg-[#181338] text-white">ทุกรอบเดือน</option>
                      {availableMonths.map((m) => (
                        <option key={m} value={m} className="bg-[#181338] text-white">
                          {formatThaiMonth(m)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-purple-300 pointer-events-none -ml-2" />
                  </div>
                </div>

                {/* The Big Number: Centered & Crisp font */}
                <h2 className="text-5xl sm:text-6xl font-medium sm:font-semibold text-white tracking-tight leading-none">
                  {totalSales.toLocaleString()}
                </h2>

                {/* Trend Badge (ไม่มีกรอบพื้นหลัง) */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 text-[#05CD99] text-xs sm:text-sm font-bold">
                    <ArrowUpRight className="w-4 h-4" /> +10% เดือนนี้
                  </span>
                </div>
              </div>

              {/* Quick Actions Row (4 Action Buttons - ไอคอนขนาดใหญ่ ตัวหนังสือนูนชัด) */}
              <div className="grid grid-cols-4 gap-2 pt-2 relative z-10">
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="flex flex-col items-center gap-1.5 text-white active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-purple-100">ออเดอร์</span>
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className="flex flex-col items-center gap-1.5 text-white active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-purple-200 transition-colors">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-purple-100">ค่าใช้จ่าย</span>
                </button>
                <button
                  onClick={() => {
                    setOrderFilter('ACTION_READY_FOR_DELIVERY');
                    setActiveTab('orders');
                  }}
                  className="flex flex-col items-center gap-1.5 text-white active:scale-95 transition-transform"
                >
                  <div className="relative w-14 h-14 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-purple-200 transition-colors">
                    <Package className="w-6 h-6" />
                    {stepCounts.delivery > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#1A1325] shadow-sm">
                        {stepCounts.delivery}
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-purple-100">รอส่งมอบ</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className="flex flex-col items-center gap-1.5 text-white active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-purple-200 transition-colors">
                    <History className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-purple-100">ประวัติ</span>
                </button>
              </div>
            </div>

            {/* ── Bottom Sheet (White Background with Rounded Top Corners, sitting on top of purple background) ── */}
            <main
              ref={homeWhiteSheetRef}
              className="bg-white rounded-t-[36px] sm:rounded-t-[40px] px-5 pt-3 pb-8 space-y-4 flex-1 relative z-20"
            >
              {/* Drag handle pill */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2" />

              {/* Active Month Filter Indicator Banner (แสดงเมื่อมีการเลือกกรองเดือน) */}
              {selectedMonth !== 'ALL' && (
                <div className="flex items-center justify-between px-3.5 py-2 bg-purple-50/80 border border-purple-100 rounded-2xl text-xs text-[#6C5DD3] animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#6C5DD3]" />
                    <span>ข้อมูลเฉพาะรอบเดือน:</span>
                    <strong>{formatThaiMonth(selectedMonth)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMonth('ALL')}
                    className="text-[11px] font-bold underline hover:text-[#5244ad] cursor-pointer"
                  >
                    แสดงทุกเดือน
                  </button>
                </div>
              )}

              {/* Two Side-by-Side Big Metric Cards (Income vs Expenses) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Card 1: ยอดขาย */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 flex flex-col justify-between border border-slate-200/50 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="text-sm sm:text-base font-bold text-slate-800">ยอดขาย</span>
                    </div>
                  </div>

                  {/* Big Circular Graph */}
                  <div className="flex justify-center my-2">
                    <DonutLarge percent={depositPercent} color="#05CD99" label="มัดจำ" />
                  </div>

                  {/* Big Numbers (คงค้างชำระ ไม่มีกรอบพื้นหลัง) */}
                  <div className="space-y-1.5 pt-2 text-center">
                    <div>
                      <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight leading-tight mt-0.5">
                        {totalDeposit.toLocaleString()}
                      </p>
                    </div>
                    <div className="pt-2 text-center border-t border-slate-200/40">
                      <span className="text-xs text-slate-500 font-semibold block leading-tight">คงค้างชำระ</span>
                      <span className="text-sm sm:text-base font-extrabold text-amber-600 block mt-0.5">
                        {totalBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: ค่าใช้จ่าย */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 flex flex-col justify-between border border-slate-200/50 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#FF8A00]/10 text-[#FF8A00] flex items-center justify-center">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <span className="text-sm sm:text-base font-bold text-slate-800">ค่าใช้จ่าย</span>
                    </div>
                  </div>

                  {/* Big Circular Graph */}
                  <div className="flex justify-center my-2">
                    <DonutLarge percent={expenseRatio} color="#FF8A00" label="ต้นทุน" />
                  </div>

                  {/* Big Numbers (กำไรเบื้องต้น ไม่มีกรอบพื้นหลัง) */}
                  <div className="space-y-1.5 pt-2 text-center">
                    <div>
                      <p className="text-2xl sm:text-3xl font-black text-[#FF8A00] tracking-tight leading-tight mt-0.5">
                        {totalExpense.toLocaleString()}
                      </p>
                    </div>
                    <div className="pt-2 text-center border-t border-slate-200/40">
                      <span className="text-xs text-slate-500 font-semibold block leading-tight">กำไรเบื้องต้น</span>
                      <span className={`text-sm sm:text-base font-extrabold block mt-0.5 ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {grossProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Required Card (สิ่งที่ต้องดำเนินการ 1 แถว 3 ปุ่มลัด - ขยับขึ้นมาต่อจาก ยอดขาย ค่าใช้จ่าย) */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 space-y-3 border border-slate-200/50 shadow-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide">
                      สิ่งที่ต้องดำเนินการ
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      จุดที่ต้องตรวจสอบและติดตามงาน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderFilter('ALL');
                      setActiveTab('orders');
                    }}
                    className="text-xs font-bold text-[#6C5DD3] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>ดูทั้งหมด</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1 Row 3 Shortcut Buttons (1 แถว 3 ปุ่มลัด - พื้นหลังขาว เส้นขอบเทาจาง 50%) */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {/* Button 1: ยังไม่มัดจำ */}
                  <button
                    type="button"
                    onClick={() => {
                      setOrderFilter('ACTION_PENDING_DEPOSIT');
                      setActiveTab('orders');
                    }}
                    className="group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/50 hover:border-slate-300/70 transition-all active:scale-95 shadow-xs cursor-pointer text-center"
                  >
                    <div className="w-full flex items-center justify-end mb-1">
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          actionItems.pendingDeposit.length > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {actionItems.pendingDeposit.length > 0 ? 'รอตรวจ' : 'ครบ'}
                      </span>
                    </div>
                    <div className="my-0.5">
                      <span
                        className={`text-2xl sm:text-3xl font-black block leading-none ${
                          actionItems.pendingDeposit.length > 0
                            ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {actionItems.pendingDeposit.length}
                      </span>
                    </div>
                    <div className="w-full mt-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate">ยังไม่มัดจำ</p>
                      <p className="text-[10px] text-slate-400 truncate">รอเงินโอน</p>
                    </div>
                  </button>

                  {/* Button 2: เกินกำหนดส่ง / ถึงกำหนดส่ง */}
                  <button
                    type="button"
                    onClick={() => {
                      setOrderFilter('ACTION_OVERDUE');
                      setActiveTab('orders');
                    }}
                    className="group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/50 hover:border-slate-300/70 transition-all active:scale-95 shadow-xs cursor-pointer text-center"
                  >
                    <div className="w-full flex items-center justify-end mb-1">
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          actionItems.overdueOrDueToday.length > 0
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {actionItems.overdueOrDueToday.length > 0 ? 'ด่วน' : 'ปกติ'}
                      </span>
                    </div>
                    <div className="my-0.5">
                      <span
                        className={`text-2xl sm:text-3xl font-black block leading-none ${
                          actionItems.overdueOrDueToday.length > 0
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {actionItems.overdueOrDueToday.length}
                      </span>
                    </div>
                    <div className="w-full mt-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate">เกินกำหนดส่ง</p>
                      <p className="text-[10px] text-slate-400 truncate">ล่าช้า/วันนี้</p>
                    </div>
                  </button>

                  {/* Button 3: ตามยอดงวดจบ / รอปิดยอด */}
                  <button
                    type="button"
                    onClick={() => {
                      setOrderFilter('ACTION_PENDING_BALANCE');
                      setActiveTab('orders');
                    }}
                    className="group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/50 hover:border-slate-300/70 transition-all active:scale-95 shadow-xs cursor-pointer text-center"
                  >
                    <div className="w-full flex items-center justify-end mb-1">
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          actionItems.pendingBalance.length > 0
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {actionItems.pendingBalance.length > 0 ? 'รอเก็บ' : 'ครบ'}
                      </span>
                    </div>
                    <div className="my-0.5">
                      <span
                        className={`text-2xl sm:text-3xl font-black block leading-none ${
                          actionItems.pendingBalance.length > 0
                            ? 'text-[#6C5DD3]'
                            : 'text-slate-400'
                        }`}
                      >
                        {actionItems.pendingBalance.length}
                      </span>
                    </div>
                    <div className="w-full mt-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate">ตามยอดงวดจบ</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {actionItems.totalPendingBalanceAmount > 0
                          ? `฿${actionItems.totalPendingBalanceAmount.toLocaleString()}`
                          : 'ส่งมอบ/ปิดยอด'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sales Donut Chart (กราฟโดนัท สัดส่วนยอดขาย: ยอดรวม แบ่งเป็น มัดจำ และ คงเหลือ) */}
              <SalesDonutChart
                totalSales={totalSales}
                totalDeposit={totalDeposit}
                totalBalance={totalBalance}
                depositPercent={depositPercent}
                balancePercent={balancePercent}
              />

              {/* Financial Bar Chart (กราฟแท่งเปรียบเทียบ เดือนนี้ vs เดือนที่แล้ว) */}
              <FinancialBarChart
                prevMonth={monthComparisonData.prev}
                currMonth={monthComparisonData.curr}
                prevLabel={monthComparisonData.prevLabel}
                currLabel={monthComparisonData.currLabel}
              />

              {/* Recent Record (แสดงรายการล่าสุด 5 รายการ เรียงจากล่าสุดอยู่ด้านบน - พื้นหลังขาว เส้นขอบเทาจาง 50%) */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide">
                    รายการล่าสุด
                  </h2>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs sm:text-sm font-bold text-[#6C5DD3] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    ดูทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {latestTransactions.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 text-center space-y-2 border border-slate-200/50 shadow-xs">
                      <p className="text-xs text-slate-400">
                        {selectedMonth !== 'ALL'
                          ? `ยังไม่มีรายการในรอบเดือน ${formatThaiMonth(selectedMonth)}`
                          : 'ยังไม่มีรายการล่าสุด'}
                      </p>
                      {selectedMonth !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setSelectedMonth('ALL')}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200/50 text-slate-600 text-[11px] font-semibold hover:bg-slate-100 cursor-pointer"
                        >
                          <span>ดูทุกรอบเดือน</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    latestTransactions.map((item) => {
                      if (item.type === 'order') {
                        const o = item.order;
                        return (
                          <div
                            key={item.key}
                            className="bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-200/50 shadow-xs hover:border-slate-300/70 transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              {/* แถวแรก: รายละเอียดสินค้า สีดำตัวใหญ่ */}
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {o.productDetails || 'ไม้พาเลท'}
                              </p>
                              {/* แถวที่สอง: ชื่อลูกค้า สีเทา ตัวบาง ตัวเล็ก */}
                              <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
                                {o.customerName} <span className="opacity-75">· #{o.orderId}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-base sm:text-lg font-black text-emerald-600 tracking-tight leading-tight">+{o.totalPrice.toLocaleString()}</p>
                              <div className="mt-0.5">
                                <StatusPill status={deduceTimelineStep(o).name} noBg />
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const e = item.expense;
                        return (
                          <div
                            key={item.key}
                            className="bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-200/50 shadow-xs hover:border-slate-300/70 transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              {/* แถวแรก: รายการสินค้า สีดำตัวใหญ่ */}
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {e.itemName}
                              </p>
                              {/* แถวที่สอง: ร้านค้า สีเทา ตัวบาง ตัวเล็ก */}
                              <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
                                {e.vendor} {e.billNo ? `· #${e.billNo}` : ''}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-base sm:text-lg font-black text-rose-600 tracking-tight leading-tight">-{e.totalItemPrice.toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      }
                    })
                  )}
                </div>
              </div>
            </main>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  TAB 2: INVOICES / ORDERS (Matching Screen 2)     */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <main
            className="px-5 space-y-4 flex-1 bg-white"
            style={{ paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
          >
            {/* Header: < คำสั่งซื้อ */}
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setActiveTab('home')}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200/50 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">คำสั่งซื้อ</h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    {selectedMonth === 'ALL'
                      ? `ทุกรอบเดือน · ${monthOrders.length} รายการ`
                      : `${formatThaiMonth(selectedMonth)} · ${monthOrders.length} รายการ`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Month Selector (ไม่มีพื้นหลัง และไม่มีเส้นขอบ) */}
                <div className="relative inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer transition-colors">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-slate-700 hover:text-slate-900 text-xs font-bold outline-none cursor-pointer appearance-none pr-4 border-none shadow-none"
                  >
                    <option value="ALL">ทุกรอบเดือน</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatThaiMonth(m)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
                </div>

                <button
                  onClick={() => setShowOrderModal(true)}
                  className="w-8 h-8 rounded-xl bg-[#6C5DD3] text-white flex items-center justify-center active:scale-95 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input (White background with soft grey border) */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาลูกค้า, รหัสออเดอร์, สเปกไม้..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-[#6C5DD3]/10 focus:border-[#6C5DD3] transition-all"
              />
              {orderSearch && (
                <button
                  onClick={() => setOrderSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Active Action Filter Banner (เมื่อกดมาจาก "สิ่งที่ต้องดำเนินการ" หรือคีย์ลัดในหน้าแรก) */}
            {(orderFilter === 'ACTION_PENDING_DEPOSIT' ||
              orderFilter === 'ACTION_OVERDUE' ||
              orderFilter === 'ACTION_PENDING_BALANCE' ||
              orderFilter === 'ACTION_READY_FOR_DELIVERY') && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="font-extrabold text-amber-900 truncate">
                      {orderFilter === 'ACTION_PENDING_DEPOSIT' && `กรองเฉพาะ: ยังไม่มัดจำ (${filteredOrders.length} รายการ)`}
                      {orderFilter === 'ACTION_OVERDUE' && `กรองเฉพาะ: เกินกำหนดส่ง / ถึงกำหนดส่ง (${filteredOrders.length} รายการ)`}
                      {orderFilter === 'ACTION_PENDING_BALANCE' && `กรองเฉพาะ: ตามยอดงวดจบ (${filteredOrders.length} รายการ)`}
                      {orderFilter === 'ACTION_READY_FOR_DELIVERY' && `กรองเฉพาะ: รอส่งมอบ (${filteredOrders.length} รายการ)`}
                    </p>
                    <p className="text-[10px] text-amber-700 truncate">
                      {orderFilter === 'ACTION_READY_FOR_DELIVERY'
                        ? 'เฉพาะรายการที่จัดทำเสร็จแล้ว หรือรอจัดส่ง'
                        : 'แสดงเฉพาะรายการตามคำสั่งลัดจากหน้าแรก'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderFilter('ALL')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100/80 text-amber-800 text-xs font-bold border border-amber-300 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                  title="ดูคำสั่งซื้อทั้งหมด"
                >
                  <span>ดูทั้งหมด</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Filter Tabs (รูปแบบเหมือนตัวกรองในหน้าประวัติ) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
              {[
                ...(orderFilter === 'ACTION_PENDING_DEPOSIT'
                  ? [{
                      id: 'ACTION_PENDING_DEPOSIT',
                      label: 'ยังไม่มัดจำ',
                      count: filteredOrders.length,
                      activeCls: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 border-amber-500',
                      inactiveCls: 'bg-white text-amber-700 hover:bg-amber-50/60 border-amber-200/80',
                      badgeActive: 'bg-white/25 text-white',
                      badgeInactive: 'bg-amber-100 text-amber-800',
                      dot: 'bg-amber-500',
                    }]
                  : orderFilter === 'ACTION_OVERDUE'
                  ? [{
                      id: 'ACTION_OVERDUE',
                      label: 'เกินกำหนดส่ง',
                      count: filteredOrders.length,
                      activeCls: 'bg-rose-600 text-white shadow-md shadow-rose-600/20 border-rose-600',
                      inactiveCls: 'bg-white text-rose-700 hover:bg-rose-50/60 border-rose-200/80',
                      badgeActive: 'bg-white/25 text-white',
                      badgeInactive: 'bg-rose-100 text-rose-800',
                      dot: 'bg-rose-600',
                    }]
                  : orderFilter === 'ACTION_PENDING_BALANCE'
                  ? [{
                      id: 'ACTION_PENDING_BALANCE',
                      label: 'ตามยอดงวดจบ',
                      count: filteredOrders.length,
                      activeCls: 'bg-[#6C5DD3] text-white shadow-md shadow-[#6C5DD3]/20 border-[#6C5DD3]',
                      inactiveCls: 'bg-white text-[#6C5DD3] hover:bg-purple-50/60 border-purple-200/80',
                      badgeActive: 'bg-white/25 text-white',
                      badgeInactive: 'bg-purple-100 text-[#6C5DD3]',
                      dot: 'bg-[#6C5DD3]',
                    }]
                  : orderFilter === 'ACTION_READY_FOR_DELIVERY'
                  ? [{
                      id: 'ACTION_READY_FOR_DELIVERY',
                      label: 'รอส่งมอบ',
                      count: filteredOrders.length,
                      activeCls: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-indigo-600',
                      inactiveCls: 'bg-white text-indigo-600 hover:bg-indigo-50/60 border-indigo-200/80',
                      badgeActive: 'bg-white/25 text-white',
                      badgeInactive: 'bg-indigo-100 text-indigo-700',
                      dot: 'bg-indigo-500',
                    }]
                  : []),
                {
                  id: 'ALL',
                  label: 'ทั้งหมด',
                  count: stepCounts.activeTotal,
                  activeCls: 'bg-slate-900 text-white shadow-sm border-slate-900',
                  inactiveCls: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/50 shadow-xs',
                  badgeActive: 'bg-white/20 text-white',
                  badgeInactive: 'bg-slate-100 text-slate-500',
                  dot: 'bg-slate-400',
                },
                {
                  id: 'PAYMENT',
                  label: 'รอชำระ/มัดจำ',
                  count: stepCounts.payment,
                  activeCls: 'bg-rose-500 text-white shadow-md shadow-rose-500/20 border-rose-500',
                  inactiveCls: 'bg-white text-rose-600 hover:bg-rose-50/60 border-rose-200/80',
                  badgeActive: 'bg-white/25 text-white',
                  badgeInactive: 'bg-rose-100/80 text-rose-600',
                  dot: 'bg-rose-500',
                },
                {
                  id: 'PRODUCTION',
                  label: 'ผลิต/ดำเนินการ',
                  count: stepCounts.production,
                  activeCls: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 border-amber-500',
                  inactiveCls: 'bg-white text-amber-700 hover:bg-amber-50/60 border-amber-200/80',
                  badgeActive: 'bg-white/25 text-white',
                  badgeInactive: 'bg-amber-100/80 text-amber-800',
                  dot: 'bg-amber-500',
                },
                {
                  id: 'DELIVERY',
                  label: 'รอส่งมอบ',
                  count: stepCounts.delivery,
                  activeCls: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-indigo-600',
                  inactiveCls: 'bg-white text-indigo-600 hover:bg-indigo-50/60 border-indigo-200/80',
                  badgeActive: 'bg-white/25 text-white',
                  badgeInactive: 'bg-indigo-100/80 text-indigo-600',
                  dot: 'bg-indigo-500',
                },
                {
                  id: 'COMPLETED',
                  label: 'เสร็จสิ้นแล้ว',
                  count: stepCounts.completed,
                  activeCls: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 border-emerald-600',
                  inactiveCls: 'bg-white text-emerald-600 hover:bg-emerald-50/60 border-emerald-200/80',
                  badgeActive: 'bg-white/25 text-white',
                  badgeInactive: 'bg-emerald-100/80 text-emerald-600',
                  dot: 'bg-emerald-600',
                },
              ].map((tab) => {
                const isActive = orderFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setOrderFilter(tab.id as any)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border active:scale-95 shrink-0 ${
                      isActive ? tab.activeCls : tab.inactiveCls
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tab.dot} ${isActive ? 'bg-white' : ''}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? tab.badgeActive : tab.badgeInactive
                      }`}
                    >
                      {String(tab.count).padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Invoices List: Single Row per Order with Expand/Collapse */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-slate-200/50 shadow-xs">
                <Package className="w-10 h-10 mx-auto text-slate-300" />
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {orderSearch
                      ? 'ไม่พบคำสั่งซื้อที่ค้นหา'
                      : orderFilter === 'ACTION_PENDING_DEPOSIT'
                      ? 'ไม่มีคำสั่งซื้อที่ยังไม่มัดจำ ครบถ้วนแล้ว 🎉'
                      : orderFilter === 'ACTION_OVERDUE'
                      ? 'ไม่มีคำสั่งซื้อที่เกินกำหนดส่ง งานตรงเวลาทั้งหมด 🎉'
                      : orderFilter === 'ACTION_PENDING_BALANCE'
                      ? 'ไม่มีคำสั่งซื้อที่ค้างยอดงวดจบ 🎉'
                      : orderFilter === 'ACTION_READY_FOR_DELIVERY' || orderFilter === 'DELIVERY'
                      ? 'ไม่มีคำสั่งซื้อที่รอส่งมอบ (จัดทำเสร็จแล้ว/รอจัดส่ง) ในขณะนี้ 🎉'
                      : selectedMonth !== 'ALL' && monthOrders.length === 0
                      ? `ไม่มีคำสั่งซื้อในรอบเดือน ${formatThaiMonth(selectedMonth)}`
                      : orderFilter === 'ALL'
                      ? 'ไม่มีคำสั่งซื้อที่ค้างดำเนินการ 🎉'
                      : 'ไม่พบคำสั่งซื้อตามตัวกรองนี้'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {orderFilter.startsWith('ACTION_')
                      ? 'แตะปุ่มด้านล่างเพื่อดูคำสั่งซื้อทั้งหมด'
                      : orderFilter === 'ALL' && stepCounts.completed > 0
                      ? `ออเดอร์ทั้งหมด (${stepCounts.completed} รายการ) ดำเนินการเสร็จสิ้นแล้ว`
                      : selectedMonth !== 'ALL' && monthOrders.length === 0
                      ? 'แตะปุ่มด้านล่างเพื่อดูคำสั่งซื้อทุกรอบเดือน'
                      : 'ลองเปลี่ยนคำค้นหาหรือเลือกแท็บอื่น'}
                  </p>
                </div>
                {orderFilter.startsWith('ACTION_') && (
                  <button
                    type="button"
                    onClick={() => setOrderFilter('ALL')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>ดูคำสั่งซื้อทั้งหมด</span>
                  </button>
                )}
                {orderFilter === 'ALL' && stepCounts.completed > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderFilter('COMPLETED')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ดูรายการที่เสร็จสิ้นแล้ว ({stepCounts.completed} รายการ)</span>
                  </button>
                )}
                {selectedMonth !== 'ALL' && monthOrders.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth('ALL')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6C5DD3] text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>ดูคำสั่งซื้อทุกรอบเดือน</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredOrders.map((o) => (
                  <SwipeableOrderCard
                    key={o.rowNumber}
                    order={o}
                    isExpanded={expandedOrders.has(o.rowNumber)}
                    onToggleExpand={() => toggleExpandOrder(o.rowNumber)}
                    handleStatusChange={handleStatusChange}
                    onTimelineStatusChange={handleTimelineStatusChange}
                    onDeliveryDateChange={handleDeliveryDateChange}
                    onEdit={handleOpenEditOrder}
                    onDelete={(order) => {
                      setDeleteConfirmOrder(order);
                      setSwipedOrderRow(null);
                    }}
                    isSwiped={swipedOrderRow === o.rowNumber}
                    onSwipeChange={(swiped) => {
                      setSwipedOrderRow(swiped ? o.rowNumber : null);
                    }}
                    isUpdating={updatingOrderRow === o.rowNumber}
                  />
                ))}

                {/* Quick Link to View Completed Orders when in ALL Tab */}
                {orderFilter === 'ALL' && stepCounts.completed > 0 && (
                  <div className="pt-2 pb-1 text-center">
                    <button
                      type="button"
                      onClick={() => setOrderFilter('COMPLETED')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all border border-slate-200/50 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ดูคำสั่งซื้อที่เสร็จสิ้นแล้ว ({stepCounts.completed} รายการ)</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  TAB 3: EXPENSES LIST (รายจ่าย)                    */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === 'expenses' && (
          <main
            className="px-5 space-y-4 flex-1 bg-white"
            style={{ paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
          >
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setActiveTab('home')}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200/50 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">รายจ่าย</h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    {selectedMonth === 'ALL' ? 'ทุกรอบเดือน · ' : `${formatThaiMonth(selectedMonth)} · `}
                    {filteredExpenses.length} รายการ · รวม {totalFilteredExpenses.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Month Selector (ไม่มีพื้นหลัง และไม่มีเส้นขอบ) */}
                <div className="relative inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer transition-colors">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-slate-700 hover:text-slate-900 text-xs font-bold outline-none cursor-pointer appearance-none pr-4 border-none shadow-none"
                  >
                    <option value="ALL">ทุกรอบเดือน</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatThaiMonth(m)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
                </div>

                {/* จดบิลค่าใช้จ่ายใหม่ */}
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseForm(blankExpenseForm);
                    setExpenseItems([createBlankSubItem()]);
                    setBillFile(null);
                    setShowExpenseModal(true);
                  }}
                  className="w-8 h-8 rounded-xl bg-[#FF8A00] text-white flex items-center justify-center active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                  title="จดบิลค่าใช้จ่ายใหม่"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า, ร้านค้า, เลขที่บิล..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-[#FF8A00]/10 focus:border-[#FF8A00] transition-all"
              />
              {expenseSearch && (
                <button
                  onClick={() => setExpenseSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills (รูปแบบเหมือนตัวกรองในหน้าประวัติ) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
              {['ALL', ...expenseCategories].map((cat) => {
                const style = getExpenseCategoryStyle(cat);
                const isActive = expenseCategoryFilter === cat;
                const count = cat === 'ALL'
                  ? monthExpenses.length
                  : monthExpenses.filter((e) => e.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setExpenseCategoryFilter(cat)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border active:scale-95 shrink-0 ${
                      isActive
                        ? cat === 'ALL'
                          ? 'bg-slate-900 text-white shadow-sm border-slate-900'
                          : `${style.iconBg} ${style.text} border-current shadow-xs`
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/50 shadow-xs'
                    }`}
                  >
                    {cat !== 'ALL' && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                    )}
                    <span>{cat === 'ALL' ? 'ทุกหมวด' : cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? cat === 'ALL'
                            ? 'bg-white/20 text-white'
                            : 'bg-white/70'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Expenses List */}
            {filteredExpenses.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-slate-200/50 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#FF8A00]/10 mx-auto flex items-center justify-center text-[#FF8A00]">
                  <Receipt className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400">
                  {expenseSearch
                    ? 'ไม่พบรายการค่าใช้จ่ายที่ค้นหา'
                    : selectedMonth !== 'ALL' && monthExpenses.length === 0
                    ? `ไม่มีรายการค่าใช้จ่ายในรอบเดือน ${formatThaiMonth(selectedMonth)}`
                    : 'ยังไม่มีรายการค่าใช้จ่าย'}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {selectedMonth !== 'ALL' && monthExpenses.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMonth('ALL')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF8A00] text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>ดูรายจ่ายทุกรอบเดือน</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingExpense(null);
                      setExpenseForm(blankExpenseForm);
                      setExpenseItems([createBlankSubItem()]);
                      setBillFile(null);
                      setShowExpenseModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF8A00] text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> จดบิลค่าใช้จ่ายใหม่
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredExpenses.map((e) => (
                  <SwipeableExpenseCard
                    key={e.rowNumber}
                    expense={e}
                    onEdit={handleOpenEditExpense}
                    onDelete={(target) => setDeleteConfirmExpense(target)}
                    onPreviewBill={(target) =>
                      setPreviewBill({
                        url: target.fileUrl,
                        vendor: target.vendor,
                        itemName: target.itemName,
                        billNo: target.billNo,
                        amount: target.totalItemPrice,
                        date: target.billDate,
                      })
                    }
                    isSwiped={swipedExpenseRow === e.rowNumber}
                    onSwipeChange={(swiped) => setSwipedExpenseRow(swiped ? e.rowNumber : null)}
                  />
                ))}
              </div>
            )}
          </main>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  TAB 4: PROFILE / OVERVIEW (Matching Screen 5)     */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <main
            className="px-5 space-y-4 flex-1"
            style={{ paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
          >
            {/* Header: Profile Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6C5DD3]/10 to-[#8E78FB]/20 flex items-center justify-center text-white font-extrabold text-lg shrink-0 overflow-hidden relative border border-slate-100 p-1.5">
                    {storeLogo ? (
                      <img src={storeLogo} alt="โลโก้ร้าน" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <img src="/logo.png" alt="โลโก้ร้าน" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-800 truncate">
                      {currentUser
                        ? userProfile?.businessName || currentUser.user_metadata?.business_name || 'ร้านค้าของฉัน'
                        : 'โหมดทดลอง (Demo Store)'}
                    </h2>
                    <p className="text-xs text-slate-400 truncate">
                      {currentUser ? currentUser.email : 'เข้าสู่ระบบเพื่อใช้งานระบบแยกข้อมูลร้านจริง'}
                    </p>
                  </div>
                </div>

                {currentUser ? (
                  <button
                    onClick={handleSignOut}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ออก</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-[#6C5DD3] text-white hover:bg-[#5b4eb8] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-[#6C5DD3]/20"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>เข้าสู่ระบบ</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">สถานะบัญชี</span>
                  <span className={`font-semibold ${currentUser ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {currentUser ? 'Cloud Multi-Tenant Active' : 'โหมดจำลอง (Demo Mode)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ระดับสิทธิ์ (Role)</span>
                  <span className="font-semibold text-slate-800">
                    {currentUser
                      ? userProfile?.role === 'owner'
                        ? 'เจ้าของร้าน (Owner)'
                        : userProfile?.role || 'สมาชิก'
                      : 'ผู้เยี่ยมชม'}
                  </span>
                </div>
              </div>
            </div>

            {/* Store Settings & Details Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-100 text-[#6C5DD3] flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">ข้อมูลร้านค้าและการตั้งค่า</h3>
                    <p className="text-[11px] text-slate-400">ชื่อร้าน หมวดหมู่ค่าใช้จ่าย และการจัดส่ง</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStoreSettings(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#6C5DD3] text-white hover:bg-[#5b4eb8] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>ตั้งค่าร้าน</span>
                </button>
              </div>

              {storeDetails.tagline && (
                <p className="text-xs text-slate-600 italic bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                  &ldquo;{storeDetails.tagline}&rdquo;
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div className="bg-slate-50/70 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">เบอร์โทรศัพท์</span>
                  <span className="font-semibold text-slate-700 truncate block mt-0.5">
                    {storeDetails.phone || userProfile?.phone || 'ยังไม่ได้ระบุ'}
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">เลขประจำตัวผู้เสียภาษี</span>
                  <span className="font-semibold text-slate-700 truncate block mt-0.5">
                    {storeDetails.taxId || 'ยังไม่ได้ระบุ'}
                  </span>
                </div>
              </div>

              {storeDetails.address && (
                <div className="bg-slate-50/70 p-2.5 rounded-xl text-xs text-slate-600">
                  <span className="text-[10px] text-slate-400 block font-medium">ที่อยู่ร้านค้า</span>
                  <p className="font-medium text-slate-700 mt-0.5 line-clamp-2">{storeDetails.address}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <span>หมวดหมู่ค่าใช้จ่าย: <strong className="text-slate-800 font-bold">{expenseCategories.length}</strong> หมวด</span>
                <span>รูปแบบจัดส่ง: <strong className="text-slate-800 font-bold">{deliveryMethods.length}</strong> รูปแบบ</span>
              </div>
            </div>

            {/* Purple Payment Receive Banner (Matching screen 5) */}
            <div className="rounded-3xl p-5 text-white purple-pattern">
              <h3 className="text-sm font-bold">บันทึกรับเงิน</h3>
              <p className="text-[11px] text-white/80 mt-1 leading-relaxed">
                ยอดเงินจะถูกบันทึกและตัดยอดคงค้างอัตโนมัติทันทีที่ได้รับเงินโอนจากลูกค้า
              </p>
              <button
                onClick={() => {
                  setOrderFilter('PAYMENT');
                  setActiveTab('orders');
                }}
                className="mt-3.5 inline-flex items-center gap-1.5 bg-white text-[#6C5DD3] text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-white/95 active:scale-95 transition-all"
              >
                <Wallet className="w-3.5 h-3.5 text-[#6C5DD3]" />
                <span>ดูออเดอร์ที่ค้างชำระ ({monthOrders.filter((o) => o.paymentStatus !== 'ชำระครบแล้ว').length})</span>
              </button>
            </div>

            {/* 4-Box KPI Grid (Direct match with screen 5) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-semibold">ยอดขายรวม</span>
                <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                  {totalSales.toLocaleString()}
                </span>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-semibold">ยอดคงค้าง</span>
                <span className="text-xl font-extrabold text-[#FF9F43] mt-1 block">
                  {totalBalance.toLocaleString()}
                </span>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-semibold">จำนวนออเดอร์</span>
                <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                  {monthOrders.length} รายการ
                </span>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-semibold">สำเร็จแล้ว</span>
                <span className="text-xl font-extrabold text-[#05CD99] mt-1 block">
                  {monthOrders.filter((o) => o.deliveryStatus === 'จัดส่งสำเร็จ').length} รายการ
                </span>
              </div>
            </div>
          </main>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  TAB 5: COMBINED HISTORY (ประวัติทั้งหมด)          */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <main
            className="px-5 space-y-4 flex-1 bg-white"
            style={{ paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
          >
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setActiveTab('home')}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200/50 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-800">ประวัติ</h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    {selectedMonth === 'ALL'
                      ? 'ประวัติคำสั่งซื้อและค่าใช้จ่ายทั้งหมด'
                      : `ประวัติรอบเดือน ${formatThaiMonth(selectedMonth)}`}
                  </p>
                </div>
              </div>

              {/* Month Selector: ไม่มีพื้นหลัง และไม่มีเส้นขอบ */}
              <div className="relative inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer transition-colors shrink-0">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-slate-700 hover:text-slate-900 text-xs font-bold outline-none cursor-pointer appearance-none pr-4 border-none shadow-none"
                >
                  <option value="ALL">ทุกรอบเดือน</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatThaiMonth(m)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
              </div>
            </div>

            {/* Summary Metrics (เน้นจำนวนเงิน ยอดคำสั่งซื้อ รายจ่าย กำไร ให้ใหญ่ขึ้น เห็นได้ชัดเจน) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* ยอดคำสั่งซื้อ */}
              <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/50 shadow-xs flex flex-col justify-between text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1 block">
                  ยอดคำสั่งซื้อ
                </span>
                <p className="text-base sm:text-xl font-black text-emerald-600 tracking-tight leading-tight">
                  +{totalOrdersAmount.toLocaleString()}
                </p>
              </div>

              {/* รายจ่าย */}
              <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/50 shadow-xs flex flex-col justify-between text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1 block">
                  รายจ่ายรวม
                </span>
                <p className="text-base sm:text-xl font-black text-rose-600 tracking-tight leading-tight">
                  -{totalExpensesAmount.toLocaleString()}
                </p>
              </div>

              {/* กำไร */}
              <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/50 shadow-xs flex flex-col justify-between text-center relative overflow-hidden group">
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  (totalOrdersAmount - totalExpensesAmount) >= 0 ? 'bg-[#05CD99]' : 'bg-rose-500'
                }`} />
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1 block">
                  กำไรเบื้องต้น
                </span>
                <p className={`text-base sm:text-xl font-black tracking-tight leading-tight ${
                  (totalOrdersAmount - totalExpensesAmount) >= 0 ? 'text-[#05CD99]' : 'text-rose-600'
                }`}>
                  {(totalOrdersAmount - totalExpensesAmount).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อลูกค้า, รายการ, ร้านค้า, เลขที่..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-[#6C5DD3]/10 focus:border-[#6C5DD3] transition-all"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills with matching category colors (ปรับสีของตัวกรองให้เข้ากันกับแต่ละหมวดหมู่) */}
            <div className="flex gap-2 pb-0.5">
              {[
                {
                  id: 'ALL',
                  label: 'ทั้งหมด',
                  count: monthOrders.length + monthExpenses.length,
                  activeCls: 'bg-slate-900 text-white shadow-sm border-slate-900',
                  inactiveCls: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/50 shadow-xs',
                  badgeActive: 'bg-white/20 text-white',
                  badgeInactive: 'bg-slate-100 text-slate-500',
                  dot: 'bg-slate-400',
                },
                {
                  id: 'ORDERS',
                  label: 'คำสั่งซื้อ',
                  count: monthOrders.length,
                  activeCls: 'bg-[#6C5DD3] text-white shadow-md shadow-[#6C5DD3]/20 border-[#6C5DD3]',
                  inactiveCls: 'bg-white text-[#6C5DD3] hover:bg-purple-50/60 border-slate-200/50 shadow-xs',
                  badgeActive: 'bg-white/25 text-white',
                  badgeInactive: 'bg-purple-100/80 text-[#6C5DD3]',
                  dot: 'bg-[#6C5DD3]',
                },
                {
                  id: 'EXPENSES',
                  label: 'รายจ่าย',
                  count: monthExpenses.length,
                  activeCls: 'bg-[#FF8A00] text-white shadow-md shadow-[#FF8A00]/20 border-[#FF8A00]',
                  inactiveCls: 'bg-white text-[#FF8A00] hover:bg-orange-50/60 border-slate-200/50 shadow-xs',
                  badgeActive: 'bg-white/25 text-white',
                  badgeInactive: 'bg-orange-100/80 text-[#FF8A00]',
                  dot: 'bg-[#FF8A00]',
                },
              ].map((tab) => {
                const isActive = historyFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setHistoryFilter(tab.id as any);
                      setHistoryExpenseCat('ALL');
                      setHistoryOrderStatus('ALL');
                    }}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border active:scale-95 ${
                      isActive ? tab.activeCls : tab.inactiveCls
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tab.dot} ${isActive ? 'bg-white' : ''}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? tab.badgeActive : tab.badgeInactive
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-Filter for Expenses: Category Pills with Category Colors */}
            {historyFilter === 'EXPENSES' && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 animate-fadeIn">
                {['ALL', ...expenseCategories].map((cat) => {
                  const style = getExpenseCategoryStyle(cat);
                  const isActive = historyExpenseCat === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setHistoryExpenseCat(cat)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border active:scale-95 ${
                        isActive
                          ? cat === 'ALL'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : `${style.iconBg} border-current shadow-xs`
                          : 'bg-white text-slate-500 hover:text-slate-700 border-slate-200/50 shadow-xs'
                      }`}
                    >
                      {cat !== 'ALL' && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                      )}
                      <span>{cat === 'ALL' ? 'ทุกหมวด' : cat}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sub-Filter for Orders: Status Pills with Status Colors */}
            {historyFilter === 'ORDERS' && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 animate-fadeIn">
                {[
                  { id: 'ALL', label: 'ทุกสถานะ' },
                  { id: 'รอดำเนินการ', label: 'รอดำเนินการ', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
                  { id: 'กำลังจัดทำ', label: 'กำลังจัดทำ', dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50' },
                  { id: 'จัดทำเสร็จสิ้น', label: 'ผลิตเสร็จ', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { id: 'รอจัดส่ง', label: 'รอจัดส่ง', dot: 'bg-blue-400', text: 'text-blue-700', bg: 'bg-blue-50' },
                  { id: 'จัดส่งเสร็จสิ้น', label: 'จัดส่งสำเร็จ', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { id: 'รอชำระ', label: 'รอชำระ', dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
                ].map((st) => {
                  const isActive = historyOrderStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setHistoryOrderStatus(st.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border active:scale-95 ${
                        isActive
                          ? st.id === 'ALL'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : `${st.bg} ${st.text} border-current shadow-xs`
                          : 'bg-white text-slate-500 hover:text-slate-700 border-slate-200/50 shadow-xs'
                      }`}
                    >
                      {st.dot && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                      )}
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Combined Timeline List */}
            {combinedHistory.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-slate-200/50 shadow-xs">
                <History className="w-10 h-10 mx-auto text-slate-300" />
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {historySearch
                      ? 'ไม่พบประวัติรายการที่ค้นหา'
                      : selectedMonth !== 'ALL' && (monthOrders.length + monthExpenses.length === 0)
                      ? `ไม่มีประวัติในรอบเดือน ${formatThaiMonth(selectedMonth)}`
                      : 'ยังไม่มีประวัติรายการ'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedMonth !== 'ALL' && (monthOrders.length + monthExpenses.length === 0)
                      ? 'แตะปุ่มด้านล่างเพื่อดูประวัติทุกรอบเดือน'
                      : 'รายการคำสั่งซื้อและค่าใช้จ่ายจะแสดงที่นี่'}
                  </p>
                </div>
                {selectedMonth !== 'ALL' && (monthOrders.length + monthExpenses.length === 0) && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth('ALL')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6C5DD3] text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>ดูประวัติทุกรอบเดือน</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {combinedHistory.map((item) => {
                  if (item.type === 'order') {
                    const o = item.order;
                    return (
                      <div
                        key={item.key}
                        className="bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-200/50 shadow-xs"
                      >
                        <div className="min-w-0 pr-3 flex-1">
                          {/* แถวแรก: รายละเอียดสินค้า สีดำตัวใหญ่ */}
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {o.productDetails || 'ไม้พาเลท'}
                          </p>
                          {/* แถวที่สอง: ชื่อลูกค้า สีเทา ตัวบาง ตัวเล็ก */}
                          <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
                            {o.customerName} <span className="opacity-75">· #{o.orderId}</span>
                          </p>
                          {/* แถวที่สาม: ป้ายคำสั่งซื้อ และ วันที่ */}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                            <span className="text-[9px] bg-purple-50 text-[#6C5DD3] font-bold px-1.5 py-0.5 rounded-md">
                              คำสั่งซื้อ
                            </span>
                            <span>·</span>
                            <span>{formatThaiDate(o.orderDate)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base sm:text-lg font-black text-emerald-600 tracking-tight">
                            +{o.totalPrice.toLocaleString()}
                          </p>
                          <div className="mt-0.5 flex justify-end">
                            <StatusPill status={deduceTimelineStep(o).name} noBg />
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const e = item.expense;
                    const catStyle = getExpenseCategoryStyle(e.category);
                    return (
                      <div
                        key={item.key}
                        className="bg-white rounded-2xl p-4 flex items-center justify-between border border-slate-200/50 shadow-xs"
                      >
                        <div className="min-w-0 pr-3 flex-1">
                          {/* แถวแรก: รายการสินค้า สีดำตัวใหญ่ */}
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {e.itemName} <span className="text-slate-400 font-normal">({e.qty} {e.unit})</span>
                          </p>
                          {/* แถวที่สอง: ร้านค้า สีเทา ตัวบาง ตัวเล็ก */}
                          <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
                            {e.vendor} {e.billNo ? `· #${e.billNo}` : ''}
                          </p>
                          {/* แถวที่สาม: ป้ายรายจ่าย หมวดหมู่ และ วันที่ */}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                            <span className="text-[9px] bg-orange-50 text-[#FF8A00] font-bold px-1.5 py-0.5 rounded-md">
                              รายจ่าย
                            </span>
                            <span className={`font-bold flex items-center gap-1 bg-transparent border-0 ${catStyle.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${catStyle.dot}`} />
                              {e.category}
                            </span>
                            <span>·</span>
                            <span>{formatThaiDate(e.billDate)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base sm:text-lg font-black text-rose-600 tracking-tight">
                            -{e.totalItemPrice.toLocaleString()}
                          </p>
                          {e.fileUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewBill({
                                  url: e.fileUrl,
                                  vendor: e.vendor,
                                  itemName: e.itemName,
                                  billNo: e.billNo,
                                  amount: e.totalItemPrice,
                                  date: e.billDate,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6C5DD3] hover:text-[#5244ad] bg-purple-50 hover:bg-purple-100/80 px-2 py-0.5 rounded-lg border border-purple-200/70 transition-all cursor-pointer mt-0.5 active:scale-95 shadow-2xs"
                            >
                              <Eye className="w-3 h-3" /> ดูบิล
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </main>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  FLOATING BOTTOM NAVIGATION BAR (Solid White)     */}
        {/* ══════════════════════════════════════════════════ */}
        <nav
          className="fixed bottom-0 left-0 right-0 w-full bg-white z-40 border-t border-slate-100 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
          style={{ paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.35rem))' }}
        >
          <div className="max-w-[430px] mx-auto px-3 pt-2">
            <div className="flex items-center justify-around relative">
              {/* 1: Home */}
              <button
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center gap-1 py-1 px-2 transition-colors ${
                  activeTab === 'home' ? 'text-[#6C5DD3]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <LayoutDashboard className="w-6 h-6" />
                <span className="text-xs font-bold">หน้าแรก</span>
              </button>

              {/* 2: Orders / Invoices */}
              <button
                onClick={() => {
                  setOrderFilter('ALL');
                  setActiveTab('orders');
                }}
                className={`flex flex-col items-center gap-1 py-1 px-2 transition-colors ${
                  activeTab === 'orders' ? 'text-[#6C5DD3]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Package className="w-6 h-6" />
                <span className="text-xs font-bold">คำสั่งซื้อ</span>
              </button>

              {/* 3: Elevated Center Floating Action Button (ปุ่มวงกลม สีม่วงไล่เฉด ไอคอน + ไม่มีขอบขาว ไม่มีเงา) */}
              <div className="relative -top-5 shrink-0">
                <button
                  onClick={() => setQuickActionOpen(true)}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#5541D7] via-[#6C5DD3] to-[#8F7CFF] flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
                  title="สร้างรายการใหม่"
                >
                  <Plus className="w-7 h-7 text-white stroke-[2.5]" />
                </button>
              </div>

              {/* 4: Expenses List */}
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex flex-col items-center gap-1 py-1 px-2 transition-colors ${
                  activeTab === 'expenses' ? 'text-[#FF8A00]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Receipt className="w-6 h-6" />
                <span className="text-xs font-bold">รายจ่าย</span>
              </button>

              {/* 5: History */}
              <button
                onClick={() => setActiveTab('history')}
                className={`flex flex-col items-center gap-1 py-1 px-2 transition-colors ${
                  activeTab === 'history' ? 'text-[#6C5DD3]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <History className="w-6 h-6" />
                <span className="text-xs font-bold">ประวัติ</span>
              </button>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════ */}
        {/*  QUICK ACTION BOTTOM SHEET                        */}
        {/* ══════════════════════════════════════════════════ */}
        {quickActionOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-[430px] bg-white rounded-t-3xl px-5 pt-3 pb-6 space-y-2 animate-slideUp">
              {/* Top Handle Bar & Close Button */}
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 opacity-0 pointer-events-none" />
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
                <button
                  onClick={() => setQuickActionOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                  title="ปิด"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2">
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    setEditingOrder(null);
                    setNewOrder(blankOrder);
                    setShowOrderModal(true);
                  }}
                  className="p-3 flex flex-col items-center gap-2.5 transition-all active:scale-95 text-center group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#6C5DD3] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Package className="w-7 h-7" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-slate-800">+ เพิ่มคำสั่งซื้อ</span>
                  <span className="text-xs text-slate-400">สร้างใบสั่งซื้อและบันทึกมัดจำ</span>
                </button>

                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    setEditingExpense(null);
                    setExpenseForm(blankExpenseForm);
                    setExpenseItems([createBlankSubItem()]);
                    setBillFile(null);
                    setShowExpenseModal(true);
                  }}
                  className="p-3 flex flex-col items-center gap-2.5 transition-all active:scale-95 text-center group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#FF8A00] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-slate-800">+ จดบิลค่าใช้จ่าย</span>
                  <span className="text-xs text-slate-400">ไม้ วัตถุดิบ ตะปู และค่าแรง</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  CREATE ORDER MODAL                               */}
        {/* ══════════════════════════════════════════════════ */}
        {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full max-w-[460px] sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200/60">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3.5 sticky top-0 bg-white z-10 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingOrder ? 'แก้ไขข้อมูลคำสั่งซื้อ' : 'สร้างคำสั่งซื้อใหม่'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingOrder ? `ออเดอร์ #${editingOrder.orderId}` : 'กรอกข้อมูลรายละเอียดคำสั่งซื้อ'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setEditingOrder(null);
                    setNewOrder(blankOrder);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content: White background, outside labels, gray-bordered inputs, descriptive placeholders */}
              <form onSubmit={handleSaveOrder} className="px-6 py-4 space-y-4 flex-1 overflow-y-auto bg-white">
                {/* 1. ชื่อลูกค้า */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    ชื่อลูกค้า / ผู้สั่งซื้อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="กรอกชื่อ-นามสกุล หรือชื่อร้านค้าผู้สั่งซื้อ"
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all"
                  />
                </div>

                {/* 2. เบอร์โทร */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="กรอกหมายเลขโทรศัพท์ติดต่อลูกค้า"
                    value={newOrder.phone}
                    onChange={(e) => setNewOrder({ ...newOrder, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all"
                  />
                </div>

                {/* 3. วิธีจัดส่ง */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    วิธีจัดส่ง
                  </label>
                  <div className="relative">
                    <select
                      value={newOrder.deliveryMethod}
                      onChange={(e) => setNewOrder({ ...newOrder, deliveryMethod: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 outline-none cursor-pointer appearance-none pr-10 focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all"
                    >
                      {deliveryMethods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      {newOrder.deliveryMethod && !deliveryMethods.includes(newOrder.deliveryMethod) && (
                        <option value={newOrder.deliveryMethod}>{newOrder.deliveryMethod}</option>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. ที่อยู่จัดส่ง */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    ที่อยู่จัดส่ง
                  </label>
                  <textarea
                    rows={2}
                    placeholder="กรอกสถานที่จัดส่ง จุดรับสินค้า หรือแผนที่สังเขป"
                    value={newOrder.address}
                    onChange={(e) => setNewOrder({ ...newOrder, address: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all resize-none"
                  />
                </div>

                {/* 5. รายละเอียดสินค้า / สเปก / จำนวน * */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    รายละเอียดสินค้า / สเปก / จำนวน <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="กรอกรายละเอียดสินค้า ขนาด สเปกงานสั่งทำ และจำนวนชิ้นงาน"
                    value={newOrder.productDetails}
                    onChange={(e) => setNewOrder({ ...newOrder, productDetails: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all resize-none"
                  />
                </div>

                {/* 6 & 7. วันที่สั่งซื้อ & กำหนดส่งมอบ */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                      วันที่สั่งซื้อ
                    </label>
                    <input
                      type="date"
                      value={newOrder.orderDate}
                      onChange={(e) => setNewOrder({ ...newOrder, orderDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-normal text-slate-800 outline-none cursor-pointer focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                      กำหนดส่งมอบ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={newOrder.deliveryDate}
                      onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-normal text-slate-800 outline-none cursor-pointer focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all"
                    />
                  </div>
                </div>

                {/* 8 & 9. ราคารวม & มัดจำแล้ว */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                      ราคารวม (บาท) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      required
                      placeholder="ระบุยอดเงินราคารวม"
                      value={newOrder.totalPrice}
                      onChange={(e) => setNewOrder({ ...newOrder, totalPrice: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                      มัดจำแล้ว (บาท)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="ระบุจำนวนเงินมัดจำ"
                      value={newOrder.deposit}
                      onChange={(e) => setNewOrder({ ...newOrder, deposit: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all"
                    />
                  </div>
                </div>

                {/* 10. คงเหลือชำระ (คำนวณอัตโนมัติ) */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    คงเหลือชำระ (คำนวณอัตโนมัติ)
                  </label>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">ยอดเงินส่วนที่เหลือที่ต้องชำระ:</span>
                    <span className="text-base sm:text-lg font-bold text-rose-600">
                      ฿{modalBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 11. ขั้นตอนสถานะคำสั่งซื้อ (Timeline) */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    ขั้นตอนสถานะคำสั่งซื้อ (Timeline)
                  </label>
                  <div className="relative">
                    <select
                      value={newOrder.orderStatus || 'มัดจำแล้ว'}
                      onChange={(e) => setNewOrder({ ...newOrder, orderStatus: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 outline-none cursor-pointer appearance-none pr-10 focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 transition-all"
                    >
                      {ORDER_TIMELINE_STEPS.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.id}. {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6C5DD3] hover:bg-[#5b4eb8] active:scale-98 text-white font-bold py-3.5 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-500/20 pt-3"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> กำลังบันทึก...
                    </>
                  ) : editingOrder ? (
                    'อัปเดตข้อมูลคำสั่งซื้อ'
                  ) : (
                    'บันทึกคำสั่งซื้อ'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  DELETE ORDER CONFIRMATION MODAL                  */}
        {/* ══════════════════════════════════════════════════ */}
        {deleteConfirmOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-scaleUp">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">
                  ยืนยันการลบคำสั่งซื้อ
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  คุณต้องการลบคำสั่งซื้อหมายเลข{' '}
                  <span className="font-bold text-slate-900">
                    #{deleteConfirmOrder.orderId}
                  </span>{' '}
                  ของลูกค้า{' '}
                  <span className="font-bold text-slate-900">
                    &ldquo;{deleteConfirmOrder.customerName}&rdquo;
                  </span>{' '}
                  ใช่หรือไม่?
                </p>
                <p className="text-[11px] text-rose-500 font-medium">
                  *ข้อมูลนี้จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmOrder(null)}
                  className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteOrder}
                  className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังลบ...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> ยืนยันการลบ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  DELETE EXPENSE CONFIRMATION MODAL                */}
        {/* ══════════════════════════════════════════════════ */}
        {deleteConfirmExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-scaleUp">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">
                  ยืนยันการลบค่าใช้จ่าย
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  คุณต้องการลบรายการ{' '}
                  <span className="font-bold text-slate-900">
                    &ldquo;{deleteConfirmExpense.itemName}&rdquo;
                  </span>{' '}
                  (ร้านค้า: {deleteConfirmExpense.vendor}) ยอดเงิน{' '}
                  <span className="font-bold text-rose-600">
                    {deleteConfirmExpense.totalItemPrice.toLocaleString()}
                  </span>{' '}
                  ใช่หรือไม่?
                </p>
                <p className="text-[11px] text-rose-500 font-medium">
                  *ข้อมูลนี้จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingExpense}
                  onClick={() => setDeleteConfirmExpense(null)}
                  className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeletingExpense}
                  onClick={handleConfirmDeleteExpense}
                  className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingExpense ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังลบ...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> ยืนยันการลบ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  CREATE / EDIT EXPENSE MODAL                      */}
        {/* ══════════════════════════════════════════════════ */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full max-w-[460px] sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200/60">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3.5 sticky top-0 bg-white z-10 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF8A00] shadow-xs">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editingExpense ? 'แก้ไขรายการค่าใช้จ่าย' : 'บันทึกค่าใช้จ่ายใหม่'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {editingExpense ? 'แก้ไขรายละเอียดค่าใช้จ่ายและบันทึกข้อมูล' : 'ตรวจสอบรายการย่อยและบันทึกบิล'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowExpenseModal(false);
                    setEditingExpense(null);
                    setExpenseForm(blankExpenseForm);
                    setExpenseItems([createBlankSubItem()]);
                    setBillFile(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content: White background, outside labels, gray-bordered inputs, descriptive placeholders */}
              <form onSubmit={handleSaveExpenseModal} className="px-6 py-4 space-y-4 flex-1 overflow-y-auto bg-white">
                {/* AI Auto-Fill Scan Card */}
                {!editingExpense && (
                  <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-orange-50/70 rounded-2xl p-3.5 space-y-2.5 border border-purple-100 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C5DD3] to-[#8E78FB] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">สแกนบิลด้วย AI อัตโนมัติ</p>
                        <p className="text-[10px] text-slate-500">เลือกรูปหรือถ่ายบิล AI จะอ่านร้านค้า เลขที่บิล และแตกทุกรายการสินค้าให้อัตโนมัติ</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      {/* ปุ่ม 1: เลือกจากคลังภาพ */}
                      <label
                        className={`h-9 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold hover:bg-slate-50 shadow-xs ${
                          isScanning ? 'opacity-60 cursor-wait' : ''
                        }`}
                      >
                        <LucideImage className="w-3.5 h-3.5 text-[#6C5DD3]" />
                        <span>{isScanning ? 'กำลังอ่าน...' : 'เลือกจากคลังภาพ'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          disabled={isScanning}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleScanReceipt(file);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>

                      {/* ปุ่ม 2: ถ่ายรูปบิลสด */}
                      <label
                        className={`h-9 px-3 rounded-xl bg-gradient-to-r from-[#6C5DD3] to-[#8E78FB] text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold shadow-xs ${
                          isScanning ? 'opacity-60 cursor-wait' : 'hover:opacity-95'
                        }`}
                      >
                        {isScanning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>กำลังอ่าน...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" />
                            <span>ถ่ายรูปบิล</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={isScanning}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleScanReceipt(file);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* ── ข้อมูลหัวบิล ── */}
                <div className="space-y-3.5 pt-1">
                  {/* ร้านค้า / ผู้จำหน่าย */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                      ร้านค้า / ผู้จำหน่าย <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="กรอกชื่อร้านค้าหรือชื่อผู้จำหน่ายสินค้า"
                      value={expenseForm.vendor}
                      onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                    />
                  </div>

                  {/* วันที่บิล & เลขที่บิล */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                        วันที่บิล <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={expenseForm.billDate}
                        onChange={(e) => setExpenseForm({ ...expenseForm, billDate: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 outline-none cursor-pointer focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                        เลขที่บิล / ใบเสร็จ
                      </label>
                      <input
                        type="text"
                        placeholder="กรอกเลขที่เอกสารหรือเลขที่บิล"
                        value={expenseForm.billNo}
                        onChange={(e) => setExpenseForm({ ...expenseForm, billNo: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* วิธีชำระเงิน */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                      วิธีชำระเงิน
                    </label>
                    <div className="relative">
                      <select
                        value={expenseForm.paymentMethod}
                        onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 outline-none cursor-pointer appearance-none pr-10 focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                      >
                        <option value="โอนเงิน">โอนเงิน</option>
                        <option value="เงินสด">เงินสด</option>
                        <option value="บัตรเครดิต">บัตรเครดิต</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* ── รายการสินค้าในบิล (Sub-items Section) ── */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        รายการสินค้าในบิล
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF8A00] text-[10px] font-bold">
                        {expenseItems.length} รายการ
                      </span>
                    </div>
                    {!editingExpense && (
                      <button
                        type="button"
                        onClick={handleAddSubItem}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-orange-50 border border-orange-200 text-[#FF8A00] hover:bg-orange-100 text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มรายการ</span>
                      </button>
                    )}
                  </div>

                  {/* List of sub-items */}
                  <div className="space-y-3">
                    {expenseItems.map((item, idx) => {
                      return (
                        <div
                          key={item.id || idx}
                          className="bg-white rounded-2xl p-4 space-y-3 border border-slate-200 shadow-xs relative transition-all"
                        >
                          {/* Row 1: Item Index + Category Select + Delete Button */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="relative flex-1 min-w-0">
                                <select
                                  value={item.category}
                                  onChange={(e) => handleUpdateSubItem(item.id, { category: e.target.value })}
                                  className="w-full bg-white hover:bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#FF8A00] cursor-pointer appearance-none pr-7 truncate transition-colors"
                                >
                                  {expenseCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                  {item.category && !expenseCategories.includes(item.category) && (
                                    <option value={item.category}>{item.category}</option>
                                  )}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            {/* Delete button (only when items > 1) */}
                            {!editingExpense && expenseItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSubItem(item.id)}
                                className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center active:scale-90 transition-all shrink-0 cursor-pointer"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Row 2: Item Name */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              ชื่อรายการสินค้า / ค่าใช้จ่าย <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="กรอกชื่อรายการสินค้าหรือวัสดุอุปกรณ์"
                              value={item.itemName}
                              onChange={(e) => handleUpdateSubItem(item.id, { itemName: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                            />
                          </div>

                          {/* Row 3: Qty, Unit, Total Price */}
                          <div className="grid grid-cols-12 gap-2.5 items-end">
                            <div className="col-span-3 space-y-1.5">
                              <label className="block text-xs font-semibold text-slate-700">
                                จำนวน
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0.1"
                                step="any"
                                required
                                placeholder="1"
                                value={item.qty}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Number(e.target.value);
                                  handleUpdateSubItem(item.id, { qty: val as any });
                                }}
                                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2.5 text-sm font-normal text-slate-800 text-center placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                              />
                            </div>

                            <div className="col-span-3 space-y-1.5">
                              <label className="block text-xs font-semibold text-slate-700">
                                หน่วยนับ
                              </label>
                              <input
                                type="text"
                                placeholder="เช่น ชิ้น"
                                value={item.unit}
                                onChange={(e) => handleUpdateSubItem(item.id, { unit: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2.5 text-sm font-normal text-slate-800 text-center placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                              />
                            </div>

                            <div className="col-span-6 space-y-1.5">
                              <label className="block text-xs font-semibold text-slate-700 text-right">
                                ราคารวมรายการ (บาท) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="any"
                                required
                                placeholder="ระบุราคารวม"
                                value={item.totalItemPrice}
                                onChange={(e) => handleUpdateSubItem(item.id, { totalItemPrice: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-normal text-slate-800 text-right placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* สรุปยอดรวมทั้งบิล (Grand Total Card) */}
                <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-amber-950">
                      ยอดรวมทั้งบิล ({expenseItems.length} รายการ)
                    </span>
                    <p className="text-[10px] text-amber-800">
                      ตรวจสอบความถูกต้องของรายการก่อนกดบันทึก
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-black text-[#FF8A00]">
                      ฿{totalBillAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* ── ข้อมูลเพิ่มเติม: แนบรูปใบเสร็จ & หมายเหตุ ── */}
                <div className="space-y-3.5 pt-1">
                  {/* แนบรูปใบเสร็จ / บิล */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                      แนบรูปใบเสร็จ / บิล
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-white border border-slate-300 hover:border-slate-400 transition-colors shadow-xs">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Upload className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {billFile ? billFile.name : 'เลือกไฟล์รูปภาพ หรือ PDF จากเครื่อง'}
                        </p>
                        <p className="text-[10px] text-slate-400">รองรับไฟล์ JPG, PNG, PDF</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* หมายเหตุ */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                      หมายเหตุเพิ่มเติม (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      placeholder="กรอกบันทึกข้อความหรือเงื่อนไขเพิ่มเติม"
                      value={expenseForm.note}
                      onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/10 transition-all"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF8A00] hover:bg-[#e67a00] active:scale-98 text-white font-bold py-3.5 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-orange-500/20 pt-3"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> กำลังบันทึก...
                    </>
                  ) : editingExpense ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> อัปเดตรายการค่าใช้จ่าย
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> บันทึกค่าใช้จ่าย ({expenseItems.length} รายการ · ฿{totalBillAmount.toLocaleString()})
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/*  BILL PREVIEW MODAL (พรีวิวรูปบิล/ใบเสร็จบนหน้าจอ) */}
        {/* ══════════════════════════════════════════════════ */}
        {previewBill && (() => {
          const isDrive = previewBill.url.includes('drive.google.com');
          const driveMatch = previewBill.url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
          const driveFileId = driveMatch ? driveMatch[1] : null;
          const isPdf = previewBill.url.toLowerCase().endsWith('.pdf') || previewBill.url.includes('application/pdf');
          const iframeSrc = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/preview` : previewBill.url;

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
              onClick={() => setPreviewBill(null)}
            >
              <div
                className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-200/60 animate-scaleUp"
                onClick={(ev) => ev.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FF8A00]" />
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {previewBill.vendor || 'ใบเสร็จรับเงิน / บิลค่าใช้จ่าย'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {previewBill.itemName && <span>{previewBill.itemName} · </span>}
                      {previewBill.billNo && <span>เลขที่ #{previewBill.billNo} · </span>}
                      {previewBill.date && <span>{formatThaiDate(previewBill.date)}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {previewBill.amount !== undefined && (
                      <span className="text-sm sm:text-base font-black text-[#FF8A00] mr-1">
                        ฿{previewBill.amount.toLocaleString()}
                      </span>
                    )}
                    <a
                      href={previewBill.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title="เปิดไฟล์ขนาดเต็มในแท็บใหม่"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setPreviewBill(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title="ปิดหน้าต่างพรีวิว"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Preview Body */}
                <div className="p-3 sm:p-4 bg-slate-950/95 flex-1 overflow-auto flex items-center justify-center min-h-[320px] max-h-[75vh]">
                  {isDrive || isPdf ? (
                    <iframe
                      src={iframeSrc}
                      title="พรีวิวบิล"
                      className="w-full h-[65vh] rounded-2xl border-0 bg-white shadow-inner"
                      allow="autoplay"
                    />
                  ) : (
                    <img
                      src={previewBill.url}
                      alt={previewBill.vendor || 'รูปภาพบิล'}
                      className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg mx-auto"
                    />
                  )}
                </div>

                {/* Modal Footer Controls */}
                <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 truncate mr-2">
                    แตะนอกกรอบหรือกดปุ่มปิด เพื่อกลับสู่หน้าเดิม
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={previewBill.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> แท็บใหม่
                    </a>
                    <button
                      type="button"
                      onClick={() => setPreviewBill(null)}
                      className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── Authentication Modal (Sign In / Register / Reset Password) ─── */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            fetchData();
          }}
        />

        {/* ─── Store Settings Modal (Store Name, Logo, Categories, Details) ─── */}
        <StoreSettingsModal
          isOpen={showStoreSettings}
          onClose={() => setShowStoreSettings(false)}
          initialSettings={{
            businessName:
              userProfile?.businessName ||
              currentUser?.user_metadata?.business_name ||
              'ร้านพาเลทไอเดียเฟอร์นิเจอร์',
            phone: storeDetails.phone || (userProfile as any)?.phone || '',
            address: storeDetails.address || '',
            taxId: storeDetails.taxId || '',
            tagline: storeDetails.tagline || '',
            logoUrl: storeLogo,
            categories: expenseCategories,
            deliveryMethods: deliveryMethods,
          }}
          onSave={handleSaveStoreSettings}
        />

      </div>
    </div>
  );
}

