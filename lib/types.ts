export type PresenceStatus = "filling" | "inactive" | "submitted";
export type DisplayStatus = "waiting" | PresenceStatus;

export interface PatientData {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  preferredLanguage: string;
  nationality: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  religion?: string;
}

export interface SessionState {
  sessionId: string;
  data: Partial<PatientData>;
  status: PresenceStatus;
  updatedAt: number;
}

export interface SessionSummary {
  sessionId: string;
  displayName: string;
  status: DisplayStatus;
  updatedAt: number;
}

export const SOCKET_EVENTS = {
  JOIN: "session:join",
  PATIENT_UPDATE: "patient:update",
  PATIENT_SUBMIT: "patient:submit",
  STAFF_SYNC: "staff:sync",
  PATIENT_SYNC: "patient:sync",
  LOBBY_JOIN: "lobby:join",
  LOBBY_SYNC: "lobby:sync",
  STAFF_UPDATE: "staff:update",
  STAFF_DELETE: "staff:delete",
} as const;

export interface PatientUpdatePayload {
  sessionId: string;
  data: Partial<PatientData>;
  status: PresenceStatus;
}

export interface JoinPayload {
  sessionId: string;
  role: "patient" | "staff";
}

export interface StaffUpdatePayload {
  sessionId: string;
  data: Partial<PatientData>;
}

export interface StaffDeletePayload {
  sessionId: string;
}
