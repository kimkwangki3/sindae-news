import { Fragment } from "react";
import { notFound } from "next/navigation";
import CategoryChips from "@/components/article/CategoryChips";
import ArticleListItem from "@/components/ArticleListItem";
import Pager from "@/components/article/Pager";
import AdSlot from "@/components/AdSlot";
import NetworkAd from "@/components/NetworkAd";
import { getArticlesByPage } from "@/lib/mock/articles";
import { readPageParam } from "@/lib/paging";

// 발행 즉시 목록에 반영되도록 동적 렌더.
export const dynamic = "force-dynamic";

// 한 쪽에 담을 기사 수.
const PER_PAGE = 10;

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export function generateMetadata({ searchParams }: Props) {
  const page = readPageParam(searchParams);
  return {
    title: page > 1 ? `기사 ${page}쪽 · 해룡신문` : "기사 · 해룡신문",
    // 쪽마다 자기 주소를 가리킨다. 전부 /articles를 가리키면 2쪽부터는
    // 검색엔진이 중복으로 보고 색인에서 뺀다.
    alternates: { canonical: page > 1 ? `/articles?p=${page}` : "/articles" },
  };
}

export default async function ArticlesPage({ searchParams }: Props) {
  const page = readPageParam(searchParams);
  const { items, totalPages } = await getArticlesByPage(null, page, PER_PAGE);

  // 없는 쪽을 빈 화면으로 내주면 검색엔진이 빈 쪽을 끝없이 긁는다.
  if (page > 1 && items.length === 0) notFound();

  return (
    <>
      <CategoryChips />
      <div className="px-[18px] pb-6">
        <AdSlot slot="articles-top" />
        {items.map((a, i) => (
          <Fragment key={a.slug}>
            <ArticleListItem article={a} />
            {/* 광고 — 한 쪽 10건의 한가운데. 맨 아래에 두면 페이지를 넘기는
                사람은 지나치고, 맨 위에 두면 목록보다 광고가 먼저 보인다. */}
            {i === 4 && <NetworkAd slot="articles-list" />}
          </Fragment>
        ))}
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            아직 등록된 기사가 없습니다
          </p>
        )}
        <Pager page={page} totalPages={totalPages} basePath="/articles" />
      </div>
    </>
  );
}
