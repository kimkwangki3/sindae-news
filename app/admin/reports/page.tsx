import { getAdminReports } from "@/lib/mock/admin";
import ReportManager from "@/components/admin/ReportManager";

export const metadata = { title: "신고 관리 · 관리자" };

export default async function AdminReportsPage() {
  return <ReportManager initial={await getAdminReports()} />;
}
