"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import { SOCKET_EVENTS, type DisplayStatus, type SessionSummary } from "@/lib/types";
import StatusBadge, { CONFIG } from "@/components/staff/StatusBadge";

type StatusFilter = "all" | DisplayStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  ...(Object.entries(CONFIG) as [DisplayStatus, (typeof CONFIG)[DisplayStatus]][]).map(
    ([value, config]) => ({ value, label: config.label })
  ),
];

function formatRelativeTime(updatedAt: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  if (seconds < 5) return "เมื่อสักครู่";
  if (seconds < 60) return `${seconds} วินาทีที่แล้ว`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ชั่วโมงที่แล้ว`;
}

export default function StaffDashboard() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredSessions = sessions.filter(
    (session) =>
      session.displayName.toLowerCase().includes(search.trim().toLowerCase()) &&
      (statusFilter === "all" || session.status === statusFilter)
  );

  const countFor = (value: StatusFilter) =>
    value === "all" ? sessions.length : sessions.filter((s) => s.status === value).length;

  const handleDelete = (sessionId: string, displayName: string) => {
    if (!window.confirm(`ยืนยันการลบข้อมูลของ "${displayName}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    getSocket().emit(SOCKET_EVENTS.STAFF_DELETE, { sessionId });
  };

  useEffect(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.LOBBY_JOIN);
    const onSync = (list: SessionSummary[]) => setSessions(list);
    socket.on(SOCKET_EVENTS.LOBBY_SYNC, onSync);

    const interval = setInterval(() => {
      // re-render periodically so relative timestamps stay fresh
      setSessions((prev) => [...prev]);
    }, 15000);

    return () => {
      socket.off(SOCKET_EVENTS.LOBBY_SYNC, onSync);
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="flex-1 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          ← กลับหน้าแรก
        </Link>

        <div>
          <h1 className="text-xl font-semibold text-slate-900">Staff Dashboard</h1>
          <p className="text-sm text-slate-500">รายชื่อผู้ป่วยที่กำลังกรอกฟอร์มแบบเรียลไทม์</p>
        </div>

        {sessions.length > 0 && (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ป่วย..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    statusFilter === option.value
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label} ({countFor(option.value)})
                </button>
              ))}
            </div>
          </>
        )}

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            ยังไม่มีผู้ป่วยกำลังกรอกฟอร์ม
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            ไม่พบผู้ป่วยที่ตรงกับเงื่อนไขที่เลือก
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredSessions.map((session) => (
              <li key={session.sessionId} className="flex items-center gap-2">
                <Link
                  href={`/staff/${session.sessionId}`}
                  className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-blue-300 hover:bg-blue-50/40 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{session.displayName}</p>
                    <p className="text-xs text-slate-400">{formatRelativeTime(session.updatedAt)}</p>
                  </div>
                  <StatusBadge status={session.status} />
                </Link>
                <Link
                  href={`/staff/${session.sessionId}?edit=1`}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  แก้ไข
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(session.sessionId, session.displayName)}
                  className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  aria-label={`ลบ ${session.displayName}`}
                >
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
