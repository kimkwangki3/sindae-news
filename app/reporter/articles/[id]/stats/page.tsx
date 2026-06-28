import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getArticleStats, ARTICLE_STATUS_LABEL } from "@/lib/mock/reporter";

export const metadata = { title: "기사 통계 · 기자 공간" };

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-4 text-center">
      <p className="text-2xl font-extrabold text-rose-deep">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span className="text-sm font-bold"> {unit}</span>}
      </p>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}

export default async function ArticleStatsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const s = await getArticleStats(user.id, params.id);
  if (!s) notFound();

  return (
    <div className="px-[18px] py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg text-rose-deep">기사 통계</h1>
        <Link href="/reporter/articles" className="text-xs text-muted">
          ‹ 내 기사
        </Link>
      </div>

      <div className="mb-4 rounded-card border border-line bg-white p-4">
        <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[11px] font-bold text-rose">
          {ARTICLE_STATUS_LABEL[s.status]}
        </span>
        <p className="mt-2 text-base font-bold leading-snug">{s.title}</p>
        {s.status === "published" && (
          <Link
            href={`/article/${s.slug}`}
            className="mt-1 inline-block text-xs text-rose"
          >
            기사 보기 ›
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="총 조회수" value={s.totalViews} />
        <Stat label="순 방문자(IP)" value={s.uniqueVisitors} />
        <Stat label="평균 읽음률" value={s.avgScroll} unit="%" />
        <Stat label="평균 체류" value={s.avgDwellSec} unit="초" />
        <Stat label="좋아요" value={s.likes} />
        <Stat label="싫어요" value={s.dislikes} />
      </div>

      <div className="mt-2">
        <Stat label="댓글" value={s.comments} />
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
        읽음률·체류시간은 독자의 스크롤·머문 시간을 익명 집계한 값입니다.
      </p>
    </div>
  );
}
