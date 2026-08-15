import type { CrossTab } from "@/lib/mock/admin-surveys";

// 교차표 — 거주 지구별·연령대별로 무엇을 골랐는지.
//
// 여기부터는 계열이 여럿이라 색이 정보를 나른다. 색 목록은 tailwind.config.ts
// 의 chart-1…5 고정 순서를 쓴다. 순서를 섞으면 색맹 구분 검증이 깨진다.
// 색만으로 알아보게 두지 않는다 — 범례를 반드시 함께 내고, 아래 표에 숫자를
// 그대로 적는다(주황은 배경 대비가 낮아 특히 그렇다).
//
// 가로 100% 누적 막대인 이유: 지구마다 참여 인원이 크게 다르다. 절대 수로
// 그리면 사람 많은 지구의 막대만 길어져 "어느 지구가 무엇을 골랐나"라는
// 정작 궁금한 것이 안 보인다. 대신 인원수를 막대 옆에 적어, 3명뿐인 칸을
// 60%라고 읽고 넘어가지 않게 한다.

const FILL = [
  "fill-chart-1",
  "fill-chart-2",
  "fill-chart-3",
  "fill-chart-4",
  "fill-chart-5",
] as const;
const CHIP = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

// 여섯 번째 보기부터는 색을 새로 만들지 않고 돌려 쓴다. 검증되지 않은 색을
// 즉석에서 만드는 것보다 낫다(보기는 6개까지만 허용한다).
const fill = (i: number) => FILL[i % FILL.length];
const chip = (i: number) => CHIP[i % CHIP.length];

function StackedBar({
  counts,
  total,
}: {
  counts: number[];
  total: number;
}) {
  if (total === 0) return null;

  // 누적 시작 위치(백분율). 마지막 칸까지 더해 100이 되게 그대로 쓴다.
  let acc = 0;
  const segs = counts.map((c) => {
    const start = acc;
    const w = (c / total) * 100;
    acc += w;
    return { start, w };
  });

  return (
    <svg width="100%" height="14" aria-hidden className="mt-1 block">
      {segs.map((s, i) =>
        s.w > 0 ? (
          <rect
            key={i}
            x={`${s.start}%`}
            width={`${s.w}%`}
            height="14"
            className={fill(i)}
          />
        ) : null,
      )}
      {/* 칸 사이를 2px 배경색으로 끊는다. 붙여 두면 비슷한 명도의 두 칸이
          한 덩어리로 보인다. */}
      {segs.slice(1).map((s, i) =>
        s.w > 0 ? (
          <rect
            key={`gap-${i}`}
            x={`${s.start}%`}
            width="2"
            height="14"
            className="fill-white"
          />
        ) : null,
      )}
    </svg>
  );
}

export default function CrossTabChart({ tab }: { tab: CrossTab }) {
  if (tab.rows.length === 0) {
    return (
      <section className="rounded-card border border-line bg-white p-4">
        <h3 className="text-[18px] font-bold">{tab.label}</h3>
        <p className="mt-2 text-[17px] text-muted">
          이 항목에 답한 참여자가 아직 없습니다
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <h3 className="text-[18px] font-bold">
        {tab.label}
        <span className="ml-1.5 text-[16px] font-normal text-muted">
          응답 {tab.answered.toLocaleString()}명
        </span>
      </h3>

      {/* 범례 — 색만으로 알아보게 두지 않는다 */}
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {tab.columns.map((c, i) => (
          <li key={c} className="flex items-center gap-1.5 text-[16px]">
            <span className={`h-3 w-3 rounded-sm ${chip(i)}`} aria-hidden />
            {c}
          </li>
        ))}
      </ul>

      <ul className="mt-3 flex flex-col gap-3">
        {tab.rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[18px] font-bold">{r.label}</span>
              <span className="text-[16px] text-muted">
                {r.total.toLocaleString()}명
              </span>
            </div>
            <StackedBar counts={r.counts} total={r.total} />
          </li>
        ))}
      </ul>

      {/* 숫자 표. 그래프가 읽히지 않는 상황(색맹·인쇄·화면읽기)에서도
          같은 사실에 닿을 수 있어야 한다. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-[16px]">
          <caption className="sr-only">{tab.label} 응답 수</caption>
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th scope="col" className="py-1.5 pr-2 font-bold">
                구분
              </th>
              {tab.columns.map((c) => (
                <th key={c} scope="col" className="py-1.5 pr-2 font-bold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tab.rows.map((r) => (
              <tr key={r.label} className="border-b border-line">
                <th scope="row" className="py-1.5 pr-2 text-left font-bold">
                  {r.label}
                </th>
                {r.counts.map((c, i) => (
                  <td key={i} className="py-1.5 pr-2 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
