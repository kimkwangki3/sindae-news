import Link from "next/link";
import { notFound } from "next/navigation";
import SurveyCsvButton from "@/components/admin/SurveyCsvButton";
import { PageHead, Pill } from "@/components/admin/ui";
import CrossTabChart from "@/components/survey/CrossTabChart";
import ResultChart from "@/components/survey/ResultChart";
import { getAdminSurvey, getSurveyBreakdown } from "@/lib/mock/admin-surveys";
import { buildResults } from "@/lib/surveys";

export const metadata = { title: "조사 결과 · 관리자" };
export const dynamic = "force-dynamic";

export default async function SurveyResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const survey = await getAdminSurvey(params.id);
  if (!survey) notFound();

  const { cross, anomalies } = await getSurveyBreakdown(survey);
  const results = buildResults(survey);

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="조사 결과"
        sub={survey.title}
        action={
          <Link href="/admin/surveys" className="text-xs text-muted">
            ‹ 목록
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill
          tone={
            survey.status === "open"
              ? "ok"
              : survey.status === "draft"
                ? "warn"
                : "muted"
          }
        >
          {survey.status === "open"
            ? "진행 중"
            : survey.status === "draft"
              ? "초안"
              : "종료"}
        </Pill>
        <span className="text-xs text-muted">
          {survey.resultVisibility === "after_close"
            ? "마감 후 결과 공개"
            : "결과 바로 공개"}
        </span>
        <span className="ml-auto flex gap-1.5">
          <SurveyCsvButton results={results} cross={cross} />
          {/* 여기가 이 기능의 종착점 — 모인 의견이 기사가 되는 자리 */}
          <Link
            href={`/admin/articles/new?survey=${survey.id}`}
            className="flex min-h-[40px] items-center rounded-element bg-rose-deep px-3 text-xs font-bold text-white"
          >
            결과를 기사 초안으로
          </Link>
        </span>
      </div>

      <div className="rounded-card border border-line bg-white p-4">
        <ResultChart results={results} />
      </div>

      {cross.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {cross.map((tab) => (
            <CrossTabChart key={tab.key} tab={tab} />
          ))}
        </div>
      )}

      {/* 이상 징후. 자동으로 막지 않는다 — 한 집에서 식구들이 각자 답했거나
          같은 사무실에서 참여한 경우가 훨씬 흔하다. 사람이 보고 판단할 자료다. */}
      <section className="mt-3 rounded-card border border-line bg-white p-4">
        <h3 className="text-[18px] font-bold">이상 징후</h3>
        {anomalies.length === 0 ? (
          <p className="mt-1.5 text-[17px] text-muted">
            한 회선에서 세 계정 이상이 참여한 흔적은 없습니다.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-[16px] leading-relaxed text-muted">
              같은 회선에서 여러 계정이 참여했습니다. 가족·직장·공용 와이파이일
              수 있으니 이것만으로 판단하지 마세요. 표를 지우는 기능은 두지
              않았습니다.
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {anomalies.map((a) => (
                <li
                  key={a.hint}
                  className="flex items-center justify-between rounded-element border border-line px-3 py-2 text-[17px]"
                >
                  <span className="font-mono text-[15px] text-muted">
                    {a.hint}…
                  </span>
                  <span>
                    <b>{a.accounts}</b>계정 · {a.votes}표
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        개별 응답은 이 화면에도 CSV에도 나오지 않습니다. 누가 무엇을 골랐는지는
        관리자도 볼 수 없게 해 두었습니다.
      </p>
    </div>
  );
}
