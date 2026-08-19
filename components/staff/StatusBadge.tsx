import type { DisplayStatus } from "@/lib/types";

export type StaffStatus = DisplayStatus;

export const CONFIG: Record<StaffStatus, { label: string; className: string; pulse?: boolean }> = {
  waiting: { label: "รอผู้ป่วยเริ่มกรอก", className: "bg-slate-100 text-slate-500" },
  filling: { label: "กำลังกรอกข้อมูล", className: "bg-amber-100 text-amber-700", pulse: true },
  inactive: { label: "ไม่มีการเคลื่อนไหว", className: "bg-slate-200 text-slate-600" },
  submitted: { label: "ส่งข้อมูลแล้ว", className: "bg-emerald-100 text-emerald-700" },
};

export default function StatusBadge({ status }: { status: StaffStatus }) {
  const config = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      {config.pulse && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
      {config.label}
    </span>
  );
}
