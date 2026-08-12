import type { VisitStats } from "@/lib/mock/admin-types";

// 막대 높이는 Tailwind 클래스로만 낸다(인라인 스타일 금지). 값을 11단계로
// 반올림해 미리 적어 둔 클래스 중 하나를 고른다 — 동적 문자열로 만들면
// Tailwind가 클래스를 못 찾아 높이가 통째로 사라진다.
const BAR_H = [
  "h-[4%]",
  "h-[14%]",
  "h-[24%]",
  "h-[34%]",
  "h-[44%]",
  "h-[54%]",
  "h-[64%]",
  "h-[74%]",
  "h-[84%]",
  "h-[92%]",
  "h-full",
];

function barClass(value: number, max: number): string {
  if (max <= 0) return BAR_H[0];
  return BAR_H[Math.round((value / max) * (BAR_H.length - 1))];
}

// 어제 대비 증감 문구. 어제가 0이면 비율이 의미 없으므로 숫자만 말한다.
function delta(today: number, yesterday: number): string {
  const diff = today - yesterday;
  if (diff === 0) return "어제와 같음";
  const sign = diff > 0 ? "▲" : "▼";
  const rate =
    yesterday > 0 ? ` (${diff > 0 ? "+" : ""}${Math.round((diff / yesterday) * 100)}%)` : "";
  return `어제(${yesterday.toLocaleString()}명)보다 ${sign}${Math.abs(diff).toLocaleString()}명${rate}`;
}

// 대시보드 "오늘 접속" 카드 — 당일 방문자(UV)·페이지뷰(PV)와 최근 7일 추세.
// 방문자는 방문자 쿠키 기준 순 방문자다(같은 사람이 여러 페이지를 봐도 1명).
// updatedAt: 이 숫자를 언제 읽어 온 것인지(한국시간 "18:42"). 화면이 언제
// 것인지 밝혀 두지 않으면 옛 수치를 지금 수치로 착각하게 된다.
export default function VisitCard({
  stats,
  updatedAt,
}: {
  stats: VisitStats;
  updatedAt?: string;
}) {
  const { today, yesterday, days, available } = stats;
  const max = Math.max(...days.map((d) => d.visitors), 1);

  return (
    <section className="mb-6 rounded-card border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-rose-deep">오늘 접속</h2>
        <span className="text-right text-xs text-muted">
          {today.label}({today.weekday}) · 한국시간{" "}
          {updatedAt ? `${updatedAt} 기준` : "기준"}
        </span>
      </div>

      {available ? (
        <>
          <div className="flex items-end gap-6">
            <div>
              <div className="text-3xl font-extrabold text-rose-deep">
                {today.visitors.toLocaleString()}
                <span className="ml-1 text-sm font-bold text-muted">명</span>
              </div>
              <div className="mt-0.5 text-xs text-muted">방문자(순 방문)</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-ink">
                {today.views.toLocaleString()}
                <span className="ml-1 text-xs font-bold text-muted">회</span>
              </div>
              <div className="mt-0.5 text-xs text-muted">페이지뷰</div>
            </div>
          </div>

          <p className="mt-2 text-xs text-muted">
            {delta(today.visitors, yesterday.visitors)}
          </p>

          {/* 최근 7일 방문자 추세 */}
          <div className="mt-4">
            <div className="flex h-20 items-end gap-1.5">
              {days.map((d) => (
                <div
                  key={d.date}
                  className="flex h-full flex-1 flex-col justify-end"
                  title={`${d.label}(${d.weekday}) 방문자 ${d.visitors}명 · 페이지뷰 ${d.views}회`}
                >
                  <div
                    className={`w-full rounded-t-[4px] ${
                      d.date === today.date ? "bg-rose" : "bg-rose-soft"
                    } ${barClass(d.visitors, max)}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1.5">
              {days.map((d) => (
                <span
                  key={d.date}
                  className={`flex-1 text-center text-[15px] ${
                    d.date === today.date
                      ? "font-bold text-rose-deep"
                      : "text-muted"
                  }`}
                >
                  {d.weekday}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="py-3 text-sm text-muted">
          접속 집계가 아직 준비되지 않았습니다. Supabase SQL Editor에서{" "}
          <span className="font-bold text-ink">db/page-views-migration.sql</span>{" "}
          을 실행하면 그때부터 쌓입니다.
        </p>
      )}
    </section>
  );
}
