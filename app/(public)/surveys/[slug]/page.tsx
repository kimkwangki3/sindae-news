import Link from "next/link";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import ResultChart from "@/components/survey/ResultChart";
import VoteForm from "@/components/survey/VoteForm";
import { getCurrentUser } from "@/lib/auth";
import {
  getMyVote,
  getSurveyBySlug,
  getSurveyResults,
} from "@/lib/mock/surveys";
import { remainingLabel } from "@/lib/surveys";

// 참여 수·결과가 매번 달라진다.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const s = await getSurveyBySlug(params.slug);
  if (!s) return {};
  const desc = `해룡신문 주민 의견 조사 · 참여 ${s.totalVotes}명`;
  return {
    title: `${s.title} · 해룡신문`,
    description: s.description ?? desc,
    alternates: { canonical: `/surveys/${s.slug}` },
    openGraph: {
      title: s.title,
      description: desc,
      url: `/surveys/${s.slug}`,
    },
  };
}

export default async function SurveyDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const survey = await getSurveyBySlug(params.slug);
  if (!survey) notFound();

  const [user, mine, results] = await Promise.all([
    getCurrentUser(),
    getMyVote(survey.id),
    // 아직 가려둘 설문이면 DB가 집계를 주지 않는다(null). 화면에서 감추는 게
    // 아니라 애초에 받아오지 못한다 — API를 직접 불러도 마찬가지다.
    getSurveyResults(survey.id),
  ]);

  const open = survey.status === "open";
  const left = remainingLabel(survey.endsAt);
  const canVote = open && !!user && !mine.voted;

  return (
    <article className="px-[18px] py-5">
      <Link href="/surveys" className="text-[16px] text-muted">
        ‹ 주민 의견 조사
      </Link>

      <header className="mt-2">
        <span className="flex items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[15px] font-bold ${
              open ? "bg-rose-soft text-rose-deep" : "bg-line text-muted"
            }`}
          >
            {open ? "진행 중" : "종료"}
          </span>
          {open && left && <span className="text-[16px] text-muted">{left}</span>}
          <span className="text-[16px] text-muted">
            · 참여 {survey.totalVotes.toLocaleString()}명
          </span>
        </span>
        <h1 className="mt-2 text-[26px] font-extrabold leading-snug">
          {survey.title}
        </h1>
        {survey.description && (
          <p className="mt-2 whitespace-pre-line break-words text-[19px] leading-[1.8]">
            {survey.description}
          </p>
        )}
      </header>

      <div className="mt-5 border-t border-line pt-5">
        {canVote && (
          <VoteForm
            slug={survey.slug}
            options={survey.options}
            collectDistrict={survey.collectDistrict}
            collectAgeBand={survey.collectAgeBand}
          />
        )}

        {open && !user && (
          <div className="flex flex-col gap-2.5 rounded-card border border-line bg-white p-4">
            <p className="text-[19px] font-bold">
              참여하시려면 로그인이 필요합니다
            </p>
            <p className="text-[17px] leading-relaxed text-muted">
              한 계정당 한 번만 참여할 수 있도록 하기 위해서입니다. 결과는
              로그인하지 않아도 보실 수 있습니다.
            </p>
            <Link
              href="/login"
              className="flex min-h-[52px] items-center justify-center rounded-element bg-rose-deep text-[19px] font-bold text-white"
            >
              로그인하고 참여하기
            </Link>
          </div>
        )}

        {open && user && mine.voted && (
          <p className="rounded-element bg-rose-soft px-4 py-3 text-[18px] font-bold text-rose-deep">
            참여해 주셔서 고맙습니다. 결과는 아래에 있습니다.
          </p>
        )}

        {/* 보기 목록 — 결과가 아직 가려진 설문에서는 무엇을 묻는지라도 보인다 */}
        {!canVote && !results && (
          <ul className="mt-3 flex flex-col gap-2">
            {survey.options.map((o) => (
              <li
                key={o.id}
                className="rounded-element border border-line bg-white px-3.5 py-3 text-[19px]"
              >
                {o.label}
              </li>
            ))}
          </ul>
        )}

        {results ? (
          <ResultChart
            results={results}
            myOptionId={mine.optionId}
            className="mt-6"
          />
        ) : (
          <p className="mt-6 border-t border-line pt-4 text-[17px] leading-relaxed text-muted">
            이 조사의 결과는 마감 후에 공개됩니다. 앞선 응답이 뒤에 참여하는
            분의 판단에 영향을 주지 않도록 하기 위해서입니다.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <ShareButton
          title={survey.title}
          text="해룡신문 주민 의견 조사"
          label="이웃에게 알리기"
        />
      </div>

      {/* 댓글을 붙이지 않는다.
          설문은 의견을 세는 자리고, 그 옆에 말싸움이 붙으면 숫자의 신뢰가
          함께 깎인다. 기능을 꺼두는 게 아니라 아예 넣지 않는다. */}
    </article>
  );
}
