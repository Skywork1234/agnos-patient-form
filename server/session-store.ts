import type {
  DisplayStatus,
  PatientData,
  PresenceStatus,
  SessionState,
  SessionSummary,
} from "../lib/types";

const sessions = new Map<string, SessionState>();

const STATUS_PRIORITY: Record<DisplayStatus, number> = {
  filling: 0,
  inactive: 1,
  waiting: 2,
  submitted: 3,
};

export function getSession(sessionId: string): SessionState {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const fresh: SessionState = { sessionId, data: {}, status: "inactive", updatedAt: Date.now() };
  sessions.set(sessionId, fresh);
  return fresh;
}

export function ensureSession(sessionId: string): SessionState {
  return getSession(sessionId);
}

export function updateSession(
  sessionId: string,
  data: Partial<PatientData>,
  status: PresenceStatus
): SessionState {
  const next: SessionState = { sessionId, data, status, updatedAt: Date.now() };
  sessions.set(sessionId, next);
  return next;
}

// ต่างจาก updateSession ตรงที่ "ไม่แตะ" status เดิม — ใช้ตอน staff แก้ไขข้อมูล
// เพื่อไม่ให้ record ที่ submitted แล้วถูกเปลี่ยนกลับเป็น filling/inactive โดยไม่ตั้งใจ
export function updateSessionData(
  sessionId: string,
  data: Partial<PatientData>
): SessionState {
  const existing = getSession(sessionId);
  const next: SessionState = { ...existing, data, updatedAt: Date.now() };
  sessions.set(sessionId, next);
  return next;
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function listSessions(): SessionSummary[] {
  return Array.from(sessions.values())
    .map((session) => ({
      sessionId: session.sessionId,
      displayName: displayNameFor(session.data),
      status: displayStatusFor(session),
      updatedAt: session.updatedAt,
    }))
    .sort((a, b) => {
      const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return b.updatedAt - a.updatedAt;
    });
}

function displayNameFor(data: Partial<PatientData>): string {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
  return name || "ผู้ป่วยไม่ทราบชื่อ";
}

function displayStatusFor(session: SessionState): DisplayStatus {
  const hasData = Object.values(session.data).some(Boolean);
  return hasData ? session.status : "waiting";
}
