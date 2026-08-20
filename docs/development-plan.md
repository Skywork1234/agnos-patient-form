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
    staff/page.tsx                 # Staff Dashboard: live list of all active/recent sessions, with name search, status filter tabs, and per-row Edit/Delete
    staff/[sessionId]/page.tsx     # Server component: awaits `sessionId` param, renders StaffPanel
  components/
    patient/
      PatientForm.tsx              # The patient intake form (client component)
      FormField.tsx                # Generic labeled-field wrapper (label + error message)
    staff/
      StaffPanel.tsx                # Live view of a single session's data; read-only <dl>, or an edit form when isEditing (client component)
      PatientEditForm.tsx           # Staff-side edit form for an existing session's data (client component)
      StatusBadge.tsx                # Presence/status pill (waiting/filling/inactive/submitted); exports CONFIG (reused by the staff filter tabs)
  lib/
    types.ts                       # Shared types: PatientData, SessionState, SessionSummary, socket event names/payloads (incl. STAFF_UPDATE/STAFF_DELETE)
    schema.ts                      # zod schema + defaults for the patient form
    socket-client.ts               # Client-side Socket.io singleton
    session-storage.ts             # localStorage key for "my in-progress patient session"
  server/
    session-store.ts               # In-memory session store (Map<sessionId, SessionState>): getSession/ensureSession/updateSession/updateSessionData/deleteSession/listSessions()
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
- **Blue-white theme** — a single centralized change (`--background` in
  `globals.css`, `slate-50` → `blue-50`) rather than touching every
  component's colors individually. Every page inherits this via `body`
  with no per-page override, and every card surface is already `bg-white`,
  so one variable produces a consistent pale-blue-canvas/white-card look
  app-wide. Foreground text stays `slate-900` (unchanged) to preserve
  contrast/readability rather than risk legibility for a decorative pass.
  Buttons/links/hover states already used `blue-600`/`blue-300` as the
  app's sole accent before this change, so the new background reads as an
  extension of the existing palette, not a new hue.
- **Edit lives on the detail page, not inline in the list row.** The list's
  "แก้ไข" button navigates to `/staff/[sessionId]?edit=1` (detail page opens
  directly into edit mode) rather than cramming a 13-field form into a list
  row. This keeps the list scannable/scoped to triage (browse, search,
  filter, delete) while the detail page stays the place to inspect/edit one
  record in full.
- **Delete requires a native `confirm()` before firing.** No modal library
  exists in this codebase, and a destructive, irreversible, no-undo action
  (in-memory store, no soft-delete) warrants a synchronous blocking
  confirmation rather than an easy-to-misclick single button.
- **Search + status filter are pure client-side state**, filtering the
  `SessionSummary[]` already delivered via `lobby:sync` — no new socket
  events or server round-trips needed, since the full list is already on
  the client.

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
  once immediately and again on every patient join/update/submit/staff
  edit/staff delete anywhere. Renders one row per session (`displayName`,
  relative "last updated" time, `StatusBadge`), each linking to
  `/staff/<sessionId>` for the full detail view. This is the page that
  replaced manual session-ID hand-off — staff never type or paste an ID.
  Also holds two pieces of purely client-side filter state: a name `search`
  string and a `statusFilter` (one of the `DisplayStatus` values or `"all"`,
  with per-tab counts derived from the already-loaded session list) — both
  combine via a single `.filter()` over `sessions`, no server round-trip.
  Each row also has "แก้ไข" (→ `/staff/<sessionId>?edit=1`) and "ลบ" buttons;
  delete confirms via `window.confirm()` then emits `staff:delete`.
