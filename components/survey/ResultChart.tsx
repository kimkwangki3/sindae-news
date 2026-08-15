import { SURVEY_DISCLAIMER, type SurveyResults } from "@/lib/surveys";

// 설문 결과 막대그래프 — 설문 상세와 결과 기사가 함께 쓴다.
//
// 왜 SVG인가.
// 막대 길이는 데이터마다 달라서 Tailwind 클래스로 만들 수 없다(`w-[42.3%]`처럼
// 조립하면 빌드할 때 클래스가 사라진다). 이 저장소는 인라인 스타일을 금지하므로
// style 로 폭을 주는 길도 막혀 있다. SVG는 폭을 CSS가 아니라 도형의 속성으로
// 준다 — 금지 규칙을 지키면서 자바스크립트 없이 서버에서 완성된다.
//
// viewBox를 일부러 쓰지 않는다. viewBox를 걸고 늘리면 좌표계가 함께 늘어나
// 둥근 끝이 타원으로 찌그러진다. 대신 rect 의 width 에 백분율을 직접 줘서
// 브라우저가 실제 폭에 맞춰 계산하게 한다.
//
// 글자는 SVG 밖 HTML 이다. 그래야 본문과 같은 서체·크기로 읽히고, 화면
// 읽기 프로그램이 숫자를 그대로 읽어 준다(그래프 자체는 aria-hidden).
//
// 색을 순위에 따라 바꾸지 않는다. 색은 '무엇인지'를 나타내야지 '몇 등인지'를
// 나타내면 안 된다. 1위는 글자 굵기로만 구분한다.

function pct(n: number): string {
  // 소수 한 자리. 정수면 소수점을 떼서 "40%"로 읽히게 한다.
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}

function Bar({ ratio, lead }: { ratio: number; lead: boolean }) {
  return (
    <svg
      width="100%"
      height="12"
      aria-hidden
      className="mt-1.5 block overflow-hidden rounded-full"
    >
      <rect width="100%" height="12" rx="6" className="fill-line" />
      {ratio > 0 && (
        <rect
          width={`${ratio}%`}
          height="12"
          rx="6"
          className={lead ? "fill-rose-deep" : "fill-rose"}
        />
      )}
    </svg>
  );
}

export default function ResultChart({
  results,
  myOptionId,
  showStatus = true,
  className = "",
}: {
  results: SurveyResults;
  myOptionId?: string; // 내가 고른 보기 — 표시만 한다
  // 기사에 실린 그래프는 '그때 뜬 집계'라 지금의 진행 상태를 말하면 안 된다.
  // 기사 쪽에서 이 값을 끄고 집계 시점을 따로 적는다.
  showStatus?: boolean;
  className?: string;
}) {
  const top = Math.max(...results.options.map((o) => o.count), 0);

  return (
    <section className={`flex flex-col gap-1 ${className}`}>
      <p className="text-[18px] font-bold">
        참여 {results.totalVotes.toLocaleString()}명
        {showStatus && results.status === "closed" && (
          <span className="ml-1.5 text-[16px] font-normal text-muted">
            · 조사 종료
          </span>
        )}
      </p>

      {results.totalVotes === 0 ? (
        <p className="py-6 text-center text-[18px] text-muted">
          아직 참여한 주민이 없습니다
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3.5">
          {results.options.map((o) => {
            // 동률이면 둘 다 굵게 둔다. 임의로 하나를 고르면 없는 순위를
            // 만들어 내는 셈이 된다.
            const lead = o.count > 0 && o.count === top;
            return (
              <li key={o.id}>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`min-w-0 flex-1 text-[19px] ${lead ? "font-bold" : ""}`}
                  >
                    {o.label}
                    {myOptionId === o.id && (
                      <span className="ml-1.5 rounded-full bg-rose-soft px-2 py-0.5 text-[15px] font-bold text-rose-deep">
                        내 선택
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex-shrink-0 text-[19px] tabular-nums ${
                      lead ? "font-bold" : ""
                    }`}
                  >
                    {pct(o.ratio)}
                    <span className="ml-1 text-[16px] font-normal text-muted">
                      {o.count.toLocaleString()}명
                    </span>
                  </span>
                </div>
                <Bar ratio={o.ratio} lead={lead} />
              </li>
            );
          })}
        </ul>
      )}

      {/* 법이 요구하는 표기. 관리자가 지울 수 없도록 문단이 아니라 여기에 둔다.
          이 조사는 표본을 설계해 뽑은 것이 아니라 홈페이지에 온 사람이 스스로
          응답한 것이다. 그 사실을 결과와 떼어놓지 않는 것이 매체의 의무다. */}
      <p className="mt-4 border-t border-line pt-3 text-[16px] leading-relaxed text-muted">
        ※ {SURVEY_DISCLAIMER}
      </p>
    </section>
  );
}
