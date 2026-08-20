"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  patientFormSchema,
  patientFormDefaults,
  type PatientFormValues,
} from "@/lib/schema";
import { getSocket } from "@/lib/socket-client";
import { SOCKET_EVENTS, type PatientData } from "@/lib/types";
import FormField from "@/components/patient/FormField";

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500";

export default function PatientEditForm({
  sessionId,
  initialData,
  onCancel,
}: {
  sessionId: string;
  initialData: Partial<PatientData>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: { ...patientFormDefaults, ...initialData },
    mode: "onBlur",
  });

  // ไม่ setIsEditing(false) ที่นี่ — parent (StaffPanel) จะออกจากโหมดแก้ไขเอง
  // ตอนได้รับ STAFF_SYNC กลับมาจาก server ซึ่งเป็นสัญญาณว่าบันทึกสำเร็จจริง
  const onSubmit = (data: PatientFormValues) => {
    getSocket().emit(SOCKET_EVENTS.STAFF_UPDATE, { sessionId, data });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
    >
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

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          บันทึกการแก้ไข
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
