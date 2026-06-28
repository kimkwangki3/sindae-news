import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  canWriteArticle,
  articleStatusOnSubmit,
  REPORTER_LEVEL_LABEL,
} from "@/lib/permissions";
import {
  getReporterSummary,
  getMyArticles,
  ARTICLE_STATUS_LABEL,
} from "@/lib/mock/reporter";

export const metadata = { title: "기자 대시보드 · 신대신문" };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-white p-3 text-center">
      <p className="text-xl font-extrabold text-rose-deep">
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}

export default async function ReporterDashboard() {
  const user = await getCurrentUser();
  if (!user) return null;

  const writeAllowed = canWriteArticle(user);
  const isApplicant =
    user.role === "reporter" && user.reporter_level === "applicant";
  const [summary, recent] = await Promise.all([
    getReporterSummary(user.id),
    getMyArticles(user.id),
  ]);
  const levelLabel =
    user.role === "reporter" && user.reporter_level
      ? REPORTER_LEVEL_LABEL[user.reporter_level]
      : user.role === "admin" || user.role === "superadmin"
        ? "관리자"
        : "기자";
  const publishMode =
    writeAllowed && articleStatusOnSubmit(user) === "published"
      ? "작성 즉시 발행됩니다"
      : "작성 후 관리자 승인을 거쳐 발행됩니다";

  return (
    <div className="px-[18px] py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl text-rose-deep">{user.nickname} 기자</h1>
          <p className="mt-0.5 text-xs text-muted">
            <span className="font-bold">{levelLabel}</span> ·{" "}
            {writeAllowed ? publishMode : "작성 권한 대기 중"}
          </p>
        </div>
        {writeAllowed && (
          <Link
            href="/reporter/write"
            className="flex min-h-[44px] items-center rounded-element bg-rose-deep px-4 text-sm font-bold text-white"
          >
            ＋ 기사 작성
          </Link>
        )}
      </div>

      {isApplicant && (
        <div className="mb-4 rounded-card border border-line bg-white p-4 text-sm leading-relaxed text-muted">
          🕓 기자 신청이 접수되어 <b className="text-rose-deep">승인 대기</b>{" "}
          중입니다. 관리자 승인(준기자/정기자) 후 기사 작성이 가능합니다.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="발행" value={summary.published} />
        <StatCard label="승인대기" value={summary.pending} />
        <StatCard label="임시저장" value={summary.draft} />
        <StatCard label="총 조회" value={summary.views} />
        <StatCard label="총 좋아요" value={summary.likes} />
        <StatCard label="총 댓글" value={summary.comments} />
      </div>

      <div className="mb-3 mt-7 flex items-center justify-between">
        <h2 className="text-base text-rose-deep">최근 내 기사</h2>
        <Link href="/reporter/articles" className="text-xs text-rose">
          전체보기 ›
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {recent.slice(0, 5).map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-card border border-line bg-white p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{a.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {ARTICLE_STATUS_LABEL[a.status]} · 조회 {a.views} · 댓글{" "}
                {a.comments}
              </p>
            </div>
            <Link
              href={`/reporter/articles/${a.id}/stats`}
              className="flex-shrink-0 text-[11px] text-rose"
            >
              통계 ›
            </Link>
          </li>
        ))}
        {recent.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            아직 작성한 기사가 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
