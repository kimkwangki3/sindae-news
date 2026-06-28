import {
  getReporterApplications,
  getActiveReporters,
} from "@/lib/mock/admin";
import ReporterAdminManager from "@/components/admin/ReporterAdminManager";

export const metadata = { title: "기자 신청·관리 · 관리자" };

export default async function AdminReportersPage() {
  const [apps, reporters] = await Promise.all([
    getReporterApplications(),
    getActiveReporters(),
  ]);
  return <ReporterAdminManager apps={apps} reporters={reporters} />;
}
