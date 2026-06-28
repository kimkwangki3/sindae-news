"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PageHead, Pill } from "@/components/admin/ui";
import {
  setPostVisibility,
  togglePostPin,
  deletePost,
  setMarketDone,
} from "@/lib/admin-content-actions";
import type { AdminPostRow, PostKind } from "@/lib/mock/admin-types";

const TITLE: Record<PostKind, string> = {
  board: "자유게시판 관리",
  market: "나눔마켓 관리",
};
const VIEW_BASE: Record<PostKind, string> = {
  board: "/board",
  market: "/market",
};
type Filter = "all" | "hidden" | "pinned";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pinned", label: "고정" },
  { key: "hidden", label: "숨김" },
];

// 게시판/나눔마켓 공용 관리 — 숨김/복구·고정·삭제(+나눔 완료처리). 낙관적.
export default function AdminPostManager({
  kind,
  initial,
}: {
  kind: PostKind;
  initial: AdminPostRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  const shown = rows.filter((r) =>
    filter === "all"
      ? true
      : filter === "hidden"
        ? r.visibility === "hidden"
        : r.pinned,
  );

  function toggleHide(r: AdminPostRow) {
    const next = r.visibility === "hidden" ? "visible" : "hidden";
    setRows((p) =>
      p.map((x) => (x.id === r.id ? { ...x, visibility: next } : x)),
    );
    startTransition(() => setPostVisibility(kind, r.id, next));
  }
  function togglePin(r: AdminPostRow) {
    const next = !r.pinned;
    setRows((p) => p.map((x) => (x.id === r.id ? { ...x, pinned: next } : x)));
    startTransition(() => togglePostPin(kind, r.id, next));
  }
  function remove(id: string) {
    if (!confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setRows((p) => p.filter((x) => x.id !== id));
    startTransition(() => deletePost(kind, id));
  }
  function done(id: string) {
    setRows((p) =>
      p.map((x) => (x.id === id ? { ...x, category: "done" } : x)),
    );
    startTransition(() => setMarketDone(id));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title={TITLE[kind]} sub={`총 ${rows.length}건`} />

      <div className="mb-3 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
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
        {shown.map((r) => (
          <li
            key={r.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {r.pinned && <Pill tone="warn">고정</Pill>}
                  {r.visibility === "hidden" && <Pill tone="muted">숨김</Pill>}
                  <span className="text-[11px] text-muted">{r.category}</span>
                </div>
                <p className="mt-1 truncate text-sm font-bold">{r.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {r.author} · {r.extra} · 💬{r.comments} · {r.createdAt}
                </p>
              </div>
              <Link
                href={`${VIEW_BASE[kind]}/${r.id}`}
                className="flex-shrink-0 text-[11px] text-rose"
              >
                보기 ›
              </Link>
            </div>

            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={() => togglePin(r)}
                className="min-h-[36px] rounded-element border border-line px-2.5 text-xs"
              >
                {r.pinned ? "고정해제" : "고정"}
              </button>
              {kind === "market" && r.category !== "done" && (
                <button
                  type="button"
                  onClick={() => done(r.id)}
                  className="min-h-[36px] rounded-element border border-line px-2.5 text-xs"
                >
                  완료처리
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleHide(r)}
                className="min-h-[36px] rounded-element border border-line px-2.5 text-xs"
              >
                {r.visibility === "hidden" ? "복구" : "숨김"}
              </button>
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="min-h-[36px] rounded-element border border-line px-2.5 text-xs text-rose-deep"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            해당하는 글이 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
