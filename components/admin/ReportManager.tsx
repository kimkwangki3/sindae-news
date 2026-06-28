"use client";

import { useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import { resolveReport } from "@/lib/admin-actions";
import type { AdminReportRow } from "@/lib/mock/admin-types";

// 신고 관리 — 통합 신고 목록. 처리완료로 전환(낙관적).
export default function ReportManager({
  initial,
}: {
  initial: AdminReportRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();

  const pending = rows.filter((r) => r.status === "pending").length;

  function resolve(id: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)),
    );
    startTransition(() => resolveReport(id));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title="신고 관리" sub={`미처리 ${pending}건`} />

      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Pill tone="muted">{r.targetType}</Pill>
                <span className="text-sm font-bold">{r.reason}</span>
              </div>
              {r.status === "pending" ? (
                <Pill tone="warn">미처리</Pill>
              ) : (
                <Pill tone="ok">처리됨</Pill>
              )}
            </div>
            <p className="mt-2 truncate text-[13px] text-ink">
              {r.targetLabel}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              신고자 {r.reporter} · {r.createdAt}
            </p>

            {r.status === "pending" && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => resolve(r.id)}
                  className="min-h-[44px] rounded-element bg-rose-deep px-4 text-xs font-bold text-white"
                >
                  처리완료
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
