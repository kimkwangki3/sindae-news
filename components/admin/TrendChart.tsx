import type { VisitDay } from "@/lib/mock/admin-types";

// 일별 추세 막대. 서버에서 그리는 SVG다.
//
// 대시보드의 7일 그래프는 높이를 Tailwind 클래스 몇 단계로 어림해 그린다
// (인라인 스타일 금지 규칙 때문에). 일곱 칸이면 그걸로 충분하지만 여기는
// 최대 180일이라 어림한 높이로는 추세가 뭉개진다. SVG는 높이를 CSS가 아니라
// 도형 속성으로 주므로 금지 규칙을 지키면서 정확히 그릴 수 있다.
//
// viewBox 를 걸지 않는다. 가로는 백분율(칸 수에 맞춰), 세로는 픽셀로 준다.
// 그래야 화면 폭이 달라져도 막대 높이가 늘어나거나 찌그러지지 않는다.

const H = 132; // 그래프 높이(px)

export default function TrendChart({ days }: { days: VisitDay[] }) {
  const n = days.length || 1;
  const max = Math.max(...days.map((d) => d.views), 1);
  const slot = 100 / n;
  // 칸의 70%만 칠하고 양옆을 비운다. 붙여 그리면 막대가 한 덩어리로 보인다.
  const barW = slot * 0.7;
  const pad = slot * 0.15;

  // 날짜 라벨은 칸이 좁아지면 겹친다. 대략 8개만 남기고 건너뛴다.
  const step = Math.max(1, Math.ceil(n / 8));

  const totalViews = days.reduce((a, d) => a + d.views, 0);
  const busiest = days.reduce((a, d) => (d.views > a.views ? d : a), days[0]);

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-rose-deep">일별 추세</h2>
        <span className="text-xs text-muted">
          {busiest && busiest.views > 0
            ? `가장 많았던 날 ${busiest.label}(${busiest.weekday}) ${busiest.views.toLocaleString()}회`
            : ""}
        </span>
      </div>

      {totalViews === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          이 기간에 기록된 접속이 없습니다
        </p>
      ) : (
        <>
          {/* 막대는 페이지뷰, 그 안의 진한 칸이 방문자다. 둘을 따로 그리면
              그래프가 두 개가 되는데, 같은 날의 두 숫자는 나란히 봐야 뜻이 있다
              (한 사람이 여러 쪽을 봤는지가 바로 보인다). */}
          <svg
            width="100%"
            height={H}
            aria-hidden
            className="mt-2 block overflow-visible"
          >
            {days.map((d, i) => {
              const vh = Math.round((d.views / max) * (H - 2));
              const uh = Math.round((d.visitors / max) * (H - 2));
              return (
                <g key={d.date}>
                  <rect
                    x={`${i * slot + pad}%`}
                    width={`${barW}%`}
                    y={H - vh}
                    height={vh}
                    rx="2"
                    className="fill-rose-soft"
                  />
                  <rect
                    x={`${i * slot + pad}%`}
                    width={`${barW}%`}
                    y={H - uh}
                    height={uh}
                    rx="2"
                    className="fill-rose"
                  />
                </g>
              );
            })}
          </svg>

          <div className="mt-1 flex text-[15px] text-muted">
            {days.map((d, i) => (
              <span
                key={d.date}
                className="min-w-0 flex-1 truncate text-center"
                // 라벨을 다 적으면 겹친다. 건너뛴 칸은 자리만 지킨다.
              >
                {i % step === 0 ? d.label : ""}
              </span>
            ))}
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose" aria-hidden />
              방문자
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-soft" aria-hidden />
              페이지뷰
            </span>
          </p>
        </>
      )}
    </section>
  );
}
