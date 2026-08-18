export type PresenceStatus = "filling" | "inactive" | "submitted";

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
  data: Partial<PatientData>;
  status: PresenceStatus;
  updatedAt: number;
}

export const SOCKET_EVENTS = {
  JOIN: "session:join",
  PATIENT_UPDATE: "patient:update",
  PATIENT_SUBMIT: "patient:submit",
  STAFF_SYNC: "staff:sync",
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
