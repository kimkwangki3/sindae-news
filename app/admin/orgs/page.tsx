import { getAdminEntities } from "@/lib/mock/admin";
import ApprovalManager from "@/components/admin/ApprovalManager";

export const metadata = { title: "지역단체 관리 · 관리자" };

export default async function AdminOrgsPage() {
  const rows = await getAdminEntities("org");
  return <ApprovalManager kind="org" initial={rows} />;
}