- **`components/staff/StaffPanel.tsx`** (used by `/staff/[sessionId]`) —
  client component. On mount it emits `session:join` with `role: "staff"`
  and subscribes to `staff:sync`, which the server sends once immediately
  (current state) and again on every subsequent patient update *or staff
  edit/delete* for that one session. Derives a `"waiting"` pseudo-status
  client-side when no field has been filled yet. Reads the `?edit=1` query
  param (`useSearchParams`) to decide whether to open directly into edit
  mode. Toggles between the original read-only `<dl>` and
  `<PatientEditForm>` based on local `isEditing` state; a `hasSyncedOnce`
  ref distinguishes the *first* `staff:sync` (from the initial join — must
  not cancel an `?edit=1`-triggered edit mode) from a *later* one (the
  round-trip confirmation after a `staff:update` save, which *should* flip
  back to read-only). If `staff:sync` ever delivers `null` (this session was
  deleted, possibly from another staff tab), it redirects to `/staff`. Has a
  "← กลับไปรายชื่อผู้ป่วย" link back to the dashboard, plus its own
  "แก้ไขข้อมูล"/"ลบ" buttons (same behavior as the list row's).
- **`components/staff/PatientEditForm.tsx`** — client component, staff-side
  counterpart to `PatientForm.tsx`. Same `react-hook-form` +
  `zodResolver(patientFormSchema)` setup and the same field markup/labels
  (so it looks identical to the patient-facing form), but with none of
  `PatientForm`'s live-sync side effects (no debounce, no inactivity timer,
  no `patient:update`/`patient:submit`). On submit it emits `staff:update`
  with `{ sessionId, data }` and does nothing else locally — the parent
  (`StaffPanel`) leaves edit mode only once the server's `staff:sync`
  confirms the write, so there's a single source of truth instead of
  optimistic local state that could drift from what actually got saved.
- **`components/staff/StatusBadge.tsx`** — pure presentational component
  mapping a `DisplayStatus` (`lib/types.ts`) to a label + color/pulse; reused
  by both the dashboard rows and the single-session detail view. Its
  `CONFIG` map is exported and reused by `app/staff/page.tsx` to build the
  status filter tabs, so the wording stays identical between the badges and
  the filter labels instead of drifting.
- **`server.ts`** — the only non-Next entry point. Wraps Next's request
  handler in a plain `http.Server`, attaches `socket.io` to it, and wires up
  the server-side event handlers (join / lobby-join / update / submit /
  staff-update / staff-delete) against `server/session-store.ts`. A
  patient's `session:join` both registers the session (so it shows up on
  the dashboard immediately, even before the first keystroke) and
  re-broadcasts the lobby list. `staff:update` calls `updateSessionData`
  (preserves status) and re-emits `staff:sync` to the whole `sessionId` room
  (via `io.to`, not `socket.to`, so the editing staff client itself also
  gets the confirmed sync). `staff:delete` calls `deleteSession`, emits
  `staff:sync` with `null` to the `sessionId` room (signals "this session is
  gone" to `StaffPanel`), and re-broadcasts the lobby list.
- **`server/session-store.ts`** — a plain `Map` keyed by `sessionId`. No
  database: the assignment doesn't call for persistence across server
  restarts, and an in-memory store keeps the real-time path simple (no
  round-trip to a DB on every keystroke). `listSessions()` derives each
  row's `displayName` (from `firstName`/`lastName`, or a placeholder) and a
  display status (`"waiting"` when no field has data yet, else the raw
  status), sorted filling → inactive → waiting → submitted, most-recent
  first within each group. `updateSessionData(id, data)` differs from
  `updateSession(id, data, status)` by deliberately *not* touching the
  existing `status` — used for staff edits so correcting a submitted
  record's typo doesn't flip its dashboard status back to "filling".
  `deleteSession(id)` removes the entry outright (`sessions.delete`).

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
8. **Staff-initiated edits and deletes flow the same two rooms, in reverse
   direction** (staff → patient/other-staff, instead of patient → staff).
   From `PatientEditForm` (inside `StaffPanel`), saving emits `staff:update`
   with `{ sessionId, data }` (no `status` — the server preserves whatever
   status was already there). The server writes it via
   `updateSessionData`, then emits `staff:sync` to the whole `sessionId`
   room (so the editing staff client's own `StaffPanel` sees the
   confirmed save and exits edit mode — not an optimistic local update) and
   re-broadcasts `lobby:sync` (so the list's name/status/"last updated"
   stay current for every open dashboard).
9. **Delete** emits `staff:delete` with `{ sessionId }` from either the list
   row or the detail view (after a `window.confirm()`). The server calls
   `deleteSession`, emits `staff:sync` with `null` to the `sessionId` room
   — `StaffPanel` treats a `null` sync as unambiguous ("this session no
   longer exists," since a normal join/edit sync is never `null`) and
   `router.push("/staff")`s away — and re-broadcasts `lobby:sync` so the row
   disappears from every open dashboard.

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
