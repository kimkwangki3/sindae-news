import { getAdminArticles } from "@/lib/mock/admin";
import ArticleManager from "@/components/admin/ArticleManager";

export const metadata = { title: "기사 관리 · 관리자" };

export default async function AdminArticlesPage() {
  const rows = await getAdminArticles();
  return <ArticleManager initial={rows} />;
}
