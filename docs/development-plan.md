# Development Plan

## Project Structure

```
agnos-patient-form/
  server.ts                        # Custom Node server: HTTP + Next.js request handler + Socket.io
  app/
    layout.tsx                     # Root layout (fonts, metadata)
    globals.css                    # Tailwind import + base theme tokens
    page.tsx                       # Landing page: pick a role (patient / staff)
    patient/page.tsx               # Auto-create-or-resume a patient session, redirects to /patient/[sessionId]
    patient/[sessionId]/page.tsx   # Server component: awaits `sessionId` param, renders PatientForm
    staff/page.tsx                 # Staff Dashboard: live list of all active/recent sessions
    staff/[sessionId]/page.tsx     # Server component: awaits `sessionId` param, renders StaffPanel
  components/
    patient/
      PatientForm.tsx              # The patient intake form (client component)
      FormField.tsx                # Generic labeled-field wrapper (label + error message)
    staff/
      StaffPanel.tsx                # Read-only live view of a single session's data (client component)
      StatusBadge.tsx                # Presence/status pill (waiting/filling/inactive/submitted)
  lib/
    types.ts                       # Shared types: PatientData, SessionState, SessionSummary, socket event names/payloads
    schema.ts                      # zod schema + defaults for the patient form
    socket-client.ts               # Client-side Socket.io singleton
    session-storage.ts             # localStorage key for "my in-progress patient session"
  server/
    session-store.ts               # In-memory session store (Map<sessionId, SessionState>) + listSessions()
  docs/
    development-plan.md            # This file
  render.yaml                      # Render deploy config
```

## Design

- **Mobile-first, single-column forms.** All inputs stack vertically on
  narrow viewports; from the `sm:` breakpoint up, the Patient Form switches
  to a 2-column grid (`grid-cols-1 sm:grid-cols-2`), with the address
  textarea spanning both columns.
- **Staff View as a definition list.** Chosen over a table because it reads
  better at both mobile and desktop widths without horizontal scrolling —
  each row is `label` + `value`, stacked on mobile and side-by-side from
  `sm:` up.
- **Status as color, not just text.** The presence badge uses color (amber
  = filling, slate = inactive, emerald = submitted) plus a pulsing dot on
  "filling" so a staff member scanning multiple sessions can tell state at a
  glance rather than reading text every time.
- **Minimal, single accent color** (blue) for primary actions, neutral
  slate palette for everything else, so the form doesn't compete visually
  with the data staff need to read.

## Component Architecture

- **`app/page.tsx` (Landing)** — server component, just two role buttons
  ("ฉันเป็นผู้ป่วย" → `/patient`, "ฉันเป็นเจ้าหน้าที่" → `/staff`). It no
  longer generates or displays any session ID — see "Why the landing page
  changed" below.
- **`app/patient/page.tsx`** — client component with no UI beyond a loading
  message. On mount it checks `localStorage["agnos:lastPatientSession"]`
  (key defined in `lib/session-storage.ts`): if present, it resumes that
  session; otherwise it generates a new UUID v4 and stores it. Either way it
  `router.replace()`s to `/patient/<sessionId>`. This is the *only* place a
  session ID is minted for the patient side.
- **`app/patient/[sessionId]/page.tsx`** — server component. Its only job is
  to `await params` (Next.js 15+ route params are async) and hand
  `sessionId` down to `PatientForm`. Keeping the route file a server
  component avoids awaiting a promise on the client.
- **`components/patient/PatientForm.tsx`** — client component, the core of
  the patient side. Uses `react-hook-form` with a `zodResolver` for
  validation. On mount it emits `session:join` with `role: "patient"`,
  persists `sessionId` to `localStorage` (covers direct deep-links, not just
  the `/patient` redirect flow), and listens for `patient:sync` — the
  server's one-time reply with whatever is already stored for this session.
  The form stays on a `"กำลังเตรียมฟอร์ม..."` loading state until that first
  sync arrives (or a 3s fallback fires), then either `reset()`s the form
  with the resumed data or leaves it blank for a new session. Gating on that
  first sync (rather than reacting to a late sync mid-typing) avoids a race
  where a delayed sync could clobber fields the patient has already started
  typing. After that, it `watch()`es all fields and, on any change,
  debounces (300ms) an emit of `patient:update`; a parallel 10s inactivity
  timer emits `status: "inactive"` if nothing else changes first. On submit,
  it emits `patient:submit` and swaps to a "thank you" screen with a "เริ่ม
  ฟอร์มผู้ป่วยรายใหม่" button (clears the localStorage key and routes back to
  `/patient` for the next patient on a shared kiosk).
- **`components/patient/FormField.tsx`** — presentational wrapper: label +
  required marker + error text, so every field in `PatientForm` is a
  one-line `<FormField>` around a plain input/select/textarea, rather than
  repeating label/error markup per field.
- **`app/staff/page.tsx` (Staff Dashboard)** — client component. On mount it
  emits `lobby:join` and subscribes to `lobby:sync`, which the server sends
  once immediately and again on every patient join/update/submit anywhere.
  Renders one row per session (`displayName`, relative "last updated" time,
  `StatusBadge`), each linking to `/staff/<sessionId>` for the full detail
  view. This is the page that replaced manual session-ID hand-off — staff
  never type or paste an ID.
