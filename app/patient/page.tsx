"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { LAST_PATIENT_SESSION_KEY } from "@/lib/session-storage";

export default function PatientEntry() {
  const router = useRouter();

  useEffect(() => {
    const existing = localStorage.getItem(LAST_PATIENT_SESSION_KEY);
    const sessionId = existing ?? uuidv4();
    if (!existing) localStorage.setItem(LAST_PATIENT_SESSION_KEY, sessionId);
    router.replace(`/patient/${sessionId}`);
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-slate-400">กำลังเตรียมฟอร์ม...</p>
    </main>
  );
}
