import { StudentQueue } from "@/components/admin/admin-view";
import { listPendingStudentVerifications } from "@/lib/admin";

export const metadata = { title: "학생 인증 — 해봇 AI" };

export default async function AdminStudentsPage() {
  const requests = await listPendingStudentVerifications();
  return <StudentQueue requests={requests} />;
}
