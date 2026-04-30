# ริน ห้องเช่า — ระบบชำระค่าเช่า

## วิธี Deploy ขึ้น Vercel

### ขั้นที่ 1: ตั้งค่า Supabase
1. เปิด Supabase → เลือก Project → ไปที่ **SQL Editor**
2. วาง SQL จากไฟล์ `supabase_setup.sql` แล้วกด Run

### ขั้นที่ 2: Upload โค้ดขึ้น GitHub
1. สมัคร / เข้า github.com
2. กด **New repository** → ตั้งชื่อ `rin-payment` → Create
3. Upload ไฟล์ทั้งหมด (ยกเว้น `node_modules` และ `.env`)

### ขั้นที่ 3: Deploy บน Vercel
1. เข้า vercel.com → **Add New Project**
2. เลือก GitHub repo `rin-payment`
3. ไปที่ **Environment Variables** ใส่:
   - `REACT_APP_SUPABASE_URL` = URL ของ Supabase
   - `REACT_APP_SUPABASE_ANON_KEY` = anon key
4. กด **Deploy** รอสักครู่ได้ link เลย!

## วิธีใช้งาน

**ผู้เช่า:** เปิด link → เลือกโซน → ใส่เลขห้อง → เห็น QR จ่ายได้เลย

**Admin:** แตะชื่อ "🏠 ริน ห้องเช่า" 5 ครั้ง → ใส่รหัส `345027` → กรอกยอดห้อง
