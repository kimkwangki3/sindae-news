import CategoryChips from "@/components/article/CategoryChips";
import ArticleList from "@/components/article/ArticleList";
import { getArticlesPage } from "@/lib/mock/articles";

export const metadata = { title: "기사 · 신대신문" };

export default async function ArticlesPage() {
  const first = await getArticlesPage(null, 0);

  return (
    <>
      <CategoryChips />
      <div className="px-[18px] pb-6">
        <ArticleList
          category={null}
          initialItems={first.items}
          initialCursor={first.nextCursor}
        />
      </div>
    </>
  );
}
