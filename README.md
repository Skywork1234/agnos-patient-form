# Agnos Patient Intake — Patient Form + Staff View

Real-time patient intake form with a live staff monitoring view, built for the
Agnos front-end developer candidate assignment.

**Live app:** https://agnos-patient-form-50hy.onrender.com
**Repo:** https://github.com/Skywork1234/agnos-patient-form

> Hosted on Render's free tier, which sleeps after ~15 minutes of
> inactivity — the first request after a sleep can take 30-60s to wake up.

- **Patient Form** — responsive form for patients to enter their details.
- **Staff View** — real-time, read-only view of the same session, updating as
  the patient types.

Both views connect to the same server-side session (keyed by `sessionId`) over
a WebSocket, so anything a patient types shows up on the staff view instantly.

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

Open [http://localhost:3000](http://localhost:3000). It generates a new
session and gives you two links:

- **Patient Form** (`/patient/[sessionId]`)
- **Staff View** (`/staff/[sessionId]`)

Open both (e.g. one normal window + one incognito window, or two browsers) and
start typing in the Patient Form — the Staff View updates live.

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

- **Join existing session** on the landing page — paste a `sessionId` to open
  its Patient Form / Staff View, so a staff member can re-open a session
  without needing a shared link stored elsewhere.
- **Inactivity detection** (not just filling/submitted) — the Staff View can
  tell the difference between "patient is actively typing" and "patient
  opened the form but stepped away."

## Deployment

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
