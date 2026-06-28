import { getStaffList } from "@/lib/mock/admin";
import StaffManager from "@/components/admin/StaffManager";

export const metadata = { title: "관리자·권한 · 관리자" };

export default async function AdminStaffPage() {
  const rows = await getStaffList();
  return <StaffManager initial={rows} />;
}
