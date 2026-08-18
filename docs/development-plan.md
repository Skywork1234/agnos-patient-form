# Development Plan

## Project Structure

```
agnos-patient-form/
  server.ts                        # Custom Node server: HTTP + Next.js request handler + Socket.io
  app/
    layout.tsx                     # Root layout (fonts, metadata)
    globals.css                    # Tailwind import + base theme tokens
    page.tsx                       # Landing page: create a new session / join an existing one
    patient/[sessionId]/page.tsx   # Server component: awaits `sessionId` param, renders PatientForm
    staff/[sessionId]/page.tsx     # Server component: awaits `sessionId` param, renders StaffPanel
  components/
    patient/
      PatientForm.tsx              # The patient intake form (client component)
      FormField.tsx                # Generic labeled-field wrapper (label + error message)
    staff/
      StaffPanel.tsx                # Read-only live view of a session's data (client component)
      StatusBadge.tsx                # Presence/status pill (waiting/filling/inactive/submitted)
  lib/
    types.ts                       # Shared types: PatientData, SessionState, socket event names/payloads
    schema.ts                      # zod schema + defaults for the patient form
    socket-client.ts               # Client-side Socket.io singleton
  server/
    session-store.ts               # In-memory session store (Map<sessionId, SessionState>)
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

- **`app/page.tsx` (Landing)** — client component. Generates a fresh
  `sessionId` (UUID v4) on mount and links to `/patient/<id>` and
  `/staff/<id>`. Also has a small "join existing session" input for
  re-opening a session by ID. The ID is generated in a `useEffect` (not at
  render time) specifically to avoid a server/client hydration mismatch,
  since server-rendered HTML would otherwise contain a different random ID
  than the client's first render.
- **`app/patient/[sessionId]/page.tsx`** — server component. Its only job is
  to `await params` (Next.js 15+ route params are async) and hand
  `sessionId` down to `PatientForm`. Keeping the route file a server
  component avoids awaiting a promise on the client.
- **`components/patient/PatientForm.tsx`** — client component, the core of
  the patient side. Uses `react-hook-form` with a `zodResolver` for
  validation. On mount it emits `session:join` with `role: "patient"`. It
  `watch()`es all fields and, on any change, debounces (300ms) an emit of
  `patient:update`. It also runs a separate 10s inactivity timer per change
  that (if nothing else changes first) emits a `status: "inactive"` update.
  On submit, it emits `patient:submit` and swaps to a "thank you" screen —
  the form is a one-shot submission, not editable after submit.
- **`components/patient/FormField.tsx`** — presentational wrapper: label +
  required marker + error text, so every field in `PatientForm` is a
  one-line `<FormField>` around a plain input/select/textarea, rather than
  repeating label/error markup per field.
- **`components/staff/StaffPanel.tsx`** — client component. On mount it
  emits `session:join` with `role: "staff"` and subscribes to
  `staff:sync`, which the server sends once immediately (the current
  state, so a staff member joining mid-fill sees data right away) and again
  on every subsequent patient update. Derives a `"waiting"` pseudo-status
  client-side when no field has been filled yet, so the badge is accurate
  even before the patient has interacted.
- **`components/staff/StatusBadge.tsx`** — pure presentational component
  mapping a status to a label + color/pulse.
- **`server.ts`** — the only non-Next entry point. Wraps Next's request
  handler in a plain `http.Server`, attaches `socket.io` to it, and wires
  up the three server-side event handlers (join / update / submit) against
  `server/session-store.ts`.
- **`server/session-store.ts`** — a plain `Map` keyed by `sessionId`. No
  database: the assignment doesn't call for persistence across server
  restarts, and an in-memory store keeps the real-time path simple (no
  round-trip to a DB on every keystroke).

## Real-Time Synchronization Flow

1. The landing page generates a `sessionId` and the user opens
   `/patient/<id>` and `/staff/<id>` (typically in two different
   tabs/windows/devices).
2. Both pages connect to the same Socket.io server (`server.ts`) and emit
   `session:join` with `{ sessionId, role }`. The server puts the socket
   into a Socket.io **room** named after `sessionId` — this is what scopes
   updates to only the patient/staff pair for that session, even if many
   sessions are active at once.
3. If the joining client is `staff`, the server immediately emits
   `staff:sync` back to just that socket with the session's current state
   (`getSession(sessionId)`), so a staff member opening the view after the
   patient has already started sees the current data instead of a blank
   form.
4. As the patient types, `PatientForm` debounces changes (300ms) and emits
   `patient:update` with `{ sessionId, data, status: "filling" }`. The
   server writes this into `session-store` and broadcasts `staff:sync` to
   everyone else in the room (`socket.to(sessionId).emit(...)`).
5. A parallel 10s inactivity timer (reset on every change) emits another
   `patient:update` with `status: "inactive"` if the patient stops typing,
   so the staff view can distinguish "actively filling" from "walked away
   mid-form."
6. On submit, `PatientForm` emits `patient:submit`; the server marks the
   session `status: "submitted"` and broadcasts `staff:sync` to the whole
   room (`io.to(sessionId).emit(...)`, including back to the patient's own
   socket, though the patient UI has already switched to the thank-you
   screen by then).
7. State lives only in server memory for the lifetime of the process — a
   server restart clears in-flight sessions, which is an accepted
   trade-off for this assignment's scope (no persistence requirement).

## Testing Performed

Verified locally with a headless-browser script driving two independent
browser contexts (patient + staff) against the running dev server:

- Typing in the Patient Form updates the Staff View within the debounce
  window, and the status badge flips to "filling."
- Submitting the form flips both the Patient Form (to a thank-you screen)
  and the Staff View badge (to "submitted") in real time.
- Required-field validation blocks submission and shows inline error text.
- Both pages render correctly at a mobile viewport (390×844) and desktop
  width, including the Staff View's waiting state before any patient data
  arrives.
- No console/runtime errors in either view during the flow above.
