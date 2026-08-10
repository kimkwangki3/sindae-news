import CategoryChips from "@/components/article/CategoryChips";
import ArticleList from "@/components/article/ArticleList";
import AdSlot from "@/components/AdSlot";
import { getArticlesPage } from "@/lib/mock/articles";

export const metadata = {
  title: "기사 · 해룡신문",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const first = await getArticlesPage(null, 0);

  return (
    <>
      <CategoryChips />
      <div className="px-[18px] pb-6">
        <AdSlot slot="articles-top" />
        <ArticleList
          category={null}
          initialItems={first.items}
          initialCursor={first.nextCursor}
        />
      </div>
    </>
  );
}
