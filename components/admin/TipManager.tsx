"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PageHead, Pill } from "@/components/admin/ui";
import { setTipStatus } from "@/lib/admin-content-actions";
import type { AdminTipRow, TipStatus } from "@/lib/mock/admin-types";

const STATUS_LABEL: Record<TipStatus, string> = {
  pending: "신규",
  approved: "처리완료",
  rejected: "반려",
};

// 제보함 — 신규/처리완료/반려, 「기사화」(기사 에디터 프리필).
export default function TipManager({ initial }: { initial: AdminTipRow[] }) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();
  const newCount = rows.filter((r) => r.status === "pending").length;

  function setStatus(id: string, status: TipStatus) {
    setRows((p) => p.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(() => setTipStatus(id, status));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title="제보함" sub={`신규 ${newCount}건`} />

      <ul className="flex flex-col gap-2.5">
        {rows.map((t) => (
          <li
            key={t.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {t.category && (
                  <span className="text-[11px] text-muted">{t.category}</span>
                )}
                <span className="text-sm font-bold">{t.title}</span>
              </div>
              <Pill
                tone={
                  t.status === "pending"
                    ? "warn"
                    : t.status === "approved"
                      ? "ok"
                      : "muted"
                }
              >
                {STATUS_LABEL[t.status]}
              </Pill>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink">
              {t.body}
            </p>
            <p className="mt-1.5 text-[11px] text-muted">
              제보자 {t.reporter} · 연락처 {t.contact} · {t.createdAt}
            </p>

            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              <Link
                href={`/admin/articles/new?title=${encodeURIComponent(
                  t.title,
                )}&body=${encodeURIComponent(t.body)}`}
                onClick={() => setStatus(t.id, "approved")}
                className="min-h-[36px] rounded-element bg-rose-deep px-3 text-xs font-bold leading-[36px] text-white"
              >
                기사화
              </Link>
              {t.status !== "approved" && (
                <button
                  type="button"
                  onClick={() => setStatus(t.id, "approved")}
                  className="min-h-[36px] rounded-element border border-line px-3 text-xs"
                >
                  처리완료
                </button>
              )}
              {t.status !== "rejected" && (
                <button
                  type="button"
                  onClick={() => setStatus(t.id, "rejected")}
                  className="min-h-[36px] rounded-element border border-line px-3 text-xs text-muted"
                >
                  반려
                </button>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            아직 제보가 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