- **`components/staff/StaffPanel.tsx`** (used by `/staff/[sessionId]`) —
  client component, unchanged in its sync logic from v1. On mount it emits
  `session:join` with `role: "staff"` and subscribes to `staff:sync`, which
  the server sends once immediately (current state) and again on every
  subsequent patient update for that one session. Derives a `"waiting"`
  pseudo-status client-side when no field has been filled yet. Has a
  "← กลับไปรายชื่อผู้ป่วย" link back to the dashboard.
- **`components/staff/StatusBadge.tsx`** — pure presentational component
  mapping a `DisplayStatus` (`lib/types.ts`) to a label + color/pulse; reused
  by both the dashboard rows and the single-session detail view.
- **`server.ts`** — the only non-Next entry point. Wraps Next's request
  handler in a plain `http.Server`, attaches `socket.io` to it, and wires up
  the server-side event handlers (join / lobby-join / update / submit)
  against `server/session-store.ts`. A patient's `session:join` both
  registers the session (so it shows up on the dashboard immediately, even
  before the first keystroke) and re-broadcasts the lobby list.
- **`server/session-store.ts`** — a plain `Map` keyed by `sessionId`. No
  database: the assignment doesn't call for persistence across server
  restarts, and an in-memory store keeps the real-time path simple (no
  round-trip to a DB on every keystroke). `listSessions()` derives each
  row's `displayName` (from `firstName`/`lastName`, or a placeholder) and a
  display status (`"waiting"` when no field has data yet, else the raw
  status), sorted filling → inactive → waiting → submitted, most-recent
  first within each group.

### Why the landing page changed

v1's landing page generated a random session ID on every visit and expected
the ID to be manually carried from a "Patient Form" link to a "Staff View"
link. In practice: fill the patient form, navigate back to `/`, and the
landing page had already minted a *different* ID — clicking "Staff View"
from there opened an empty, unrelated session. The fix isn't an account
system (there's no natural mapping from "who's logged in" to "which
patient's session" anyway); it's removing the manual ID hand-off entirely.
Patients always land on their own session via `/patient` (auto-create/resume
by device, through `localStorage`); staff always land on a dashboard of
everyone currently filling a form, via `/staff` (no ID needed at all).

## Real-Time Synchronization Flow

Two Socket.io **rooms** are in play: one room per `sessionId` (patient ↔ its
own staff detail view), and one shared `"lobby"` room (every open Staff
Dashboard). A given socket can be in both at once.

1. A patient opens `/patient` → redirected to `/patient/<sessionId>`
   (new or resumed, see above). `PatientForm` connects and emits
   `session:join` with `{ sessionId, role: "patient" }`.
2. The server joins that socket to the `sessionId` room, calls
   `ensureSession(sessionId)` (creates an empty entry if this is a brand-new
   id), replies to just that socket with `patient:sync` (the session's
   current stored data — empty for a new session, previously-typed data for
   a resumed one), and broadcasts the refreshed session list to the
   `"lobby"` room. This last step is what makes a brand-new patient session
   appear on any open dashboard immediately, before the patient has typed
   anything.
3. A staff member opens `/staff` (the dashboard). It emits `lobby:join`; the
   server joins that socket to the `"lobby"` room and replies with
   `lobby:sync` (the full current list, computed by `listSessions()`).
   Clicking a row navigates to `/staff/<sessionId>`, where `StaffPanel`
   emits `session:join` with `{ sessionId, role: "staff" }` and gets a
   `staff:sync` reply scoped to that one session (unchanged from v1).
4. As the patient types, `PatientForm` debounces changes (300ms) and emits
   `patient:update` with `{ sessionId, data, status: "filling" }`. The
   server writes this into `session-store`, broadcasts `staff:sync` to the
   `sessionId` room (for anyone on that detail view), and re-broadcasts
   `lobby:sync` to the `"lobby"` room (so every open dashboard's row updates
   — name, status, "last updated" — without anyone needing to know the id).
5. A parallel 10s inactivity timer (reset on every change) emits another
   `patient:update` with `status: "inactive"` if the patient stops typing.
6. On submit, `PatientForm` emits `patient:submit`; the server marks the
   session `status: "submitted"` and re-broadcasts both `staff:sync` (to the
   session room) and `lobby:sync` (to the dashboard).
7. State lives only in server memory for the lifetime of the process — a
   server restart clears in-flight sessions, which is an accepted
   trade-off for this assignment's scope (no persistence requirement).

## Testing Performed

Verified locally with a headless-browser script driving two independent
browser contexts (patient + staff) against the running dev server, covering
both the real-time-sync path and the session-continuity fix:

- Staff Dashboard starts empty; opening `/patient` (no ID typed anywhere)
  makes a new "waiting" row appear on the dashboard within the debounce
  window.
- Typing in the Patient Form updates that row's name + status ("กำลังกรอกข้อมูล")
  live, and clicking the row opens the matching `/staff/<id>` detail view
  with the same data.
- Reloading the bare `/patient` URL in the same browser context resumes the
  same in-progress session (same id, same filled-in fields via `reset()`)
  instead of starting a blank one — this was the bug being fixed.
- Submitting flips the dashboard row and the detail view to "ส่งข้อมูลแล้ว";
  "เริ่มฟอร์มผู้ป่วยรายใหม่" clears the resume key and lands on a genuinely new
  session id, and the dashboard then shows two entries.
- Required-field validation blocks submission and shows inline error text.
- Landing page, Staff Dashboard, and Patient Form all render correctly at a
  mobile viewport (390×844).
- No console/runtime errors in any view during the flow above.
