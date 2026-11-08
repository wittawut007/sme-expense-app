-- ==============================================================================
-- 🚀 SUPABASE SCRIPT: ASSIGN EXISTING DATA TO "ร้านพาเลทไอเดียเฟอร์นิเจอร์"
-- คัดลอกคำสั่งทั้งหมดนี้ไปวางและรันใน Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. สร้างส่วนขยาย pgcrypto สำหรับการเข้ารหัสรหัสผ่าน (ถ้ายังไม่มี)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. สร้าง/อัปเดตบัญชีผู้ใช้สำหรับ "ร้านพาเลทไอเดียเฟอร์นิเจอร์"
-- อีเมล: palletidea@sme.com
-- รหัสผ่าน: pallet123456
DO $$
DECLARE
  pallet_user_id UUID;
BEGIN
  -- ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่
  SELECT id INTO pallet_user_id FROM auth.users WHERE email = 'palletidea@sme.com';

  IF pallet_user_id IS NULL THEN
    pallet_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      pallet_user_id,
      'authenticated',
      'authenticated',
      'palletidea@sme.com',
      crypt('pallet123456', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"business_name":"ร้านพาเลทไอเดียเฟอร์นิเจอร์"}'::jsonb,
      NOW(),
      NOW()
    );
  ELSE
    -- อัปเดตรหัสผ่านและยืนยันอีเมลให้พร้อมใช้งานทันที
    UPDATE auth.users
    SET 
      encrypted_password = crypt('pallet123456', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = '{"business_name":"ร้านพาเลทไอเดียเฟอร์นิเจอร์"}'::jsonb,
      updated_at = NOW()
    WHERE id = pallet_user_id;
  END IF;

  -- 3. เพิ่มคอลัมน์และอัปเดตข้อมูล Profile สำหรับร้านพาเลทไอเดียเฟอร์นิเจอร์
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id TEXT DEFAULT '';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';

  INSERT INTO public.profiles (id, email, business_name, role)
  VALUES (pallet_user_id, 'palletidea@sme.com', 'ร้านพาเลทไอเดียเฟอร์นิเจอร์', 'owner')
  ON CONFLICT (id) DO UPDATE
  SET 
    business_name = 'ร้านพาเลทไอเดียเฟอร์นิเจอร์',
    email = 'palletidea@sme.com',
    role = 'owner';

  -- 4. ผูกคำสั่งซื้อเดิมทั้งหมดในระบบ (orders ที่ยังไม่มีเจ้าของ) ให้เป็นของร้านพาเลทไอเดียเฟอร์นิเจอร์
  UPDATE public.orders 
  SET user_id = pallet_user_id 
  WHERE user_id IS NULL;

  -- 5. ผูกค่าใช้จ่ายเดิมทั้งหมดในระบบ (expenses ที่ยังไม่มีเจ้าของ) ให้เป็นของร้านพาเลทไอเดียเฟอร์นิเจอร์
  UPDATE public.expenses 
  SET user_id = pallet_user_id 
  WHERE user_id IS NULL;

  RAISE NOTICE 'SUCCESS: Assigned all existing data to ร้านพาเลทไอเดียเฟอร์นิเจอร์ (User ID: %)', pallet_user_id;
END $$;

-- 6. Trigger สำหรับร้านค้าใหม่ที่มาสมัครสมาชิก: ยืนยันอีเมลให้อัตโนมัติทันที
-- ทำให้ร้านค้าใหม่สามารถสมัครแล้วเข้าใช้งานได้เลยโดยไม่ต้องรอยืนยันอีเมล
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_confirm_new_user ON auth.users;
CREATE TRIGGER trigger_auto_confirm_new_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();

-- 7. ยืนยันความปลอดภัยของ RLS:
-- เมื่อร้านค้าใหม่สมัครเข้ามา และล็อกอินด้วย user_id ของตัวเอง จะเห็นเฉพาะข้อมูลของตัวเอง (เริ่มต้นข้อมูลจะว่างเปล่า 0 รายการ)
DROP POLICY IF EXISTS "Users can select own orders" ON public.orders;
CREATE POLICY "Users can select own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own expenses" ON public.expenses;
CREATE POLICY "Users can select own expenses" 
ON public.expenses FOR SELECT 
USING (auth.uid() = user_id);

