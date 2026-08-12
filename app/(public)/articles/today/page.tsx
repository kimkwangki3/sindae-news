import Link from "next/link";
import CategoryChips from "@/components/article/CategoryChips";
import ArticleListItem from "@/components/ArticleListItem";
import { getTodayArticles } from "@/lib/mock/articles";

// 오늘 올라온 기사를 보는 자리다. 캐시하면 아침에 발행한 기사가 안 보인다.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "금일 뉴스 · 해룡신문",
  description: "해룡신문이 오늘 전한 소식.",
  alternates: { canonical: "/articles/today" },
};

export default async function TodayPage() {
  const { items, date, isToday } = await getTodayArticles();

  return (
    <>
      <CategoryChips />
      <div className="px-[18px] pb-6">
        <div className="py-2">
          <h1 className="text-[22px] text-rose-deep">금일 뉴스</h1>
          <p className="mt-1 text-xs text-muted">
            {isToday
              ? `${date} · ${items.length}건`
              : `오늘 올라온 기사가 아직 없습니다. 가장 최근 소식(${date})을 보여드립니다.`}
          </p>
        </div>

        {items.map((a) => (
          <ArticleListItem key={a.slug} article={a} />
        ))}

        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            아직 등록된 기사가 없습니다
          </p>
        )}

        <div className="border-t border-line pt-5 text-center">
          <Link href="/articles" className="text-sm text-rose">
            지난 기사 전체 보기 ›
          </Link>
        </div>
      </div>
    </>
  );
}
