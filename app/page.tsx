"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [newSessionId, setNewSessionId] = useState<string | null>(null);
  const [joinId, setJoinId] = useState("");
  const trimmedJoinId = joinId.trim();

  useEffect(() => {
    setNewSessionId(uuidv4());
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Agnos Patient Intake</h1>
          <p className="text-sm text-slate-500">
            สร้าง session ใหม่ แล้วเปิด Patient Form กับ Staff View คนละแท็บเพื่อดูข้อมูล sync แบบ real-time
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-medium text-slate-700">Session ใหม่</h2>
          <p className="break-all text-xs text-slate-400">ID: {newSessionId ?? "กำลังสร้าง..."}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={newSessionId ? `/patient/${newSessionId}` : "#"}
              aria-disabled={!newSessionId}
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium ${
                newSessionId
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "pointer-events-none bg-slate-100 text-slate-400"
              }`}
            >
              เปิด Patient Form
            </Link>
            <Link
              href={newSessionId ? `/staff/${newSessionId}` : "#"}
              aria-disabled={!newSessionId}
              className={`flex-1 rounded-lg border px-4 py-2 text-center text-sm font-medium ${
                newSessionId
                  ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                  : "pointer-events-none border-slate-200 text-slate-300"
              }`}
            >
              เปิด Staff View
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-medium text-slate-700">เข้าร่วม session เดิม</h2>
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="วาง session id ที่นี่"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={trimmedJoinId ? `/patient/${trimmedJoinId}` : "#"}
              aria-disabled={!trimmedJoinId}
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium ${
                trimmedJoinId
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "pointer-events-none bg-slate-100 text-slate-400"
              }`}
            >
              เปิด Patient Form
            </Link>
            <Link
              href={trimmedJoinId ? `/staff/${trimmedJoinId}` : "#"}
              aria-disabled={!trimmedJoinId}
              className={`flex-1 rounded-lg border px-4 py-2 text-center text-sm font-medium ${
                trimmedJoinId
                  ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                  : "pointer-events-none border-slate-200 text-slate-300"
              }`}
            >
              เปิด Staff View
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
