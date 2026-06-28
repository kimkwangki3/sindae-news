import Link from "next/link";
import { getAdminStats, getAdminArticles } from "@/lib/mock/admin";
import { PageHead, Pill } from "@/components/admin/ui";

export const metadata = { title: "대시보드 · 관리자" };

export default async function AdminDashboard() {
  const [stats, recentAll] = await Promise.all([
    getAdminStats(),
    getAdminArticles(),
  ]);
  const recent = recentAll.slice(0, 5);

  return (
    <div className="px-[18px] py-5">
      <PageHead title="대시보드" sub="2026년 6월 27일 · 한눈에 보는 현황" />

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

      {/* 최근 기사 */}
      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base text-rose-deep">최근 기사</h2>
          <Link href="/admin/articles" className="text-xs text-rose">
            전체 보기 ›
          </Link>
        </div>
        <ul className="overflow-hidden rounded-card border border-line bg-white">
          {recent.map((a) => (
            <li
              key={a.slug}
              className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {a.category} · {a.date ?? "임시저장"}
                </p>
              </div>
              {a.status === "published" ? (
                <Pill tone="ok">발행</Pill>
              ) : (
                <Pill tone="warn">임시</Pill>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
