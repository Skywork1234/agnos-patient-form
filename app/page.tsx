import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Agnos Patient Intake</h1>
          <p className="text-sm text-slate-500">เลือกบทบาทของคุณเพื่อเริ่มต้นใช้งาน</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/patient"
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
          >
            <span className="text-3xl">🧑‍⚕️</span>
            <span className="text-sm font-medium text-slate-900">ฉันเป็นผู้ป่วย</span>
            <span className="text-xs text-slate-500">กรอกแบบฟอร์มข้อมูลผู้ป่วย</span>
          </Link>
          <Link
            href="/staff"
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
          >
            <span className="text-3xl">🩺</span>
            <span className="text-sm font-medium text-slate-900">ฉันเป็นเจ้าหน้าที่</span>
            <span className="text-xs text-slate-500">ดูรายชื่อผู้ป่วยแบบเรียลไทม์</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
