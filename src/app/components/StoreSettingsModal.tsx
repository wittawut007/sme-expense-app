'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Phone,
  MapPin,
  FileText,
  Camera,
  Trash2,
  Plus,
  RotateCcw,
  Save,
  Truck,
  Tag,
  CheckCircle2,
  Info,
} from 'lucide-react';

export interface StoreSettingsData {
  businessName: string;
  phone: string;
  address: string;
  taxId: string;
  tagline: string;
  logoUrl: string | null;
  categories: string[];
  deliveryMethods: string[];
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  'ไม้พาเลท/วัตถุดิบ',
  'ตะปู/อุปกรณ์ประกอบ',
  'สีและเคมีภัณฑ์',
  'อุปกรณ์/เครื่องมือช่าง',
  'ค่าขนส่ง/น้ำมัน',
  'ค่าแรงช่าง',
  'ซ่อมบำรุง/เครื่องมือ',
  'เบ็ดเตล็ด/อื่นๆ',
];

export const DEFAULT_DELIVERY_METHODS = [
  'รถกระบะร้าน',
  'ขนส่งเอกชน',
  'ลูกค้ารับเอง',
];

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: StoreSettingsData;
  onSave: (newSettings: StoreSettingsData) => Promise<void>;
}

export function StoreSettingsModal({
  isOpen,
  onClose,
  initialSettings,
  onSave,
}: StoreSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'delivery'>('general');
  const [businessName, setBusinessName] = useState(initialSettings.businessName);
  const [phone, setPhone] = useState(initialSettings.phone);
  const [address, setAddress] = useState(initialSettings.address);
  const [taxId, setTaxId] = useState(initialSettings.taxId);
  const [tagline, setTagline] = useState(initialSettings.tagline);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialSettings.logoUrl);
  const [categories, setCategories] = useState<string[]>(initialSettings.categories);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(initialSettings.deliveryMethods);

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newDeliveryInput, setNewDeliveryInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when initialSettings change or modal opens
  useEffect(() => {
    if (isOpen) {
      setBusinessName(initialSettings.businessName || '');
      setPhone(initialSettings.phone || '');
      setAddress(initialSettings.address || '');
      setTaxId(initialSettings.taxId || '');
      setTagline(initialSettings.tagline || '');
      setLogoUrl(initialSettings.logoUrl || null);
      setCategories(
        initialSettings.categories && initialSettings.categories.length > 0
          ? initialSettings.categories
          : DEFAULT_EXPENSE_CATEGORIES
      );
      setDeliveryMethods(
        initialSettings.deliveryMethods && initialSettings.deliveryMethods.length > 0
          ? initialSettings.deliveryMethods
          : DEFAULT_DELIVERY_METHODS
      );
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์ภาพมีขนาดใหญ่เกิน 5MB กรุณาเลือกไฟล์ขนาดเล็กลง');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      alert('หมวดหมู่นี้มีอยู่ในรายการแล้ว');
      return;
    }
    setCategories([...categories, trimmed]);
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (categories.length <= 1) {
      alert('ต้องมีหมวดหมู่เหลืออย่างน้อย 1 รายการ');
      return;
    }
    setCategories(categories.filter((c) => c !== catToRemove));
  };

  const handleResetCategories = () => {
    if (confirm('ต้องการคืนค่าหมวดหมู่เป็นค่าเริ่มต้นทั้งหมดหรือไม่?')) {
      setCategories([...DEFAULT_EXPENSE_CATEGORIES]);
    }
  };

  const handleAddDeliveryMethod = () => {
    const trimmed = newDeliveryInput.trim();
    if (!trimmed) return;
    if (deliveryMethods.includes(trimmed)) {
      alert('วิธีจัดส่งนี้มีอยู่ในรายการแล้ว');
      return;
    }
    setDeliveryMethods([...deliveryMethods, trimmed]);
    setNewDeliveryInput('');
  };

  const handleRemoveDeliveryMethod = (methodToRemove: string) => {
    if (deliveryMethods.length <= 1) {
      alert('ต้องมีวิธีจัดส่งเหลืออย่างน้อย 1 รายการ');
      return;
    }
    setDeliveryMethods(deliveryMethods.filter((m) => m !== methodToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      alert('กรุณากรอกชื่อร้านค้า');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        businessName: businessName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        taxId: taxId.trim(),
        tagline: tagline.trim(),
        logoUrl,
        categories: categories.length > 0 ? categories : DEFAULT_EXPENSE_CATEGORIES,
        deliveryMethods: deliveryMethods.length > 0 ? deliveryMethods : DEFAULT_DELIVERY_METHODS,
      });
      onClose();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0E0B22] via-[#1B153D] to-[#281D52] p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#6C5DD3] to-[#8E78FB] flex items-center justify-center text-white">
              <Building2 className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
              Store Configuration
            </span>
          </div>

          <h2 className="text-xl font-bold">ตั้งค่าข้อมูลร้านค้าของคุณ</h2>
          <p className="text-xs text-slate-300 mt-1">
            ปรับเปลี่ยนชื่อร้าน โลโก้ หมวดหมู่รายจ่าย และข้อมูลติดต่อให้ตรงกับธุรกิจของคุณ
          </p>

          {/* Navigation Tabs */}
          <div className="mt-4 grid grid-cols-3 p-1 bg-white/10 rounded-2xl text-xs font-bold text-center">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`py-2 rounded-xl transition-all ${
                activeTab === 'general'
                  ? 'bg-white text-[#171928] shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              ข้อมูลร้านค้า
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`py-2 rounded-xl transition-all ${
                activeTab === 'categories'
                  ? 'bg-white text-[#171928] shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              หมวดหมู่รายจ่าย
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={`py-2 rounded-xl transition-all ${
                activeTab === 'delivery'
                  ? 'bg-white text-[#171928] shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              วิธีจัดส่ง
            </button>
          </div>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ══════════════════════════════════════════════════ */}
          {/* TAB 1: GENERAL STORE INFO                           */}
          {/* ══════════════════════════════════════════════════ */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Logo Upload Section */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                <div className="relative group w-16 h-16 rounded-2xl bg-[#1A1325] overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 shadow-sm p-1.5">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Store Logo" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <img src="/logo.png" alt="Store Logo" className="w-full h-full object-contain" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 block">รูปภาพร้าน / โลโก้</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    รองรับไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5MB
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>เลือกรูปใหม่</span>
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบรูป</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Store Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อร้านค้า / ธุรกิจ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น ร้านพาเลทไอเดียเฟอร์นิเจอร์ โคราช"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Tagline / Subtitle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  คำอธิบายร้าน / สโลแกน
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="เช่น ผู้ผลิตและจัดจำหน่ายไม้พาเลทครบวงจร"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white"
                  />
                </div>
              </div>

              {/* Phone & Tax ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="089-999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    เลขประจำตัวผู้เสียภาษี (Tax ID)
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="เช่น 0305566003742"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Store Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ที่อยู่ร้านค้า / สถานที่ตั้งโรงงาน
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder="เช่น 141 ม.2 ต.บ้านใหม่ อ.เมืองนครราชสีมา จ.นครราชสีมา 30000"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* TAB 2: EXPENSE CATEGORIES                           */}
          {/* ══════════════════════════════════════════════════ */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">หมวดหมู่ค่าใช้จ่ายในร้าน</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    ใช้ในการแยกประเภทบิล สแกนใบเสร็จ และวิเคราะห์ต้นทุน
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetCategories}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors"
                  title="คืนค่าเป็น 8 หมวดหมู่มาตรฐาน"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>คืนค่าเริ่มต้น</span>
                </button>
              </div>

              {/* Add New Category Box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อหมวดหมู่ใหม่ เช่น ค่าเช่าโรงงาน..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2.5 bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่ม</span>
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                <span>แนะนำ:</span>
                {['ค่าเช่าโรงงาน', 'ค่าไฟ/ค่าน้ำ', 'การตลาด/โฆษณา', 'เครื่องใช้สำนักงาน'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      if (!categories.includes(sug)) {
                        setCategories([...categories, sug]);
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-[#6C5DD3] text-slate-600 transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>

              {/* Categories Badges List */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat, idx) => (
                    <div
                      key={cat}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6C5DD3]" />
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat)}
                        className="w-4 h-4 rounded-full hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-slate-400 transition-colors ml-0.5"
                        title="ลบหมวดหมู่นี้"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  💡 มีทั้งหมด {categories.length} หมวดหมู่ (แตะเครื่องหมาย × เพื่อลบออก)
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* TAB 3: DELIVERY METHODS                             */}
          {/* ══════════════════════════════════════════════════ */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-800 block">วิธีจัดส่งสินค้าของร้าน</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  ตัวเลือกสำหรับระบุในคำสั่งซื้อของลูกค้า
                </span>
              </div>

              {/* Add Delivery Method Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="พิมพ์วิธีจัดส่งใหม่ เช่น มอเตอร์ไซค์ด่วน, รถ 6 ล้อ..."
                  value={newDeliveryInput}
                  onChange={(e) => setNewDeliveryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDeliveryMethod();
                    }
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddDeliveryMethod}
                  className="px-4 py-2.5 bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่ม</span>
                </button>
              </div>

              {/* Delivery Methods List */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {deliveryMethods.map((dm) => (
                    <div
                      key={dm}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 shadow-2xs"
                    >
                      <Truck className="w-3.5 h-3.5 text-[#6C5DD3]" />
                      <span>{dm}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliveryMethod(dm)}
                        className="w-4 h-4 rounded-full hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-slate-400 transition-colors ml-0.5"
                        title="ลบวิธีจัดส่งนี้"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#6C5DD3] hover:bg-[#5b4eb8] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#6C5DD3]/25 flex items-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
            >
              {isSaving ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการตั้งค่า</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

