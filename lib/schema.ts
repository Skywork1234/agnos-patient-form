import { z } from "zod";

const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

export const patientFormSchema = z.object({
  firstName: z.string().trim().min(1, "กรุณากรอกชื่อจริง"),
  middleName: z.string().trim().optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
  dateOfBirth: z.string().min(1, "กรุณาระบุวันเกิด"),
  gender: z.string().min(1, "กรุณาเลือกเพศ"),
  phone: z
    .string()
    .trim()
    .min(1, "กรุณากรอกเบอร์โทรศัพท์")
    .regex(phoneRegex, "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"),
  email: z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  address: z.string().trim().min(1, "กรุณากรอกที่อยู่"),
  preferredLanguage: z.string().min(1, "กรุณาเลือกภาษาที่ต้องการ"),
  nationality: z.string().trim().min(1, "กรุณากรอกสัญชาติ"),
  emergencyContactName: z.string().trim().optional().or(z.literal("")),
  emergencyContactRelationship: z.string().trim().optional().or(z.literal("")),
  religion: z.string().trim().optional().or(z.literal("")),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export const patientFormDefaults: PatientFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  preferredLanguage: "",
  nationality: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  religion: "",
};
