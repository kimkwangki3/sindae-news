import Link from "next/link";
import {
  getAdminStats,
  getAdminQueueCounts,
  getArticleStatsList,
  getBoardStatsList,
} from "@/lib/mock/admin";
import { PageHead } from "@/components/admin/ui";

export const metadata = { title: "대시보드 · 관리자" };

const QUEUE: { key: keyof Awaited<ReturnType<typeof getAdminQueueCounts>>; label: string; href: string }[] = [
  { key: "pendingArticles", label: "기사 승인", href: "/admin/articles/review" },
  { key: "pendingReporterApps", label: "기자 신청", href: "/admin/reporters" },
  { key: "pendingBusiness", label: "업체 승인", href: "/admin/business" },
  { key: "pendingOrg", label: "단체 승인", href: "/admin/orgs" },
  { key: "newTips", label: "신규 제보", href: "/admin/tips" },
  { key: "pendingReports", label: "미처리 신고", href: "/admin/reports" },
  { key: "pendingCorrections", label: "정정보도", href: "/admin/corrections" },
];

export default async function AdminDashboard() {
  const [stats, counts, articles, boards] = await Promise.all([
    getAdminStats(),
    getAdminQueueCounts(),
    getArticleStatsList(5),
    getBoardStatsList(5),
  ]);
  const todo = QUEUE.filter((q) => counts[q.key] > 0);
  const todoTotal = QUEUE.reduce((s, q) => s + counts[q.key], 0);

  return (
    <div className="px-[18px] py-5">
      <PageHead title="대시보드" sub="한눈에 보는 현황" />

      {/* 처리할 일 */}
      <section className="mb-6 rounded-card border border-line bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-rose-deep">처리할 일</h2>
          <span className="text-xs text-muted">합계 {todoTotal}건</span>
        </div>
        {todo.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted">
            대기 중인 항목이 없습니다 ✨
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {todo.map((q) => (
              <Link
                key={q.key}
                href={q.href}
                className="flex items-center gap-1.5 rounded-element border border-line px-3 py-2 text-sm"
              >
                {q.label}
                <span className="rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">
                  {counts[q.key]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.key}
            className="rounded-card border border-line bg-white p-4 text-center"
          >
            <div className="text-2xl font-extrabold text-rose-deep">
              {s.value.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 인기 콘텐츠 */}
      <section className="mt-7 grid gap-6 lg:grid-cols-2">
        <Popular
          title="인기 기사"
          href="/admin/analytics"
          rows={articles.map((a) => ({
            id: a.id,
            title: a.title,
            sub: `조회 ${a.views} · 💬${a.comments} · 👍${a.reactions}`,
          }))}
        />
        <Popular
          title="인기 게시글"
          href="/admin/board"
          rows={boards.map((b) => ({
            id: b.id,
            title: b.title,
            sub: `조회 ${b.views} · 💬${b.comments} · 👍${b.reactions}`,
          }))}
        />
      </section>
    </div>
  );
}

function Popular({
  title,
  href,
  rows,
}: {
  title: string;
  href: string;
  rows: { id: string; title: string; sub: string }[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base text-rose-deep">{title}</h2>
        <Link href={href} className="text-xs text-rose">
          더보기 ›
        </Link>
      </div>
      <ul className="overflow-hidden rounded-card border border-line bg-white">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5 first:border-t-0"
          >
            <span className="w-4 text-center text-xs font-bold text-rose">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{r.title}</p>
              <p className="text-[11px] text-muted">{r.sub}</p>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">
            데이터가 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
