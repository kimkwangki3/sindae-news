import {
  getArticleStatsList,
  getBoardStatsList,
  getCategoryTotals,
} from "@/lib/mock/admin";
import AnalyticsView from "@/components/admin/AnalyticsView";

export const metadata = { title: "통계·분석 · 관리자" };

export default async function AdminAnalyticsPage() {
  const [articles, boards, categories] = await Promise.all([
    getArticleStatsList(),
    getBoardStatsList(),
    getCategoryTotals(),
  ]);
  return (
    <AnalyticsView
      articles={articles}
      boards={boards}
      categories={categories}
    />
  );
}
