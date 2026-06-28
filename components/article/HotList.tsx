"use client";

import { useState } from "react";
import Link from "next/link";
import Thumb from "@/components/Thumb";
import type { HotItem, HotPeriod } from "@/lib/mock/articles-meta";

const TABS: { key: HotPeriod; label: string }[] = [
  { key: "day", label: "일간" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
];

// 핫소식 — 일/주/월 베스트. 기간별 데이터는 서버에서 받아 클라에서 탭 전환.
export default function HotList({
  data,
}: {
  data: Record<HotPeriod, HotItem[]>;
}) {
  const [period, setPeriod] = useState<HotPeriod>("day");
  const items = data[period];

  return (
    <div className="px-[18px] pb-6">
      <div
        role="tablist"
        className="my-3 flex gap-2 rounded-element bg-ivory-2 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={period === t.key}
            onClick={() => setPeriod(t.key)}
            className={`min-h-[40px] flex-1 rounded-[9px] text-sm font-bold ${
              period === t.key ? "bg-white text-rose-deep shadow-sm" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ol className="flex flex-col">
        {items.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/article/${a.slug}`}
              className="flex items-center gap-3.5 border-t border-line py-3.5 first:border-t-0"
            >
              <span
                className={`w-6 flex-shrink-0 text-center text-lg font-extrabold ${
                  a.rank <= 3 ? "text-rose" : "text-muted"
                }`}
              >
                {a.rank}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-[15px] font-bold leading-snug">
                  {a.title}
                </h4>
                <p className="mt-1.5 text-[11px] text-muted">
                  {a.meta} · 조회 {a.views}
                </p>
              </div>
              <Thumb
                src={a.thumbnailUrl}
                alt={a.title}
                className="h-[64px] w-[64px] flex-shrink-0"
              />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
