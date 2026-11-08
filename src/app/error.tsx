'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to client console or monitoring service
    console.error('Unhandled app error captured by Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0E0B22] flex flex-col items-center justify-center p-5 text-white">
      <div className="w-full max-w-md bg-white rounded-3xl p-7 text-slate-800 shadow-2xl space-y-5 text-center">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-500 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">เกิดข้อผิดพลาดในการแสดงผล</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            ระบบได้บันทึกข้อผิดพลาดไว้เรียบร้อยแล้ว คุณสามารถกดปุ่มลองใหม่อีกครั้งเพื่อโหลดข้อมูลใหม่
          </p>
          {error?.message && (
            <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-mono text-left break-all max-h-24 overflow-y-auto">
              {error.message}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-3 px-4 bg-[#6C5DD3] hover:bg-[#5b4eb8] active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#6C5DD3]/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ลองใหม่อีกครั้ง</span>
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>หน้าหลัก</span>
          </button>
        </div>
      </div>
    </div>
  );
}

