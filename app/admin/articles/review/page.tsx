import { getAdminArticles } from "@/lib/mock/admin";
import ArticleManager from "@/components/admin/ArticleManager";

export const metadata = { title: "기사 승인 큐 · 관리자" };

// 준기자 pending 기사 승인 전용 뷰(승인/반려). ArticleManager 재사용.
export default async function AdminArticleReviewPage() {
  const rows = await getAdminArticles("pending");
  return <ArticleManager initial={rows} />;
}
