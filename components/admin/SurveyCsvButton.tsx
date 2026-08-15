"use client";

import type { CrossTab } from "@/lib/mock/admin-surveys";
import type { SurveyResults } from "@/lib/surveys";

// 집계 CSV 내보내기.
//
// 개별 응답은 내보내지 않는다. user_id 도, ip 해시도, 한 사람이 무엇을
// 골랐는지도 파일에 담기지 않는다. 참여자가 적은 조사에서 그런 파일이 한 번
// 새어 나가면 누가 무엇에 답했는지가 드러난다. 기사에 필요한 것은 합계다.
export default function SurveyCsvButton({
  results,
  cross,
}: {
  results: SurveyResults;
  cross: CrossTab[];
}) {
  function download() {
    const q = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const lines: string[] = [
      [q(results.title), q(`참여 ${results.totalVotes}명`)].join(","),
      "",
      ["보기", "응답 수", "비율(%)"].map(q).join(","),
      ...results.options.map((o) =>
        [o.label, o.count, o.ratio].map(q).join(","),
      ),
    ];

    for (const tab of cross) {
      lines.push("", q(tab.label));
      lines.push(["구분", ...tab.columns, "합계"].map(q).join(","));
      for (const r of tab.rows) {
        lines.push([r.label, ...r.counts, r.total].map(q).join(","));
      }
    }

    // 맨 앞의 BOM 이 없으면 엑셀이 한글을 깨뜨린다.
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `설문_${results.title.slice(0, 20)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="min-h-[40px] rounded-element border border-line bg-white px-3 text-xs font-bold text-muted"
    >
      집계 CSV
    </button>
  );
}
