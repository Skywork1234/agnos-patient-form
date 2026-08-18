# Agnos Patient Intake — Patient Form + Staff View

Real-time patient intake form with a live staff monitoring view, built for the
Agnos front-end developer candidate assignment.

**Live app:** https://agnos-patient-form-50hy.onrender.com
**Repo:** https://github.com/Skywork1234/agnos-patient-form

> Hosted on Render's free tier, which sleeps after ~15 minutes of
> inactivity — the first request after a sleep can take 30-60s to wake up.

- **Patient Form** (`/patient`) — responsive form for patients to enter their
  details. Each device/browser gets its own session automatically — no ID to
  create or remember.
- **Staff Dashboard** (`/staff`) — real-time list of every patient currently
  filling out a form; click any row to see that patient's data update live.

Both sides connect over a WebSocket to the same server-side session store, so
anything a patient types shows up on staff's screen instantly — without staff
ever having to type or paste a session ID.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [TailwindCSS](https://tailwindcss.com)
- [Socket.io](https://socket.io) for real-time sync, on a small custom Node
  server (`server.ts`) wrapping the Next.js request handler
- [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev) for
  form state and validation

## Why a custom server?

Socket.io needs a long-lived HTTP server to upgrade connections to
WebSockets. Next.js's default `next dev` / `next start` process supports this
fine, but fully serverless hosts (e.g. Vercel's default deployment) don't keep
a persistent process around, so WebSocket connections would drop. This project
uses a custom server (`server.ts`) and is deployed to a host that runs a
persistent Node process (Render/Railway), instead of Vercel.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and pick a role:

- **"ฉันเป็นผู้ป่วย" (Patient)** → `/patient` auto-creates a session and takes
  you straight to the form.
- **"ฉันเป็นเจ้าหน้าที่" (Staff)** → `/staff` shows a live dashboard of every
  patient currently filling out a form.

Open the patient link in one window/browser and the staff dashboard in
another (they're two different roles/devices in real use — a patient's own
tablet vs. the front-desk screen) and start typing in the Patient Form — a
row appears on the dashboard immediately and updates live as you type, no ID
copying required.

## Scripts

- `npm run dev` — start the custom dev server (`tsx server.ts`)
- `npm run build` — production build (`next build`)
- `npm run start` — start the custom server in production mode
- `npm run lint` — lint

## Features

- All patient fields from the spec (required + optional), with validation
  (required fields, email/phone format) via zod.
- Responsive layout for both Patient Form and Staff View (mobile card layout,
  wider layout on desktop).
- Real-time sync over Socket.io, debounced (300ms) so we don't flood the
  socket on every keystroke.
- Presence/status indicator on the Staff View:
  - **รอผู้ป่วยเริ่มกรอก** (waiting) — no data yet.
  - **กำลังกรอกข้อมูล** (filling) — patient is actively typing.
  - **ไม่มีการเคลื่อนไหว** (inactive) — no input for 10+ seconds.
  - **ส่งข้อมูลแล้ว** (submitted) — patient submitted the form.

### Bonus features implemented

- **Staff Dashboard** (`/staff`) — a live list of every active/recent patient
  session, not just a single hardcoded one. This is what lets staff reach any
  patient's data without ever handling a session ID, and models a real
  clinic where multiple patients queue up at once.
- **Session resume** — a patient's in-progress session is remembered
  (`localStorage`) per device, so navigating away and back to `/patient`
  resumes the same form instead of losing it or starting a blank duplicate.
  An explicit "เริ่มฟอร์มผู้ป่วยรายใหม่" button on the post-submit screen clears
  this for the next patient on a shared kiosk.
- **Inactivity detection** (not just filling/submitted) — the Staff View can
  tell the difference between "patient is actively typing" and "patient
  opened the form but stepped away."

## Deployment

See [`DEPLOY.md`](DEPLOY.md) for step-by-step first-time setup and
day-to-day deploy instructions (including how to trigger a deploy on the
current service, which isn't yet wired for auto-deploy-on-push).

Deploy target: a host that runs a persistent Node process (this repo includes
`render.yaml` for [Render](https://render.com); Railway works the same way —
build command `npm install && npm run build`, start command `npm run start`).

1. Push this repo to GitHub.
2. On Render: **New +** → **Web Service** → connect the repo. Render will pick
   up `render.yaml` automatically (or set build/start commands manually as
   above).
3. Once deployed, the same `sessionId` URL scheme (`/patient/<id>`,
   `/staff/<id>`) works over the public URL.

## Project Structure

See [`docs/development-plan.md`](docs/development-plan.md) for the full
project structure, design decisions, component architecture, and real-time
sync flow.
