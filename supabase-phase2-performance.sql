-- ==============================================================================
-- 🚀 SUPABASE PHASE 2 MIGRATION: PERFORMANCE & DATABASE OPTIMIZATION
-- คัดลอกคำสั่งทั้งหมดนี้ไปวางและรันใน Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. สร้าง Composite B-Tree Indexes สำหรับตาราง Orders
-- ช่วยให้การค้นหา เรียงลำดับ และกรองข้อมูลตาม user_id มีความเร็วสูงสุดแบบ O(log N)
CREATE INDEX IF NOT EXISTS idx_orders_user_created_desc 
ON public.orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_date_desc 
ON public.orders(user_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_payment_status 
ON public.orders(user_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_user_prod_status 
ON public.orders(user_id, prod_status);

CREATE INDEX IF NOT EXISTS idx_orders_user_delivery_status 
ON public.orders(user_id, delivery_status);

-- 2. สร้าง Composite B-Tree Indexes สำหรับตาราง Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_user_created_desc 
ON public.expenses(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_month_desc 
ON public.expenses(user_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_category 
ON public.expenses(user_id, category);

CREATE INDEX IF NOT EXISTS idx_expenses_user_bill_date 
ON public.expenses(user_id, bill_date DESC);

-- 3. ตรวจสอบตาราง Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON public.profiles(id);

-- 4. ตั้งค่า Storage Bucket สำหรับใบเสร็จ (expenses-bills)
-- ตรวจสอบและสร้าง Bucket ถ้ายังไม่มี
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expenses-bills',
  'expenses-bills',
  true,
  10485760, -- 10MB Limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760;

-- 5. กำหนด Row Level Security สำหรับ Storage Bucket expenses-bills
-- ให้ผู้ใช้เข้าถึงเฉพาะโฟลเดอร์ของตนเอง (user_id/...)
DROP POLICY IF EXISTS "Users can upload their own bills" ON storage.objects;
CREATE POLICY "Users can upload their own bills" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'expenses-bills' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can read their own bills" ON storage.objects;
CREATE POLICY "Users can read their own bills" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'expenses-bills' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Public can view bills if bucket is public" ON storage.objects;
CREATE POLICY "Public can view bills if bucket is public" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'expenses-bills');

-- 6. รัน ANALYZE เพื่อให้ PostgreSQL Optimizer อัปเดตสถิติความเร็วในการคิวรี่
ANALYZE public.orders;
ANALYZE public.expenses;
ANALYZE public.profiles;

-- เสร็จสิ้นการเพิ่มประสิทธิภาพฐานข้อมูล ระยะที่ 2

