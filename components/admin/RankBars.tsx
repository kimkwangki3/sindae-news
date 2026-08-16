import type { ReactNode } from "react";

// 순위 막대 목록 — 많이 본 경로, 유입 경로, 시간대에 함께 쓴다.
//
// 막대 하나에 계열이 하나뿐이라 색은 전부 같다. 1위만 색을 바꾸지 않는다 —
// 색은 '무엇인지'를 나타내야지 '몇 등인지'를 나타내면 안 된다. 순위는 이미
// 위에서부터 내려오는 순서가 말해 준다.
//
// 숫자를 막대 옆에 직접 적는다. 눈금이 없어도 읽히고, 색이 안 보이는
// 환경(인쇄·화면읽기)에서도 같은 사실에 닿는다.

export interface RankItem {
  key: string;
  label: ReactNode;
  value: number;
  sub?: string; // 막대 아래 보조 설명
}

export default function RankBars({
  title,
  unit,
  items,
  empty = "기록이 없습니다",
}: {
  title: string;
  unit: string;
  items: RankItem[];
  empty?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <h2 className="text-sm font-bold text-rose-deep">{title}</h2>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-2.5">
          {items.map((it) => (
            <li key={it.key}>
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[17px]">
                  {it.label}
                </span>
                <span className="flex-shrink-0 text-[17px] font-bold tabular-nums">
                  {it.value.toLocaleString()}
                  <span className="ml-0.5 text-[15px] font-normal text-muted">
                    {unit}
                  </span>
                </span>
              </div>
              {/* 폭을 백분율로 준다. viewBox 를 걸지 않아 둥근 끝이
                  찌그러지지 않는다. */}
              <svg
                width="100%"
                height="8"
                aria-hidden
                className="mt-1 block overflow-hidden rounded-full"
              >
                <rect width="100%" height="8" rx="4" className="fill-ivory-2" />
                <rect
                  width={`${(it.value / max) * 100}%`}
                  height="8"
                  rx="4"
                  className="fill-rose"
                />
              </svg>
              {it.sub && (
                <p className="mt-0.5 text-[15px] text-muted">{it.sub}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
