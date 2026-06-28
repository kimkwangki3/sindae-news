"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PageHead, Pill } from "@/components/admin/ui";
import { setEntityStatus, deleteEntity } from "@/lib/admin-content-actions";
import type {
  AdminEntityRow,
  ApprovalKind,
  ApprovalStatus,
} from "@/lib/mock/admin-types";

const TITLE: Record<ApprovalKind, string> = {
  business: "상권/업체 관리",
  org: "지역단체 관리",
};
const VIEW_BASE: Record<ApprovalKind, string> = {
  business: "/district",
  org: "/orgs",
};
const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "승인대기",
  approved: "승인",
  rejected: "거절",
};
type Filter = "all" | ApprovalStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "승인대기" },
  { key: "approved", label: "승인" },
  { key: "rejected", label: "거절" },
];

export default function ApprovalManager({
  kind,
  initial,
}: {
  kind: ApprovalKind;
  initial: AdminEntityRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  const shown =
    filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pending = rows.filter((r) => r.status === "pending").length;

  function decide(id: string, status: ApprovalStatus) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(() => setEntityStatus(kind, id, status));
  }
  function remove(id: string) {
    if (!confirm("삭제할까요? 연결된 데이터도 함께 사라집니다.")) return;
    setRows((p) => p.filter((r) => r.id !== id));
    startTransition(() => deleteEntity(kind, id));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title={TITLE[kind]}
        sub={`총 ${rows.length}건 · 승인대기 ${pending}`}
      />

      <div className="mb-3 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`min-h-[36px] rounded-full border px-3 text-sm ${
              filter === f.key
                ? "border-rose bg-rose text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {shown.map((r) => (
          <li
            key={r.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">{r.name}</span>
                  <span className="text-[11px] text-muted">{r.category}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  {r.sub} · {r.createdAt}
                </p>
              </div>
              <Pill
                tone={
                  r.status === "approved"
                    ? "ok"
                    : r.status === "pending"
                      ? "warn"
                      : "muted"
                }
              >
                {STATUS_LABEL[r.status]}
              </Pill>
            </div>

            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              {r.status === "approved" && (
                <Link
                  href={`${VIEW_BASE[kind]}/${r.id}`}
                  className="min-h-[36px] rounded-element border border-line px-3 text-xs leading-[34px]"
                >
                  보기
                </Link>
              )}
              {r.status !== "approved" && (
                <button
                  type="button"
                  onClick={() => decide(r.id, "approved")}
                  className="min-h-[36px] rounded-element bg-rose-deep px-3 text-xs font-bold text-white"
                >
                  승인
                </button>
              )}
              {r.status !== "rejected" && (
                <button
                  type="button"
                  onClick={() => decide(r.id, "rejected")}
                  className="min-h-[36px] rounded-element border border-line px-3 text-xs text-muted"
                >
                  거절
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="min-h-[36px] rounded-element border border-line px-3 text-xs text-rose-deep"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            해당하는 항목이 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
