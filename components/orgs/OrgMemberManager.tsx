"use client";

import { useState, useTransition } from "react";
import { decideMember, removeMember } from "@/lib/local-actions";
import type { PendingMember, OrgMember } from "@/lib/mock/orgs";

const ROLE_LABEL: Record<OrgMember["role"], string> = {
  owner: "회장 · 운영진",
  staff: "운영진",
  member: "회원",
};

// 단체 가입 관리 — 운영진이 신청 승인/거절·회원 내보내기(낙관적). 서버액션 fire-and-forget.
export default function OrgMemberManager({
  orgId,
  pending,
  members,
}: {
  orgId: string;
  pending: PendingMember[];
  members: OrgMember[];
}) {
  const [tab, setTab] = useState<"pending" | "members">("pending");
  const [pendingList, setPendingList] = useState(pending);
  const [memberList, setMemberList] = useState(members);
  const [, startTransition] = useTransition();

  function decide(id: string, decision: "approved" | "rejected") {
    const applicant = pendingList.find((p) => p.id === id);
    setPendingList((prev) => prev.filter((p) => p.id !== id));
    if (decision === "approved" && applicant) {
      setMemberList((prev) => [
        ...prev,
        { id: applicant.id, name: applicant.name, role: "member" },
      ]);
    }
    startTransition(() => decideMember(orgId, id, decision));
  }

  function kick(id: string) {
    if (!confirm("이 회원을 내보낼까요?")) return;
    setMemberList((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => removeMember(orgId, id));
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <TabButton
          active={tab === "pending"}
          onClick={() => setTab("pending")}
          label={`신청 ${pendingList.length}`}
        />
        <TabButton
          active={tab === "members"}
          onClick={() => setTab("members")}
          label={`회원 ${memberList.length}`}
        />
      </div>

      {tab === "pending" ? (
        <ul className="flex flex-col gap-2.5">
          {pendingList.map((p) => (
            <li
              key={p.id}
              className="rounded-card border border-line bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-rose" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {p.name} · {p.neighborhood}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    동기: {p.motivation}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => decide(p.id, "approved")}
                  className="min-h-[44px] flex-1 rounded-element bg-rose-deep text-sm font-bold text-white"
                >
                  승인
                </button>
                <button
                  type="button"
                  onClick={() => decide(p.id, "rejected")}
                  className="min-h-[44px] flex-1 rounded-element border border-line text-sm font-bold text-muted"
                >
                  거절
                </button>
              </div>
            </li>
          ))}
          {pendingList.length === 0 && (
            <li className="py-8 text-center text-sm text-muted">
              대기 중인 가입 신청이 없습니다
            </li>
          )}
        </ul>
      ) : (
        <ul className="overflow-hidden rounded-card border border-line bg-white">
          {memberList.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0"
            >
              <div className="h-9 w-9 flex-shrink-0 rounded-full bg-rose" />
              <div className="flex-1">
                <p className="text-sm font-bold">{m.name}</p>
                <p className="text-[11px] text-muted">{ROLE_LABEL[m.role]}</p>
              </div>
              {m.role !== "owner" && (
                <button
                  type="button"
                  onClick={() => kick(m.id)}
                  className="min-h-[44px] px-2 text-xs font-bold text-rose"
                >
                  내보내기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] rounded-full border px-3.5 text-sm ${
        active
          ? "border-rose bg-rose text-white"
          : "border-line bg-white text-muted"
      }`}
    >
      {label}
    </button>
  );
}
