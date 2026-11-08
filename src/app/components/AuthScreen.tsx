'use client';

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Package,
  Sparkles,
} from 'lucide-react';
import { getBrowserSupabaseClient } from '@/lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const supabase = getBrowserSupabaseClient();

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
          }
          if (error.message.includes('Email not confirmed')) {
            throw new Error('อีเมลนี้ยังไม่ได้รับการยืนยัน');
          }
          throw error;
        }

        setSuccessMsg('เข้าสู่ระบบสำเร็จ');
        setTimeout(() => {
          onLoginSuccess();
        }, 350);
      } else if (mode === 'signup') {
        if (!businessName.trim()) {
          throw new Error('กรุณาระบุชื่อร้านค้าของคุณ');
        }
        if (password.length < 6) {
          throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
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
            throw new Error('อีเมลนี้มีในระบบแล้ว กรุณาเข้าสู่ระบบ');
          }
          throw error;
        }

        if (data.session) {
          setSuccessMsg('สมัครสมาชิกสำเร็จ ยินดีต้อนรับ!');
          setTimeout(() => {
            onLoginSuccess();
          }, 500);
        } else {
          setSuccessMsg('สมัครเรียบร้อยแล้ว เข้าสู่ระบบได้ทันที');
          setMode('signin');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setSuccessMsg('ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการดำเนินการ');
    } finally {
      setLoading(false);
    }
  };

  const fillPalletAccount = () => {
    setEmail('palletidea@sme.com');
    setPassword('pallet123456');
    setMode('signin');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#0E0B22] flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Subtle soft ambient glow framing the large logo */}
      <div className="absolute w-[450px] h-[450px] bg-[#6C5DD3]/20 rounded-full blur-3xl pointer-events-none -top-16" />

      <div className="w-full max-w-[390px] sm:max-w-[410px] relative z-10 space-y-6 sm:space-y-7">
        {/* Brand Header - Enlarged & Prominent */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] sm:rounded-[32px] bg-gradient-to-tr from-[#6C5DD3] via-[#7F6BFF] to-[#A492FF] shadow-2xl shadow-[#6C5DD3]/40 ring-4 ring-white/10 text-white mb-4">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm leading-tight">
            SME Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5">
            ระบบจัดการร้านค้าและค่าใช้จ่าย
          </p>
        </div>

        {/* Minimal Clean Card - Expanded Height & Prominent Controls */}
        <div className="bg-white rounded-[32px] p-7 sm:p-9 shadow-2xl border border-white/20 space-y-6">
          {/* Segmented Switcher (Tabs) */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl text-sm font-bold text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'hover:text-slate-900'
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
                className={`py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'hover:text-slate-900'
                }`}
              >
                เปิดร้านใหม่
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="text-center pb-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">รีเซ็ตรหัสผ่าน</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">ระบุอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่</p>
            </div>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-medium text-rose-600 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-medium text-emerald-700 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700 block">ชื่อร้านค้า / ธุรกิจ</label>
                <div className="relative">
                  <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น ร้านเฟอร์นิเจอร์ดีไซน์"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6C5DD3] focus:ring-4 focus:ring-[#6C5DD3]/10 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 block">อีเมลเข้าใช้งาน</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6C5DD3] focus:ring-4 focus:ring-[#6C5DD3]/10 focus:outline-none transition-all"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 block">รหัสผ่าน</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs sm:text-sm font-bold text-[#6C5DD3] hover:underline cursor-pointer"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 sm:py-4 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#6C5DD3] focus:ring-4 focus:ring-[#6C5DD3]/10 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 sm:py-4 bg-[#6C5DD3] hover:bg-[#5b4eb8] active:scale-[0.99] text-white rounded-2xl text-sm sm:text-base font-black transition-all shadow-lg shadow-[#6C5DD3]/25 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'เข้าสู่ระบบ'}
                    {mode === 'signup' && 'สมัครเปิดร้านค้า'}
                    {mode === 'forgot' && 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
                  </span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Login for Pallet Idea Furniture */}
          {mode === 'signin' && (
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={fillPalletAccount}
                className="w-full py-3 sm:py-3.5 px-4 bg-purple-50/80 hover:bg-purple-100/90 text-[#6C5DD3] rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border border-purple-200/50 cursor-pointer active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                <span>เข้าสู่ระบบร้านพาเลทไอเดีย (ข้อมูลเดิม)</span>
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ← กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
