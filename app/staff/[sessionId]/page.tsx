import StaffPanel from "@/components/staff/StaffPanel";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <StaffPanel sessionId={sessionId} />;
}
