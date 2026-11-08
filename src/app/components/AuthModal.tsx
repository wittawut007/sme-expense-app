'use client';

import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { getBrowserSupabaseClient } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const supabase = getBrowserSupabaseClient();

      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง');
          }
          throw error;
        }

        setSuccessMsg('เข้าสู่ระบบสำเร็จ กำลังโหลดข้อมูลร้านของคุณ...');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      } else if (mode === 'signup') {
        if (!businessName.trim()) {
          throw new Error('กรุณาระบุชื่อร้านหรือชื่อธุรกิจของคุณ');
        }
        if (password.length < 6) {
          throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              business_name: businessName.trim(),
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('อีเมลนี้ถูกลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบ');
          }
          throw error;
        }

        if (data.session) {
          setSuccessMsg('สมัครสมาชิกสำเร็จ ยินดีต้อนรับเข้าสู่ระบบ!');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 900);
        } else {
          setSuccessMsg(
            'สมัครสมาชิกเรียบร้อยแล้ว! กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันการเปิดใช้งานบัญชี'
          );
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setSuccessMsg('ระบบได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการดำเนินการ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative">
        {/* Header decoration */}
        <div className="bg-gradient-to-br from-[#0E0B22] via-[#1B153D] to-[#281D52] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#6C5DD3] to-[#8E78FB] flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
              SME Cloud Account
            </span>
          </div>

          <h2 className="text-xl font-bold">
            {mode === 'signin' && 'เข้าสู่ระบบร้านค้า'}
            {mode === 'signup' && 'สมัครเปิดบัญชีร้านใหม่'}
            {mode === 'forgot' && 'รีเซ็ตรหัสผ่าน'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {mode === 'signin' && 'เข้าถึงข้อมูลคำสั่งซื้อ ยอดขาย และบิลค่าใช้จ่ายของคุณ'}
            {mode === 'signup' && 'เริ่มต้นจัดการธุรกิจ SME อย่างมืออาชีพ ข้อมูลแยกส่วนตัวปลอดภัย'}
            {mode === 'forgot' && 'ระบุอีเมลที่ใช้ลงทะเบียนเพื่อรับลิงก์ตั้งรหัสผ่านใหม่'}
          </p>

          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="mt-5 grid grid-cols-2 p-1 bg-white/10 rounded-2xl text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-xl transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-[#171928] shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-[#171928] shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                ชื่อร้านค้า / ธุรกิจ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="เช่น โรงไม้พาเลท สยามการช่าง"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
              อีเมล <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="your-shop@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-slate-600">
                  รหัสผ่าน <span className="text-rose-500">*</span>
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-semibold text-[#6C5DD3] hover:underline"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5DD3] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#6C5DD3] hover:bg-[#5b4eb8] active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#6C5DD3]/20 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'เข้าสู่ระบบ'}
                  {mode === 'signup' && 'สมัครเปิดบัญชี'}
                  {mode === 'forgot' && 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ← กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          )}

          <div className="pt-2 text-center text-[11px] text-slate-400 leading-relaxed">
            ข้อมูลของคุณได้รับการปกป้องด้วย Row Level Security (RLS) และมาตรฐานการเข้ารหัสของ Supabase
          </div>
        </form>
      </div>
    </div>
  );
}

