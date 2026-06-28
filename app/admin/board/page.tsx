import { getAdminPosts } from "@/lib/mock/admin";
import AdminPostManager from "@/components/admin/AdminPostManager";

export const metadata = { title: "자유게시판 관리 · 관리자" };

export default async function AdminBoardPage() {
  const rows = await getAdminPosts("board");
  return <AdminPostManager kind="board" initial={rows} />;
}
