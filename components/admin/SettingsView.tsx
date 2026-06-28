"use client";

import { useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import { setSlotActive } from "@/lib/admin-content-actions";
import type { SlotRow } from "@/lib/mock/admin-types";

export default function SettingsView({
  categories,
  slots,
}: {
  categories: { slug: string; name: string }[];
  slots: SlotRow[];
}) {
  const [rows, setRows] = useState(slots);
  const [, startTransition] = useTransition();

  function toggle(s: SlotRow) {
    const next = !s.isActive;
    setRows((p) => p.map((x) => (x.id === s.id ? { ...x, isActive: next } : x)));
    startTransition(() => setSlotActive(s.id, next));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title="카테고리·광고슬롯" />

      {/* 카테고리(읽기 — 코드 고정) */}
      <h2 className="mb-2 text-sm font-bold text-rose-deep">기사 카테고리</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <span
            key={c.slug}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-sm"
          >
            {c.name}{" "}
            <span className="text-[11px] text-muted">/{c.slug}</span>
          </span>
        ))}
      </div>
      <p className="mb-6 text-[11px] text-muted">
        ※ 카테고리는 기사 데이터와 연결돼 있어 코드로 관리합니다(추가·변경은
        개발 작업).
      </p>

      {/* 광고 슬롯 활성/비활성 */}
      <h2 className="mb-2 text-sm font-bold text-rose-deep">광고 슬롯</h2>
      <ul className="flex flex-col gap-2">
        {rows.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 rounded-card border border-line bg-white p-3.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold">{s.label}</span>
                <Pill tone={s.isActive ? "ok" : "muted"}>
                  {s.isActive ? "사용" : "중지"}
                </Pill>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">/{s.key}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(s)}
              className="min-h-[40px] rounded-element border border-line px-3 text-xs"
            >
              {s.isActive ? "중지" : "사용"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
