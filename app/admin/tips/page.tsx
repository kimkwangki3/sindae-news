import { getAdminTips } from "@/lib/mock/admin";
import TipManager from "@/components/admin/TipManager";

export const metadata = { title: "제보함 · 관리자" };

export default async function AdminTipsPage() {
  const rows = await getAdminTips();
  return <TipManager initial={rows} />;
}
