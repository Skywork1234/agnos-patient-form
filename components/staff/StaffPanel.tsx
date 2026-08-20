"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import { SOCKET_EVENTS, type PatientData, type SessionState } from "@/lib/types";
import StatusBadge, { type StaffStatus } from "./StatusBadge";
import PatientEditForm from "./PatientEditForm";

const FIELD_LABELS: { key: keyof PatientData; label: string }[] = [
  { key: "firstName", label: "ชื่อจริง" },
  { key: "middleName", label: "ชื่อกลาง" },
  { key: "lastName", label: "นามสกุล" },
  { key: "dateOfBirth", label: "วันเกิด" },
  { key: "gender", label: "เพศ" },
  { key: "phone", label: "เบอร์โทรศัพท์" },
  { key: "email", label: "อีเมล" },
  { key: "address", label: "ที่อยู่" },
  { key: "preferredLanguage", label: "ภาษาที่ต้องการ" },
  { key: "nationality", label: "สัญชาติ" },
  { key: "emergencyContactName", label: "ผู้ติดต่อฉุกเฉิน" },
  { key: "emergencyContactRelationship", label: "ความสัมพันธ์" },
  { key: "religion", label: "ศาสนา" },
];

export default function StaffPanel({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<SessionState | null>(null);
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "1");
  // sync แรกมาจาก JOIN (โหลดข้อมูลตั้งต้น) ไม่ควรไปยกเลิก isEditing ที่เปิดมาจาก ?edit=1
  // sync ครั้งถัดไปถึงจะถือว่ามาจากการบันทึกจริง (STAFF_UPDATE) จึงค่อยปิดโหมดแก้ไข
  const hasSyncedOnce = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN, { sessionId, role: "staff" });
    const onSync = (payload: SessionState | null) => {
      if (payload === null) {
        // session ถูกลบไปจากที่อื่น (เช่น staff อีกคนกดลบจากหน้า list)
        router.push("/staff");
        return;
      }
      setState(payload);
      if (hasSyncedOnce.current) {
        setIsEditing(false);
      }
      hasSyncedOnce.current = true;
    };
    socket.on(SOCKET_EVENTS.STAFF_SYNC, onSync);
    return () => {
      socket.off(SOCKET_EVENTS.STAFF_SYNC, onSync);
    };
  }, [sessionId, router]);

  const handleDelete = () => {
    if (!window.confirm("ยืนยันการลบข้อมูลผู้ป่วยรายนี้ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้")) return;
    getSocket().emit(SOCKET_EVENTS.STAFF_DELETE, { sessionId });
  };

  const hasData = !!state && Object.values(state.data).some(Boolean);
  const status: StaffStatus = hasData && state ? state.status : "waiting";

  return (
    <main className="flex-1 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/staff" className="inline-flex items-center gap-1 text-sm text-blue-600 transition-colors hover:underline">
            ← กลับไปรายชื่อผู้ป่วย
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 transition-colors hover:underline">
            กลับหน้าแรก
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Staff View</h1>
            <p className="break-all text-xs text-slate-400">Session: {sessionId}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  แก้ไขข้อมูล
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  ลบ
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <PatientEditForm
            sessionId={sessionId}
            initialData={state?.data ?? {}}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <dl className="divide-y divide-slate-100">
              {FIELD_LABELS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                >
                  <dt className="w-full text-xs font-medium uppercase tracking-wide text-slate-400 sm:w-48">
                    {label}
                  </dt>
                  <dd className="text-sm text-slate-800">
                    {state?.data[key] || <span className="text-slate-300">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}
