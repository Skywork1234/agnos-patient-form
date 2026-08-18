# Deploy Guide

Reference info:

- Live app: https://agnos-patient-form-50hy.onrender.com
- Repo: https://github.com/Skywork1234/agnos-patient-form
- Render dashboard (this service): https://dashboard.render.com/web/srv-da24a1dg1s2s73djhgtg
- Render service ID: `srv-da24a1dg1s2s73djhgtg`
- Deploy config: [`render.yaml`](./render.yaml) at repo root

Hosting is Render because Socket.io needs a long-lived Node process to hold
WebSocket connections open (see "Why a custom server?" in README.md) —
that rules out plain serverless platforms like default Vercel.

---

## ครั้งแรก (first-time setup)

ทำครั้งเดียวตอนตั้งโปรเจกต์ใหม่ หรือถ้าต้อง deploy ไปยัง account/service ใหม่:

1. **สร้าง GitHub repo และ push โค้ด** (ถ้ายังไม่มี)
   ```bash
   cd ~/projects/agnos-patient-form
   gh repo create <repo-name> --public --source=. --remote=origin
   git push -u origin main
   ```
   หรือสร้าง repo ผ่านเว็บ github.com แล้ว `git remote add origin <url>` +
   `git push -u origin main` เอง

2. **สมัคร/login Render** ที่ https://dashboard.render.com (สมัครฟรีผ่าน
   GitHub account เดียวกันได้เลย)

3. **สร้าง Web Service แล้วเชื่อม GitHub ให้ถูกต้องตั้งแต่แรก** — สำคัญ:
   ต้องทำผ่านปุ่ม **"Connect GitHub"** ใน Render dashboard (ไม่ใช่แค่ใส่
   URL ของ repo เฉยๆ) ไม่งั้นจะไม่มี webhook และ push ครั้งต่อไปจะไม่
   auto-deploy ให้ (ปัญหาที่เจอตอนตั้ง service แรกสุดของโปรเจกต์นี้)

   - Dashboard → **New +** → **Web Service**
   - เลือก **Connect GitHub** แล้ว authorize/เลือก repo นี้
   - Render จะอ่านค่าจาก `render.yaml` ให้อัตโนมัติ (build command,
     start command, plan, region) — กด **Create Web Service** ได้เลย
     ไม่ต้องกรอกอะไรเพิ่ม
   - **อย่า**เพิ่ม env var `NODE_ENV=production` เองใน service settings —
     สคริปต์ `npm run start` ตั้งค่านี้ให้เองอยู่แล้วตอน runtime ถ้าไป
     ตั้งซ้ำที่ระดับ service มันจะไปมีผลตอน `npm install` ด้วย ทำให้ npm
     ข้าม devDependencies (เช่น `@tailwindcss/postcss`) แล้ว build fail
     (เจอปัญหานี้มาแล้วตอน deploy ครั้งแรก)

4. รอ build เสร็จ (~1-2 นาที) แล้วเปิด URL ที่ Render ให้มาเพื่อเช็คว่า
   ใช้งานได้จริง

> **หมายเหตุ:** service ปัจจุบัน (`srv-da24a1dg1s2s73djhgtg`) ถูกสร้างผ่าน
> Render API ตอนแรก ไม่ได้เชื่อม GitHub App เลยไม่มี auto-deploy — ดูหัวข้อ
> "ถ้าอยากให้ auto-deploy จริง" ด้านล่างถ้าต้องการแก้ตรงนี้

---

## ครั้งต่อไป (every time you want to ship a change)

ถ้า service เชื่อม GitHub ถูกต้องแล้ว (ทำตามข้อ 3 ด้านบน): **แค่ push ก็พอ**

```bash
git add -A
git commit -m "..."
git push
```

Render จะ auto-deploy ให้เองภายในไม่กี่วินาทีหลัง push (ดูสถานะได้ที่
dashboard ลิงก์ด้านบน)

### ถ้า service ยังไม่ได้เชื่อม GitHub (เหมือน service ปัจจุบันตอนนี้)

push อย่างเดียวจะ**ไม่** deploy ให้อัตโนมัติ ต้อง trigger เองทุกครั้ง
เลือกวิธีใดวิธีหนึ่ง:

**วิธีที่ 1 — ผ่าน dashboard (ไม่ต้องใช้ API key):**
1. push โค้ดตามปกติ (`git push`)
2. เข้า https://dashboard.render.com/web/srv-da24a1dg1s2s73djhgtg
3. กดปุ่ม **Manual Deploy** (มุมขวาบน) → **Deploy latest commit**
4. รอสถานะเปลี่ยนเป็น **Live**

**วิธีที่ 2 — ผ่าน API (ถ้ามี Render API key อยู่แล้ว):**
```bash
git push

curl -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://api.render.com/v1/services/srv-da24a1dg1s2s73djhgtg/deploys
```
(สร้าง/หา API key ได้ที่ https://dashboard.render.com/u/settings#api-keys —
**ห้าม commit key นี้ลง repo**, เก็บไว้ใน password manager หรือตั้งเป็น
env var ในเครื่องตัวเอง เช่น `export RENDER_API_KEY=...` ใน `~/.zshrc`)

ตรวจสอบสถานะ deploy ล่าสุด:
```bash
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-da24a1dg1s2s73djhgtg/deploys?limit=1"
```
สถานะที่ควรรอจนเจอ: `"status":"live"` (ถ้าเจอ `build_failed` ให้ดู log
จาก dashboard → **Logs** tab)

---

## แนะนำ: เปลี่ยนเป็น auto-deploy จริง (ทำครั้งเดียว)

ถ้าอยากให้ทุกครั้งที่ `git push` แล้ว deploy ให้เองโดยไม่ต้องสั่งเพิ่ม:

1. เข้า https://dashboard.render.com/web/srv-da24a1dg1s2s73djhgtg → **Settings**
2. หาส่วน **Build & Deploy** → เชื่อม/ยืนยัน GitHub repo ผ่านปุ่ม
   **Connect account** (ต้อง authorize ผ่านบัญชี GitHub ของคุณเอง)
3. เมื่อเชื่อมสำเร็จ **Auto-Deploy** จะเปลี่ยนเป็นทำงานจริง (ก่อนหน้านี้
   `render.yaml` ตั้ง `autoDeploy: yes` ไว้แล้ว แต่ใช้ไม่ได้เพราะไม่มี
   webhook จนกว่าจะเชื่อม GitHub ให้ถูกวิธีตามข้อ 2)

หลังจากนั้นหัวข้อ "ครั้งต่อไป" ด้านบนจะเหลือแค่ `git push` บรรทัดเดียว
