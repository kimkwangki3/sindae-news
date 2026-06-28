"use client";

import { useState } from "react";
import { PageHead } from "@/components/admin/ui";
import type { ContentStatRow, CategoryTotal } from "@/lib/mock/admin-types";

function downloadCsv(filename: string, rows: ContentStatRow[]) {
  const header = ["제목", "분류", "조회", "댓글", "공감"];
  const lines = rows.map((r) =>
    [r.title, r.category, r.views, r.comments, r.reactions]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\n"); // BOM(엑셀 한글)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatTable({ rows }: { rows: ContentStatRow[] }) {
  return (
    <ul className="overflow-hidden rounded-card border border-line bg-white">
      <li className="flex gap-2 border-b border-line bg-ivory-2 px-3 py-2 text-[11px] font-bold text-muted">
        <span className="flex-1">제목</span>
        <span className="w-12 text-right">조회</span>
        <span className="w-10 text-right">댓글</span>
        <span className="w-10 text-right">공감</span>
      </li>
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex items-center gap-2 border-t border-line px-3 py-2.5 text-sm first:border-t-0"
        >
          <span className="min-w-0 flex-1 truncate">
            <span className="mr-1 text-[10px] text-muted">{r.category}</span>
            {r.title}
          </span>
          <span className="w-12 text-right font-bold">{r.views}</span>
          <span className="w-10 text-right text-muted">{r.comments}</span>
          <span className="w-10 text-right text-muted">{r.reactions}</span>
        </li>
      ))}
      {rows.length === 0 && (
        <li className="px-3 py-8 text-center text-sm text-muted">
          데이터가 없습니다
        </li>
      )}
    </ul>
  );
}

export default function AnalyticsView({
  articles,
  boards,
  categories,
}: {
  articles: ContentStatRow[];
  boards: ContentStatRow[];
  categories: CategoryTotal[];
}) {
  const [tab, setTab] = useState<"article" | "board">("article");
  const rows = tab === "article" ? articles : boards;

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="통계·분석"
        sub="기사·게시글 조회/반응 현황"
        action={
          <button
            type="button"
            onClick={() =>
              downloadCsv(`sindae-${tab}-stats.csv`, rows)
            }
            className="min-h-[40px] rounded-element border border-line px-3 text-xs font-bold text-rose-deep"
          >
            CSV 내보내기
          </button>
        }
      />

      {/* 카테고리별 합계 */}
      <h2 className="mb-2 text-sm font-bold text-rose-deep">카테고리별</h2>
      <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {categories.map((c) => (
          <div
            key={c.category}
            className="rounded-card border border-line bg-white p-3"
          >
            <p className="text-sm font-bold">{c.category}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {c.count}건 · 조회 {c.views.toLocaleString()}
            </p>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="col-span-full py-4 text-center text-sm text-muted">
            발행된 기사가 없습니다
          </p>
        )}
      </div>

      {/* 콘텐츠별 표 */}
      <div className="mb-3 flex gap-2">
        {(["article", "board"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-[36px] rounded-full border px-3.5 text-sm ${
              tab === t
                ? "border-rose bg-rose text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {t === "article" ? "기사" : "게시글"}
          </button>
        ))}
      </div>
      <StatTable rows={rows} />
    </div>
  );
}
