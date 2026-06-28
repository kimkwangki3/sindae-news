"use client";

import { useMemo, useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import { setCommentStatus, deleteComment } from "@/lib/admin-actions";
import type { AdminCommentRow, CommentStatus } from "@/lib/mock/admin-types";

type Filter = "all" | "reported" | "hidden";

// 댓글 관리 — 신고/부적절 댓글 숨김·복구·삭제(낙관적).
export default function CommentManager({
  initial,
}: {
  initial: AdminCommentRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  const reportedCount = rows.filter((r) => r.status === "reported").length;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "reported", label: `신고됨 ${reportedCount}` },
    { key: "hidden", label: "숨김" },
  ];

  const shown = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  function changeStatus(id: string, status: CommentStatus) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    startTransition(() => setCommentStatus(id, status));
  }

  function remove(id: string) {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => deleteComment(id));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="댓글 관리"
        sub="신고·부적절 댓글을 숨기거나 삭제할 수 있어요"
      />

      <div className="mb-3 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`min-h-[36px] rounded-full border px-3.5 text-sm ${
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
        {shown.map((c) => (
          <li
            key={c.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold">{c.author}</span>
              <div className="flex items-center gap-1.5">
                {c.status === "reported" && (
                  <Pill tone="warn">신고 {c.reportCount}</Pill>
                )}
                {c.status === "hidden" && <Pill tone="muted">숨김</Pill>}
                {c.status === "visible" && <Pill tone="ok">노출</Pill>}
              </div>
            </div>
            <p
              className={`mt-1.5 text-sm leading-relaxed ${
                c.status === "reported" ? "text-rose" : ""
              }`}
            >
              {c.body}
            </p>
            <p className="mt-1.5 text-[11px] text-muted">
              {c.articleTitle} · {c.createdAt}
            </p>

            <div className="mt-2 flex justify-end gap-1">
              {c.status === "hidden" ? (
                <button
                  type="button"
                  onClick={() => changeStatus(c.id, "visible")}
                  className="min-h-[44px] px-3 text-xs font-bold text-rose-deep"
                >
                  복구
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => changeStatus(c.id, "hidden")}
                  className="min-h-[44px] px-3 text-xs font-bold text-rose-deep"
                >
                  숨김
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="min-h-[44px] px-3 text-xs font-bold text-rose"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            해당하는 댓글이 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
