"use client";

import { useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import {
  setMemberRole,
  setMemberSuspended,
  setReporterLevel,
} from "@/lib/admin-actions";
import type {
  AdminMemberRow,
  AdminRole,
  ReporterLevel,
} from "@/lib/mock/admin-types";

// 등급 변경 가능한 후보(최고관리자는 변경 대상에서 제외).
const ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: "user", label: "일반회원" },
  { value: "reporter", label: "시민기자" },
  { value: "admin", label: "관리자" },
];

const LEVEL_OPTIONS: { value: ReporterLevel; label: string }[] = [
  { value: "applicant", label: "기자신청자" },
  { value: "junior", label: "준기자" },
  { value: "senior", label: "정기자" },
];

const ROLE_LABEL: Record<AdminRole, string> = {
  user: "일반회원",
  reporter: "시민기자",
  admin: "관리자",
  superadmin: "최고관리자",
};

// 회원 관리 — 등급 변경·정지 토글(낙관적).
export default function MemberManager({
  initial,
}: {
  initial: AdminMemberRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();

  function changeRole(id: string, role: AdminRole) {
    setRows((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    startTransition(() => setMemberRole(id, role));
  }

  function changeLevel(id: string, level: ReporterLevel) {
    setRows((prev) =>
      prev.map((m) => (m.id === id ? { ...m, reporterLevel: level } : m)),
    );
    startTransition(() => setReporterLevel(id, level));
  }

  function toggleSuspend(id: string, next: boolean) {
    setRows((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isSuspended: next } : m)),
    );
    startTransition(() => setMemberSuspended(id, next));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title="회원 관리" sub={`총 ${rows.length}명`} />

      <ul className="flex flex-col gap-2.5">
        {rows.map((m) => {
          const isSuper = m.role === "superadmin";
          return (
            <li
              key={m.id}
              className="rounded-card border border-line bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {m.nickname}
                    {m.isSuspended && (
                      <span className="ml-2 align-middle">
                        <Pill tone="muted">정지</Pill>
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {m.neighborhood ? `📍 ${m.neighborhood} · ` : ""}
                    가입 {m.joinedAt}
                  </p>
                </div>
                <Pill tone={m.role === "user" ? "muted" : "ok"}>
                  {ROLE_LABEL[m.role]}
                </Pill>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <label htmlFor={`role-${m.id}`} className="sr-only">
                  등급
                </label>
                <select
                  id={`role-${m.id}`}
                  value={m.role}
                  disabled={isSuper}
                  onChange={(e) =>
                    changeRole(m.id, e.target.value as AdminRole)
                  }
                  className="min-h-[44px] flex-1 rounded-element border border-line bg-white px-3 text-sm outline-none focus:border-rose disabled:opacity-50"
                >
                  {isSuper ? (
                    <option value="superadmin">최고관리자</option>
                  ) : (
                    ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  disabled={isSuper}
                  onClick={() => toggleSuspend(m.id, !m.isSuspended)}
                  className={`min-h-[44px] rounded-element px-4 text-xs font-bold disabled:opacity-50 ${
                    m.isSuspended
                      ? "bg-tag-org-bg text-tag-org-fg"
                      : "border border-line text-rose"
                  }`}
                >
                  {m.isSuspended ? "정지해제" : "정지"}
                </button>
              </div>

              {/* 시민기자일 때만 등급 지정(기자신청자/준기자/정기자) */}
              {m.role === "reporter" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted">
                    기자 등급
                  </span>
                  <select
                    aria-label="기자 등급"
                    value={m.reporterLevel ?? "applicant"}
                    onChange={(e) =>
                      changeLevel(m.id, e.target.value as ReporterLevel)
                    }
                    className="min-h-[40px] flex-1 rounded-element border border-line bg-white px-3 text-sm outline-none focus:border-rose"
                  >
                    {LEVEL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
