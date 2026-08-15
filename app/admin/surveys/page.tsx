import Link from "next/link";
import { PageHead, Pill } from "@/components/admin/ui";
import { getAdminSurveys } from "@/lib/mock/admin-surveys";
import { setSurveyStatus } from "@/lib/survey-actions";
import { remainingLabel, type SurveyStatus } from "@/lib/surveys";

export const metadata = { title: "주민 의견 조사 · 관리자" };
export const dynamic = "force-dynamic";

const TONE: Record<SurveyStatus, "ok" | "warn" | "muted"> = {
  open: "ok",
  draft: "warn",
  closed: "muted",
};
const NAME: Record<SurveyStatus, string> = {
  open: "진행 중",
  draft: "초안",
  closed: "종료",
};

export default async function AdminSurveysPage() {
  const surveys = await getAdminSurveys();

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="주민 의견 조사"
        sub="결과는 그래프와 함께 기사로 옮길 수 있습니다"
        action={
          <Link
            href="/admin/surveys/new"
            className="rounded-element bg-rose-deep px-3 py-2 text-xs font-bold text-white"
          >
            + 새 조사
          </Link>
        }
      />

      <ul className="flex flex-col gap-2">
        {surveys.map((s) => (
          <li
            key={s.id}
            className="rounded-card border border-line bg-white p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/admin/surveys/${s.id}/results`}
                className="min-w-0 flex-1"
              >
                <span className="flex items-center gap-1.5">
                  <Pill tone={TONE[s.status]}>{NAME[s.status]}</Pill>
                  {s.status === "open" && remainingLabel(s.endsAt) && (
                    <span className="text-xs text-muted">
                      {remainingLabel(s.endsAt)}
                    </span>
                  )}
                </span>
                <p className="mt-1.5 text-[18px] font-bold leading-snug">
                  {s.title}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  참여 {s.totalVotes.toLocaleString()}명 · /{s.slug}
                </p>
              </Link>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
              {s.status !== "open" && (
                <form
                  action={async () => {
                    "use server";
                    await setSurveyStatus(s.id, "open");
                  }}
                >
                  <button className="min-h-[36px] rounded-element border border-line px-3 text-xs font-bold">
                    진행 시작
                  </button>
                </form>
              )}
              {s.status === "open" && (
                <form
                  action={async () => {
                    "use server";
                    await setSurveyStatus(s.id, "closed");
                  }}
                >
                  <button className="min-h-[36px] rounded-element border border-line px-3 text-xs font-bold text-rose-deep">
                    마감하기
                  </button>
                </form>
              )}
              <Link
                href={`/admin/surveys/${s.id}/edit`}
                className="flex min-h-[36px] items-center rounded-element border border-line px-3 text-xs font-bold text-muted"
              >
                수정
              </Link>
              <Link
                href={`/admin/surveys/${s.id}/results`}
                className="flex min-h-[36px] items-center rounded-element border border-line px-3 text-xs font-bold text-muted"
              >
                결과
              </Link>
              <Link
                href={`/surveys/${s.slug}`}
                className="ml-auto flex min-h-[36px] items-center px-2 text-xs text-muted"
              >
                공개 화면 ›
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {surveys.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">
          아직 만든 조사가 없습니다
        </p>
      )}
    </div>
  );
}
