import { notFound } from "next/navigation";
import CategoryChips from "@/components/article/CategoryChips";
import ArticleList from "@/components/article/ArticleList";
import {
  CATEGORY_NAME,
  getArticlesPage,
  type CategorySlug,
} from "@/lib/mock/articles";

const VALID: CategorySlug[] = ["local", "admin", "people", "life"];

// 실시간 발행 반영을 위해 동적 렌더(목록은 항상 최신 DB 기준).
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return VALID.map((category) => ({ category }));
}

export function generateMetadata({
  params,
}: {
  params: { category: string };
}) {
  const name = CATEGORY_NAME[params.category as CategorySlug];
  return { title: name ? `${name} · 신대신문` : "기사 · 신대신문" };
}

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = params.category as CategorySlug;
  if (!VALID.includes(category)) notFound();

  const first = await getArticlesPage(category, 0);

  return (
    <>
      <CategoryChips />
      <div className="px-[18px] pb-6">
        <h1 className="py-2 text-[17px] text-rose-deep">
          {CATEGORY_NAME[category]}
        </h1>
        <ArticleList
          category={category}
          initialItems={first.items}
          initialCursor={first.nextCursor}
        />
      </div>
    </>
  );
}
