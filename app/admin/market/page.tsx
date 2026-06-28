import { getAdminPosts } from "@/lib/mock/admin";
import AdminPostManager from "@/components/admin/AdminPostManager";

export const metadata = { title: "나눔마켓 관리 · 관리자" };

export default async function AdminMarketPage() {
  const rows = await getAdminPosts("market");
  return <AdminPostManager kind="market" initial={rows} />;
}
