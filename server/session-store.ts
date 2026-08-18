import type { PatientData, PresenceStatus, SessionState } from "../lib/types";

const sessions = new Map<string, SessionState>();

export function getSession(sessionId: string): SessionState {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const fresh: SessionState = { data: {}, status: "inactive", updatedAt: Date.now() };
  sessions.set(sessionId, fresh);
  return fresh;
}

export function updateSession(
  sessionId: string,
  data: Partial<PatientData>,
  status: PresenceStatus
): SessionState {
  const next: SessionState = { data, status, updatedAt: Date.now() };
  sessions.set(sessionId, next);
  return next;
}
