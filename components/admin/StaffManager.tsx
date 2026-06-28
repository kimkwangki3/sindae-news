"use client";

import { useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import { setMemberRole } from "@/lib/admin-actions";
import type { AdminMemberRow } from "@/lib/mock/admin-types";

// 관리자(운영진) 목록 — 관리자 해제(→일반회원). 최고관리자는 변경 불가.
// ※ 새 관리자 임명은 회원 관리에서 등급을 '관리자'로 변경하면 됩니다.
export default function StaffManager({
  initial,
}: {
  initial: AdminMemberRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();

  function demote(id: string) {
    if (!confirm("이 관리자를 일반회원으로 변경할까요?")) return;
    setRows((p) => p.filter((m) => m.id !== id));
    startTransition(() => setMemberRole(id, "user"));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title="관리자·권한" sub={`운영진 ${rows.length}명`} />

      <p className="mb-3 rounded-card border border-line bg-white p-3 text-[12px] leading-relaxed text-muted">
        새 관리자 임명은 <b className="text-rose-deep">회원 관리</b>에서 해당
        회원의 등급을 ‘관리자’로 변경하세요. 여기서는 현재 운영진 확인·해제만
        합니다.
      </p>

      <ul className="flex flex-col gap-2">
        {rows.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-card border border-line bg-white p-3.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold">{m.nickname}</span>
                <Pill tone={m.role === "superadmin" ? "warn" : "ok"}>
                  {m.role === "superadmin" ? "최고관리자" : "관리자"}
                </Pill>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">가입 {m.joinedAt}</p>
            </div>
            {m.role !== "superadmin" && (
              <button
                type="button"
                onClick={() => demote(m.id)}
                className="min-h-[40px] rounded-element border border-line px-3 text-xs text-rose-deep"
              >
                관리자 해제
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
