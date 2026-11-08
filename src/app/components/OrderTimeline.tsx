'use client';

import React, { useState } from 'react';
import {
  ORDER_TIMELINE_STEPS,
  TimelineStepConfig,
  deduceTimelineStep,
  getStepByIndex,
} from '@/lib/orderTimeline';
import {
  Check,
  ChevronDown,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Clock,
  Hammer,
  Truck,
  Package,
  Award,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  ChevronUp,
  AlertCircle,
  X,
  Banknote,
  Wallet,
} from 'lucide-react';

export interface PaymentDetails {
  deposit?: number;
  balance?: number;
  paymentMethod?: string;
  paymentNote?: string;
}

interface OrderTimelineProps {
  order: {
    rowNumber: number;
    orderId?: string;
    customerName?: string;
    orderStatus?: string;
    paymentStatus?: string;
    prodStatus?: string;
    deliveryStatus?: string;
    note?: string;
    balance?: number;
    totalPrice?: number;
    deposit?: number;
    deliveryDate?: string;
  };
  onUpdateStatus: (
    rowNumber: number,
    newStatus: string,
    paymentDetails?: PaymentDetails
  ) => Promise<void> | void;
  isUpdating?: boolean;
}

export function OrderTimeline({ order, onUpdateStatus, isUpdating = false }: OrderTimelineProps) {
  const currentStep = deduceTimelineStep(order);
  const currentIdx = currentStep.id; // 1 to 10
  const progressPercent = Math.round((currentIdx / 10) * 100);

  const hasNextStep = currentIdx < 10;
  const nextStep = hasNextStep ? getStepByIndex(currentIdx + 1) : null;
  const hasPrevStep = currentIdx > 1;
  const prevStep = hasPrevStep ? getStepByIndex(currentIdx - 1) : null;

  const [showAllSteps, setShowAllSteps] = useState(true);
  const [showManualSelect, setShowManualSelect] = useState(false);

  // ── Modal State for Payment Steps ("มัดจำแล้ว" and "ชำระเงินส่วนที่เหลือ") ──
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    type: 'deposit' | 'remaining';
    targetStatus: string;
  } | null>(null);
  const [actualAmount, setActualAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'เงินโอน' | 'เงินสด'>('เงินโอน');

  // Trigger modal when changing to 'มัดจำแล้ว' or 'ชำระเงินส่วนที่เหลือ'
  const handleRequestStatus = (targetStatus: string) => {
    const totalPrice = Number(order.totalPrice) || 0;
    const currentDeposit = Number(order.deposit) || 0;

    if (targetStatus === 'มัดจำแล้ว') {
      const defaultDeposit = currentDeposit > 0 ? currentDeposit : Math.round(totalPrice * 0.5);
      setActualAmount(defaultDeposit > 0 ? String(defaultDeposit) : '');
      setPaymentMethod('เงินโอน');
      setPaymentModal({ isOpen: true, type: 'deposit', targetStatus });
      return;
    }

    if (targetStatus === 'ชำระเงินส่วนที่เหลือ') {
      const expectedRemaining =
        order.balance !== undefined && order.balance !== null
          ? Number(order.balance)
          : Math.max(0, totalPrice - currentDeposit);
      setActualAmount(expectedRemaining > 0 ? String(expectedRemaining) : '');
      setPaymentMethod('เงินโอน');
      setPaymentModal({ isOpen: true, type: 'remaining', targetStatus });
      return;
    }

    // Direct update for other statuses
    onUpdateStatus(order.rowNumber, targetStatus);
  };

  // Icon mapping helper
  const renderStepIcon = (step: TimelineStepConfig, isPassed: boolean, isActive: boolean) => {
    if (isPassed) {
      return <Check className="w-3.5 h-3.5 text-white stroke-[3]" />;
    }

    switch (step.id) {
      case 1:
        return <CreditCard className="w-3.5 h-3.5" />;
      case 2:
        return <Sparkles className="w-3.5 h-3.5" />;
      case 3:
        return <Clock className="w-3.5 h-3.5" />;
      case 4:
        return <Hammer className="w-3.5 h-3.5" />;
      case 5:
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 6:
        return <Package className="w-3.5 h-3.5" />;
      case 7:
        return <Truck className="w-3.5 h-3.5" />;
      case 8:
        return <Package className="w-3.5 h-3.5" />;
      case 9:
        return <CreditCard className="w-3.5 h-3.5" />;
      case 10:
        return <Award className="w-3.5 h-3.5" />;
      default:
        return <span>{step.id}</span>;
    }
  };

  // Calculations for modal verification
  const modalTotalPrice = Number(order.totalPrice) || 0;
  const modalCurrentDeposit = Number(order.deposit) || 0;
  const inputAmountNum = parseFloat(actualAmount) || 0;

  const isDepositModal = paymentModal?.type === 'deposit';
  const isRemainingModal = paymentModal?.type === 'remaining';

  let canProceed = false;
  let validationMessage: React.ReactNode = null;

  if (isDepositModal) {
    const newDeposit = inputAmountNum;
    const newBalance = Math.max(0, modalTotalPrice - newDeposit);
    const sum = newDeposit + newBalance;

    if (inputAmountNum <= 0) {
      canProceed = false;
      validationMessage = (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>กรุณาระบุยอดมัดจำที่มากกว่า 0 บาท</span>
        </div>
      );
    } else if (newDeposit > modalTotalPrice) {
      canProceed = false;
      validationMessage = (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>ยอดมัดจำ ({newDeposit.toLocaleString()} บ.) เกินยอดขายรวม ({modalTotalPrice.toLocaleString()} บ.)</span>
        </div>
      );
    } else {
      canProceed = true;
      validationMessage = (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-emerald-800">✓ ยอดเงินถูกต้อง สามารถดำเนินการต่อได้</p>
            <p className="text-[11px] text-emerald-700">
              มัดจำ {newDeposit.toLocaleString()} บ. + คงเหลือ {newBalance.toLocaleString()} บ. = รวม {sum.toLocaleString()} บ. (ตรงกับยอดขาย)
            </p>
          </div>
        </div>
      );
    }
  } else if (isRemainingModal) {
    const remainingPaid = inputAmountNum;
    const totalCollected = modalCurrentDeposit + remainingPaid;
    const diff = modalTotalPrice - totalCollected;
    const isMatch = totalCollected === modalTotalPrice && remainingPaid >= 0;

    if (isMatch) {
      canProceed = true;
      validationMessage = (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-emerald-800">✓ ยอดเงินตรงกับยอดขายรวม 100%</p>
            <p className="text-[11px] text-emerald-700">
              มัดจำ ({modalCurrentDeposit.toLocaleString()} บ.) + ส่วนที่เหลือ ({remainingPaid.toLocaleString()} บ.) = รวม {totalCollected.toLocaleString()} บาท (ตรงกับยอดขายรวม)
            </p>
          </div>
        </div>
      );
    } else {
      canProceed = false;
      if (diff > 0) {
        validationMessage = (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-800">
                ⚠️ ยอดเงินยังไม่ตรงกับยอดขายรวม: ยังขาดอีก {diff.toLocaleString()} บาท
              </p>
              <p className="text-[11px] text-rose-700">
                มัดจำ ({modalCurrentDeposit.toLocaleString()} บ.) + ส่วนที่เหลือ ({remainingPaid.toLocaleString()} บ.) = {totalCollected.toLocaleString()} บ. (ยอดขายรวมคือ {modalTotalPrice.toLocaleString()} บ.)
              </p>
              <p className="text-[10px] text-rose-600 font-semibold mt-1">
                กรุณากรอกยอดให้ตรงกับยอดขายรวมจึงจะสามารถดำเนินการต่อได้
              </p>
            </div>
          </div>
        );
      } else {
        validationMessage = (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-800">
                ⚠️ ยอดเงินเกินยอดขายรวม: เกินมา {Math.abs(diff).toLocaleString()} บาท
              </p>
              <p className="text-[11px] text-rose-700">
                มัดจำ ({modalCurrentDeposit.toLocaleString()} บ.) + ส่วนที่เหลือ ({remainingPaid.toLocaleString()} บ.) = {totalCollected.toLocaleString()} บ. (ยอดขายรวมคือ {modalTotalPrice.toLocaleString()} บ.)
              </p>
              <p className="text-[10px] text-rose-600 font-semibold mt-1">
                กรุณากรอกยอดให้ตรงกับยอดขายรวมจึงจะสามารถดำเนินการต่อได้
              </p>
            </div>
          </div>
        );
      }
    }
  }

  const handleConfirmPaymentModal = () => {
    if (!canProceed || !paymentModal) return;

    if (isDepositModal) {
      const newDeposit = inputAmountNum;
      const newBalance = Math.max(0, modalTotalPrice - newDeposit);
      onUpdateStatus(order.rowNumber, 'มัดจำแล้ว', {
        deposit: newDeposit,
        balance: newBalance,
        paymentMethod,
        paymentNote: `มัดจำ ${newDeposit.toLocaleString()} บ. (${paymentMethod}) คงเหลือ ${newBalance.toLocaleString()} บ.`,
      });
    } else if (isRemainingModal) {
      const remainingPaid = inputAmountNum;
      onUpdateStatus(order.rowNumber, 'ชำระเงินส่วนที่เหลือ', {
        balance: 0,
        paymentMethod,
        paymentNote: `ชำระส่วนที่เหลือ ${remainingPaid.toLocaleString()} บ. (${paymentMethod}) รวมยอดขายครบถ้วน`,
      });
    }

    setPaymentModal(null);
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/50 space-y-3.5">
      {/* ── 1. Top Summary: Current Step Badge + Progress Bar ── */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              ขั้นตอนคำสั่งซื้อ (Timeline)
            </span>
            <span className="text-[11px] font-black text-[#6C5DD3]">
              {currentIdx}/10
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentStep.badgeBg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${currentStep.dotColor} animate-pulse`} />
              {currentStep.name}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#6C5DD3] to-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-medium">
          <span>{currentStep.shortDesc}</span>
          <span>คืบหน้า {progressPercent}%</span>
        </div>
      </div>

      {/* ── 2. Action Controllers (ปุ่มอัปเดตและรายงานตามขั้นตอน) ── */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/50 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            การดำเนินการขั้นตอน (Action)
          </span>
          {isUpdating && (
            <span className="text-[10px] text-[#6C5DD3] font-bold flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> กำลังบันทึก...
            </span>
          )}
        </div>

        {/* Primary Next Action Button (ตัดคำว่า 'อัปเดตเป็น' ออกไปตามที่ผู้ใช้สั่ง) */}
        {hasNextStep && nextStep ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleRequestStatus(nextStep.name)}
            className="w-full py-3 px-4 rounded-xl bg-[#6C5DD3] hover:bg-[#5b4eb8] active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#6C5DD3]/25 cursor-pointer disabled:opacity-50"
          >
            <span>{nextStep.name}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        ) : (
          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>คำสั่งซื้อนี้เสร็จสิ้นสมบูรณ์ 100% แล้ว</span>
          </div>
        )}

        {/* Secondary Actions: Step Back & Manual Step Selector */}
        <div className="flex items-center gap-2 pt-1">
          {hasPrevStep && prevStep ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleRequestStatus(prevStep.name)}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/50 active:scale-95 text-slate-600 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              title={`ย้อนกลับไปขั้นตอน: ${prevStep.name}`}
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>ย้อนกลับ ({prevStep.name})</span>
            </button>
          ) : (
            <div className="flex-1 text-[11px] text-slate-400 text-center py-1">
              ขั้นตอนเริ่มต้น
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setShowManualSelect(!showManualSelect)}
              className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/50 active:scale-95 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>เลือกขั้นตอนเอง</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Manual Jump Dropdown */}
            {showManualSelect && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200/80 p-1.5 z-20 space-y-0.5 animate-fadeIn">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1">
                  เลือกขั้นตอนที่ต้องการข้าม/แก้ไข:
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {ORDER_TIMELINE_STEPS.map((s) => {
                    const isSelected = s.id === currentIdx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setShowManualSelect(false);
                          if (s.name !== currentStep.name) {
                            handleRequestStatus(s.name);
                          }
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#6C5DD3]/10 text-[#6C5DD3] font-bold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-4 text-[10px] text-slate-400 font-mono">
                            {s.id}.
                          </span>
                          <span className="truncate">{s.name}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#6C5DD3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Visual Timeline Track (แสดงผลในรูปแบบ Timeline 10 ขั้นตอน) ── */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/50 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6C5DD3]" />
            เส้นทางสถานะออเดอร์ (10 ขั้นตอน)
          </span>
          <button
            type="button"
            onClick={() => setShowAllSteps(!showAllSteps)}
            className="text-[10px] text-slate-400 hover:text-slate-600 font-medium flex items-center gap-0.5 cursor-pointer"
          >
            <span>{showAllSteps ? 'ย่อมุมมอง' : 'แสดงทั้งหมด'}</span>
            {showAllSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Timeline Items */}
        <div className="relative pl-2 sm:pl-3 space-y-0">
          {ORDER_TIMELINE_STEPS.map((s, idx) => {
            const isPassed = s.id < currentIdx;
            const isActive = s.id === currentIdx;
            const isFuture = s.id > currentIdx;
            const isLast = idx === ORDER_TIMELINE_STEPS.length - 1;

            // If collapsed, show completed condensed or current +- 1
            if (!showAllSteps && !isActive && s.id !== currentIdx + 1 && s.id !== currentIdx - 1 && s.id !== 1 && s.id !== 10) {
              return null;
            }

            return (
              <div key={s.id} className="relative flex items-start gap-3 group pb-3 last:pb-0">
                {/* Vertical Connector Line */}
                {!isLast && (
                  <div
                    className={`absolute left-[13px] sm:left-[15px] top-[26px] bottom-0 w-[2px] transition-colors ${
                      isPassed
                        ? 'bg-emerald-500'
                        : isActive
                        ? 'bg-gradient-to-b from-[#6C5DD3] to-slate-200'
                        : 'bg-slate-200'
                    }`}
                  />
                )}

                {/* Step Circle Bubble */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                    isPassed
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isActive
                      ? 'bg-[#6C5DD3] text-white ring-4 ring-[#6C5DD3]/25 shadow-md shadow-[#6C5DD3]/30 scale-105'
                      : 'bg-slate-100 border border-slate-300/80 text-slate-400'
                  }`}
                >
                  {renderStepIcon(s, isPassed, isActive)}
                </div>

                {/* Step Details & Reporting */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isActive
                          ? 'text-[#6C5DD3] font-black text-sm'
                          : isPassed
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.id}. {s.name}
                    </span>

                    {isActive && (
                      <span className="text-[9px] font-bold bg-[#6C5DD3]/15 text-[#6C5DD3] px-2 py-0.5 rounded-md animate-pulse">
                        ● กำลังดำเนินการ
                      </span>
                    )}

                    {isPassed && (
                      <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                        ผ่านแล้ว
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-[11px] mt-0.5 leading-relaxed ${
                      isActive
                        ? 'text-slate-700 font-medium'
                        : isPassed
                        ? 'text-slate-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.detail}
                  </p>

                  {/* Inline quick-advance button for the immediate next step */}
                  {isFuture && s.id === currentIdx + 1 && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleRequestStatus(s.name)}
                      className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6C5DD3]/10 hover:bg-[#6C5DD3]/20 text-[#6C5DD3] text-[10px] font-bold transition-all cursor-pointer"
                    >
                      <span>คลิกเพื่อเลื่อนมาขั้นตอนนี้</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Popup Modal for Payment Verification (มัดจำแล้ว & ชำระเงินส่วนที่เหลือ) ── */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDepositModal ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isDepositModal ? <Wallet className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    {isDepositModal ? 'บันทึกยอดเงินมัดจำ' : 'บันทึกชำระเงินส่วนที่เหลือ'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {order.orderId ? `${order.orderId} · ` : ''}
                    {order.customerName || 'ลูกค้าทั่วไป'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Overview Amount Cards */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">ยอดขายรวม</span>
                  <span className="text-sm sm:text-base font-black text-slate-800">
                    ฿{modalTotalPrice.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase block">ยอดมัดจำเดิม</span>
                  <span className="text-sm sm:text-base font-black text-amber-600">
                    ฿{modalCurrentDeposit.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-600 uppercase block">ยอดคงเหลือ</span>
                  <span className="text-sm sm:text-base font-black text-rose-600">
                    ฿{Math.max(0, modalTotalPrice - modalCurrentDeposit).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  {isDepositModal
                    ? 'ยอดเงินมัดจำที่ลูกค้าชำระจริง (บาท)'
                    : 'ยอดเงินส่วนที่เหลือที่ลูกค้าชำระจริง (บาท)'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  placeholder="กรอกจำนวนเงินที่รับชำระจริง"
                  autoFocus
                  className="w-full px-4 py-3 bg-white border border-slate-300 focus:border-[#6C5DD3] focus:ring-2 focus:ring-[#6C5DD3]/10 rounded-xl text-base font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">เติมยอดด่วน:</span>
                  {isRemainingModal && (
                    <button
                      type="button"
                      onClick={() =>
                        setActualAmount(String(Math.max(0, modalTotalPrice - modalCurrentDeposit)))
                      }
                      className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-[#6C5DD3] text-[11px] font-bold border border-purple-200 cursor-pointer"
                    >
                      พอดีส่วนที่เหลือ (฿{(modalTotalPrice - modalCurrentDeposit).toLocaleString()})
                    </button>
                  )}
                  {isDepositModal && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActualAmount(String(Math.round(modalTotalPrice * 0.5)))}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        50% (฿{Math.round(modalTotalPrice * 0.5).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActualAmount(String(modalTotalPrice))}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        เต็มจำนวน (฿{modalTotalPrice.toLocaleString()})
                      </button>
                      {modalCurrentDeposit > 0 && (
                        <button
                          type="button"
                          onClick={() => setActualAmount(String(modalCurrentDeposit))}
                          className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-semibold border border-amber-200 cursor-pointer"
                        >
                          ยอดเดิม (฿{modalCurrentDeposit.toLocaleString()})
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ช่องทางการชำระเงิน
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('เงินโอน')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'เงินโอน'
                        ? 'bg-[#6C5DD3] text-white border-[#6C5DD3] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>เงินโอน (Transfer)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('เงินสด')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'เงินสด'
                        ? 'bg-[#6C5DD3] text-white border-[#6C5DD3] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>เงินสด (Cash)</span>
                  </button>
                </div>
              </div>

              {/* Payment Verification & Formula Section */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  การตรวจสอบยอดเงิน (มัดจำ + ส่วนที่เหลือ)
                </span>

                <div className="space-y-1 text-xs">
                  {isRemainingModal ? (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>ยอดมัดจำเดิม + ชำระส่วนที่เหลือ:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {modalCurrentDeposit.toLocaleString()} + {inputAmountNum.toLocaleString()} = {(modalCurrentDeposit + inputAmountNum).toLocaleString()} บ.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>ยอดมัดจำจริง + ยอดส่วนที่เหลือ:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {inputAmountNum.toLocaleString()} + {Math.max(0, modalTotalPrice - inputAmountNum).toLocaleString()} = {modalTotalPrice.toLocaleString()} บ.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60 font-semibold">
                    <span>ยอดขายรวมที่ต้องได้รับ:</span>
                    <span className="font-mono font-black text-slate-900">
                      {modalTotalPrice.toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Validation Alert Badge */}
              {validationMessage}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!canProceed || isUpdating}
                onClick={handleConfirmPaymentModal}
                className="py-2.5 px-5 rounded-xl bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white text-xs font-bold transition-all shadow-sm shadow-[#6C5DD3]/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <span>ยืนยันและดำเนินการต่อ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
