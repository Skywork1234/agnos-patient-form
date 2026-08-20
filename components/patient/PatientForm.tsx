"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  patientFormSchema,
  patientFormDefaults,
  type PatientFormValues,
} from "@/lib/schema";
import { getSocket } from "@/lib/socket-client";
import { SOCKET_EVENTS, type SessionState } from "@/lib/types";
import { LAST_PATIENT_SESSION_KEY } from "@/lib/session-storage";
import FormField from "./FormField";

const INACTIVITY_MS = 10000;
const DEBOUNCE_MS = 300;

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500";

export default function PatientForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: patientFormDefaults,
    mode: "onBlur",
  });

  const [submitted, setSubmitted] = useState(false);
  const [ready, setReady] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setReady(false);
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN, { sessionId, role: "patient" });
    localStorage.setItem(LAST_PATIENT_SESSION_KEY, sessionId);

    const onSync = (state: SessionState) => {
      if (state.status === "submitted") {
        setSubmitted(true);
        setReady(true);
        return;
      }
      if (Object.keys(state.data).length > 0) {
        reset({ ...patientFormDefaults, ...state.data });
      }
      setReady(true);
    };
    socket.on(SOCKET_EVENTS.PATIENT_SYNC, onSync);
    // Fallback in case the sync response never arrives (e.g. dropped connection).
    const readyFallback = setTimeout(() => setReady(true), 3000);
    return () => {
      socket.off(SOCKET_EVENTS.PATIENT_SYNC, onSync);
      clearTimeout(readyFallback);
    };
  }, [sessionId, reset]);

  const values = watch();
  const serialized = JSON.stringify(values);

  useEffect(() => {
    if (submitted || !ready) return;
    const socket = getSocket();
    const data = JSON.parse(serialized) as PatientFormValues;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.PATIENT_UPDATE, { sessionId, data, status: "filling" });
    }, DEBOUNCE_MS);

    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.PATIENT_UPDATE, { sessionId, data, status: "inactive" });
    }, INACTIVITY_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [serialized, sessionId, submitted, ready]);

  const onSubmit = (data: PatientFormValues) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    getSocket().emit(SOCKET_EVENTS.PATIENT_SUBMIT, { sessionId, data, status: "submitted" });
    setSubmitted(true);
  };

  const startNewPatient = () => {
    localStorage.removeItem(LAST_PATIENT_SESSION_KEY);
    router.push("/patient");
  };

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-slate-400">กำลังเตรียมฟอร์ม...</p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-slate-900">ส่งข้อมูลเรียบร้อยแล้ว</h1>
            <p className="text-sm text-slate-500">
              ขอบคุณค่ะ เจ้าหน้าที่ได้รับข้อมูลของคุณแล้ว กรุณารอเรียกคิว
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={startNewPatient}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              เริ่มฟอร์มผู้ป่วยรายใหม่
            </button>
            <Link href="/" className="text-sm text-blue-600 transition-colors hover:underline">
              ← กลับหน้าแรก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 transition-colors hover:underline">
          ← กลับหน้าแรก
        </Link>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto mt-3 max-w-3xl space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">แบบฟอร์มข้อมูลผู้ป่วย</h1>
          <p className="text-sm text-slate-500">กรุณากรอกข้อมูลให้ครบถ้วน ระบบจะบันทึกให้เจ้าหน้าที่เห็นแบบเรียลไทม์</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="ชื่อจริง" required error={errors.firstName?.message}>
            <input className={inputClass} {...register("firstName")} />
          </FormField>
          <FormField label="ชื่อกลาง" error={errors.middleName?.message}>
            <input className={inputClass} {...register("middleName")} />
          </FormField>
          <FormField label="นามสกุล" required error={errors.lastName?.message}>
            <input className={inputClass} {...register("lastName")} />
          </FormField>
          <FormField label="วันเกิด" required error={errors.dateOfBirth?.message}>
            <input type="date" className={inputClass} {...register("dateOfBirth")} />
          </FormField>
          <FormField label="เพศ" required error={errors.gender?.message}>
            <select className={inputClass} {...register("gender")}>
              <option value="">เลือกเพศ</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
              <option value="other">อื่นๆ</option>
              <option value="prefer_not_to_say">ไม่ต้องการระบุ</option>
            </select>
          </FormField>
          <FormField label="เบอร์โทรศัพท์" required error={errors.phone?.message}>
            <input type="tel" className={inputClass} {...register("phone")} />
          </FormField>
          <FormField label="อีเมล" required error={errors.email?.message}>
            <input type="email" className={inputClass} {...register("email")} />
          </FormField>
          <FormField label="สัญชาติ" required error={errors.nationality?.message}>
            <input className={inputClass} {...register("nationality")} />
          </FormField>
          <FormField label="ภาษาที่ต้องการ" required error={errors.preferredLanguage?.message}>
            <select className={inputClass} {...register("preferredLanguage")}>
              <option value="">เลือกภาษา</option>
              <option value="thai">ไทย</option>
              <option value="english">อังกฤษ</option>
              <option value="other">อื่นๆ</option>
            </select>
          </FormField>
          <FormField label="ศาสนา" error={errors.religion?.message}>
            <input className={inputClass} {...register("religion")} />
          </FormField>
          <FormField label="ที่อยู่" required error={errors.address?.message} className="sm:col-span-2">
            <textarea rows={2} className={inputClass} {...register("address")} />
          </FormField>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h2 className="text-sm font-medium text-slate-700">ผู้ติดต่อฉุกเฉิน (ไม่บังคับ)</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="ชื่อผู้ติดต่อฉุกเฉิน" error={errors.emergencyContactName?.message}>
              <input className={inputClass} {...register("emergencyContactName")} />
            </FormField>
            <FormField label="ความสัมพันธ์" error={errors.emergencyContactRelationship?.message}>
              <input className={inputClass} {...register("emergencyContactRelationship")} />
            </FormField>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          ส่งข้อมูล
        </button>
      </form>
    </main>
  );
}
