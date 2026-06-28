"use client";

import { useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import { setCorrectionStatus } from "@/lib/admin-content-actions";
import type { AdminCorrectionRow } from "@/lib/mock/admin-types";

// 정정보도 관리 — 정정 요청 접수 목록을 처리(승인/반려).
export default function CorrectionManager({
  initial,
}: {
  initial: AdminCorrectionRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();
  const pending = rows.filter((r) => r.status === "pending").length;

  function decide(id: string, status: "approved" | "rejected") {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(() => setCorrectionStatus(id, status));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title="정정보도 관리" sub={`미처리 ${pending}건`} />

      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold">
                {r.articleTitle}
              </span>
              <Pill
                tone={
                  r.status === "approved"
                    ? "ok"
                    : r.status === "pending"
                      ? "warn"
                      : "muted"
                }
              >
                {r.status === "approved"
                  ? "처리"
                  : r.status === "pending"
                    ? "접수"
                    : "반려"}
              </Pill>
            </div>
            {r.reason && (
              <p className="mt-1 text-[12px] text-muted">사유: {r.reason}</p>
            )}
            <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">
              {r.body}
            </p>
            <p className="mt-1 text-[11px] text-muted">{r.createdAt}</p>
            {r.status === "pending" && (
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => decide(r.id, "approved")}
                  className="min-h-[36px] rounded-element bg-rose-deep px-3 text-xs font-bold text-white"
                >
                  처리완료
                </button>
                <button
                  type="button"
                  onClick={() => decide(r.id, "rejected")}
                  className="min-h-[36px] rounded-element border border-line px-3 text-xs text-muted"
                >
                  반려
                </button>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            접수된 정정보도 요청이 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
