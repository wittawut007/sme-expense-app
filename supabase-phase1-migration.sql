-- ==============================================================================
-- PHASE 1 MIGRATION: AUTHENTICATION, MULTI-TENANCY & ROW LEVEL SECURITY (RLS)
-- คัดลอกและรันใน Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. สร้างตารางข้อมูลผู้ใช้งาน / ร้านค้า (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    business_name TEXT DEFAULT 'ธุรกิจของฉัน',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    tax_id TEXT DEFAULT '',
    tagline TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    role TEXT DEFAULT 'owner',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- เพิ่มคอลัมน์ใน profiles เผื่อตารางถูกสร้างไว้ก่อนหน้านี้
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';

-- 2. Trigger สร้าง Profile อัตโนมัติเมื่อผู้ใช้สมัครสมาชิกผ่าน Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'ร้านค้าของฉัน')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. เพิ่มคอลัมน์ user_id ในตาราง orders และ expenses
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- สร้าง Index เพื่อความเร็วในการค้นหาข้อมูลตาม user_id
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);

-- 4. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 5. ลบนโยบายเดิมที่เป็น Public / Anon เข้าถึงได้ทั้งหมดออก
DROP POLICY IF EXISTS "Allow public read access on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert access on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update access on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public delete access on orders" ON public.orders;

DROP POLICY IF EXISTS "Allow public read access on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public insert access on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public update access on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public delete access on expenses" ON public.expenses;

-- 6. กำหนดนโยบาย RLS ที่ปลอดภัย (ผู้ใช้เห็นและแก้ไขได้เฉพาะข้อมูลของตัวเอง)
-- 6.1 ตาราง profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 6.2 ตาราง orders
DROP POLICY IF EXISTS "Users can select own orders" ON public.orders;
CREATE POLICY "Users can select own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders" 
ON public.orders FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own orders" ON public.orders;
CREATE POLICY "Users can delete own orders" 
ON public.orders FOR DELETE 
USING (auth.uid() = user_id);

-- 6.3 ตาราง expenses
DROP POLICY IF EXISTS "Users can select own expenses" ON public.expenses;
CREATE POLICY "Users can select own expenses" 
ON public.expenses FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
CREATE POLICY "Users can insert own expenses" 
ON public.expenses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses" 
ON public.expenses FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
CREATE POLICY "Users can delete own expenses" 
ON public.expenses FOR DELETE 
USING (auth.uid() = user_id);

-- 7. จัดการ Storage Bucket "receipts" สำหรับรูปบิล/สลิป
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- ลบนโยบายเดิมของ storage
DROP POLICY IF EXISTS "Allow public read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "User can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "User can select own receipts" ON storage.objects;
DROP POLICY IF EXISTS "User can delete own receipts" ON storage.objects;

-- ให้ผู้ใช้สามารถอัปโหลดไฟล์ลงในโฟลเดอร์รหัส user_id ของตนเอง
CREATE POLICY "User can upload own receipts" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ให้ผู้ใช้สามารถอ่านไฟล์ในโฟลเดอร์ของตนเอง (หรืออนุญาตผ่าน public URL ที่มี path ตรงกับ user)
CREATE POLICY "User can select own receipts" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'receipts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.role() = 'authenticated'
  )
);

CREATE POLICY "User can delete own receipts" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

