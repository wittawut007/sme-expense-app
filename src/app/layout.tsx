import type { Metadata, Viewport } from 'next';
import { Kanit } from 'next/font/google';
import './globals.css';

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-kanit',
});

export const metadata: Metadata = {
  title: 'SME Management - ระบบจัดการร้านค้าและค่าใช้จ่าย',
  description: 'ระบบบริหารคำสั่งซื้อ ยอดขาย และต้นทุนค่าใช้จ่ายสำหรับธุรกิจ SME เชื่อมต่อ Supabase Cloud',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SME Management',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0E0B22',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${kanit.variable} overflow-x-hidden`}>
      <body className={`${kanit.className} text-slate-800 antialiased min-h-screen selection:bg-[#6C5DD3]/20 selection:text-[#6C5DD3] overflow-x-hidden overscroll-x-none`}>
        {children}
      </body>
    </html>
  );
}
