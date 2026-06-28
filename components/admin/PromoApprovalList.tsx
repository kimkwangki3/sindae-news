"use client";

import { useState, useTransition } from "react";
import { Pill } from "@/components/admin/ui";
import { setPromoStatus } from "@/lib/admin-content-actions";
import type { AdminPromoRow } from "@/lib/mock/admin-types";

// 업체 홍보글 승인 대기 — 승인/반려.
export default function PromoApprovalList({
  initial,
}: {
  initial: AdminPromoRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();

  function decide(id: string, status: "approved" | "rejected") {
    setRows((p) => p.filter((r) => r.id !== id));
    startTransition(() => setPromoStatus(id, status));
  }

  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-bold text-rose-deep">
        홍보글 승인 대기 <Pill tone="warn">{rows.length}</Pill>
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-card border border-line bg-white p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{r.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {r.business} · {r.createdAt}
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => decide(r.id, "approved")}
                className="min-h-[36px] rounded-element bg-rose-deep px-3 text-xs font-bold text-white"
              >
                승인
              </button>
              <button
                type="button"
                onClick={() => decide(r.id, "rejected")}
                className="min-h-[36px] rounded-element border border-line px-3 text-xs text-muted"
              >
                반려
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
