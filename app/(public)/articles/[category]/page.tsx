import { notFound } from "next/navigation";
import CategoryChips from "@/components/article/CategoryChips";
import ArticleListItem from "@/components/ArticleListItem";
import Pager from "@/components/article/Pager";
import {
  CATEGORY_NAME,
  getArticlesByPage,
  type CategorySlug,
} from "@/lib/mock/articles";
import { readPageParam } from "@/lib/paging";

const VALID: CategorySlug[] = ["local", "admin", "people", "life"];

const PER_PAGE = 10;

// 실시간 발행 반영을 위해 동적 렌더(목록은 항상 최신 DB 기준).
export const dynamic = "force-dynamic";

type Props = {
  params: { category: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

// generateStaticParams는 두지 않는다. 네 카테고리를 미리 만들어 두면
// ?p=2 요청에도 같은 정적 HTML(1쪽)이 나간다 — 쪽 번호가 먹지 않는다.
export function generateMetadata({ params, searchParams }: Props) {
  const name = CATEGORY_NAME[params.category as CategorySlug];
  if (!name) return { title: "기사 · 해룡신문" };
  const page = readPageParam(searchParams);
  const base = `/articles/${params.category}`;
  return {
    title: page > 1 ? `${name} ${page}쪽 · 해룡신문` : `${name} · 해룡신문`,
    alternates: { canonical: page > 1 ? `${base}?p=${page}` : base },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = params.category as CategorySlug;
  if (!VALID.includes(category)) notFound();

  const page = readPageParam(searchParams);
  const { items, totalPages } = await getArticlesByPage(category, page, PER_PAGE);
  if (page > 1 && items.length === 0) notFound();

  return (
    <>
      <CategoryChips />
      <div className="px-[18px] pb-6">
        <h1 className="py-2 text-[22px] text-rose-deep">
          {CATEGORY_NAME[category]}
        </h1>
        {items.map((a) => (
          <ArticleListItem key={a.slug} article={a} />
        ))}
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            아직 등록된 기사가 없습니다
          </p>
        )}
        <Pager
          page={page}
          totalPages={totalPages}
          basePath={`/articles/${category}`}
        />
      </div>
    </>
  );
}
