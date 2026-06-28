import { getAdminComments } from "@/lib/mock/admin";
import CommentManager from "@/components/admin/CommentManager";

export const metadata = { title: "댓글 관리 · 관리자" };

export default async function AdminCommentsPage() {
  return <CommentManager initial={await getAdminComments()} />;
}
