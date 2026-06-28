"use client";

import { useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import {
  approveReporterApp,
  rejectReporterApp,
} from "@/lib/admin-content-actions";
import { setReporterLevel } from "@/lib/admin-actions";
import type {
  AdminReporterAppRow,
  AdminReporterRow,
  ReporterLevel,
} from "@/lib/mock/admin-types";

const LEVEL_LABEL: Record<ReporterLevel, string> = {
  applicant: "기자신청자",
  junior: "준기자",
  senior: "정기자",
};
const LEVEL_OPTIONS: ReporterLevel[] = ["applicant", "junior", "senior"];

export default function ReporterAdminManager({
  apps,
  reporters,
}: {
  apps: AdminReporterAppRow[];
  reporters: AdminReporterRow[];
}) {
  const [appRows, setAppRows] = useState(apps);
  const [repRows, setRepRows] = useState(reporters);
  const [, startTransition] = useTransition();

  const pending = appRows.filter((a) => a.status === "pending").length;

  function approve(a: AdminReporterAppRow, level: ReporterLevel) {
    setAppRows((p) =>
      p.map((x) => (x.id === a.id ? { ...x, status: "approved" } : x)),
    );
    startTransition(() => approveReporterApp(a.id, a.userId, level));
  }
  function reject(id: string) {
    setAppRows((p) =>
      p.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)),
    );
    startTransition(() => rejectReporterApp(id));
  }
  function changeLevel(id: string, level: ReporterLevel) {
    setRepRows((p) => p.map((r) => (r.id === id ? { ...r, level } : r)));
    startTransition(() => setReporterLevel(id, level));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title="기자 신청·관리" sub={`신청 대기 ${pending}건`} />

      {/* 신청 대기 */}
      <h2 className="mb-2 text-sm font-bold text-rose-deep">신청</h2>
      <ul className="mb-8 flex flex-col gap-2.5">
        {appRows.map((a) => (
          <li
            key={a.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">{a.name}</span>
              <Pill
                tone={
                  a.status === "approved"
                    ? "ok"
                    : a.status === "pending"
                      ? "warn"
                      : "muted"
                }
              >
                {a.status === "approved"
                  ? "승인"
                  : a.status === "pending"
                    ? "대기"
                    : "반려"}
              </Pill>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {a.neighborhood} · {a.phone} · {a.email}
            </p>
            {a.interests && (
              <p className="mt-0.5 text-[11px] text-muted">관심: {a.interests}</p>
            )}
            <p className="mt-1.5 text-[13px] leading-relaxed">{a.motivation}</p>
            <p className="mt-1 text-[11px] text-muted">
              {a.pledged ? "✅ 책임서약 동의" : "⚠️ 서약 미동의"} · {a.createdAt}
            </p>
            {a.status === "pending" && (
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => approve(a, "junior")}
                  className="min-h-[36px] rounded-element bg-rose-deep px-3 text-xs font-bold text-white"
                >
                  준기자 승인
                </button>
                <button
                  type="button"
                  onClick={() => approve(a, "senior")}
                  className="min-h-[36px] rounded-element border border-rose px-3 text-xs font-bold text-rose-deep"
                >
                  정기자 승인
                </button>
                <button
                  type="button"
                  onClick={() => reject(a.id)}
                  className="min-h-[36px] rounded-element border border-line px-3 text-xs text-muted"
                >
                  반려
                </button>
              </div>
            )}
            {a.status === "approved" && !a.userId && (
              <p className="mt-2 text-[11px] text-rose-deep">
                ⚠️ 연결된 회원 계정이 없어 자동 등급 지정이 안 됐어요. 회원
                관리에서 수동 지정 필요.
              </p>
            )}
          </li>
        ))}
        {appRows.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            기자 신청이 없습니다
          </li>
        )}
      </ul>

      {/* 활동 기자 */}
      <h2 className="mb-2 text-sm font-bold text-rose-deep">활동 기자</h2>
      <ul className="flex flex-col gap-2">
        {repRows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-card border border-line bg-white p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold">{r.nickname}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                기사 {r.articles}건 · 가입 {r.joinedAt}
              </p>
            </div>
            <select
              aria-label="기자 등급"
              value={r.level ?? "applicant"}
              onChange={(e) =>
                changeLevel(r.id, e.target.value as ReporterLevel)
              }
              className="min-h-[40px] rounded-element border border-line bg-white px-2 text-sm outline-none focus:border-rose"
            >
              {LEVEL_OPTIONS.map((lv) => (
                <option key={lv} value={lv}>
                  {LEVEL_LABEL[lv]}
                </option>
              ))}
            </select>
          </li>
        ))}
        {repRows.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            활동 중인 기자가 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
