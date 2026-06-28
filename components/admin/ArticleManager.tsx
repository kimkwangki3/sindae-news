"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { PageHead, Pill } from "@/components/admin/ui";
import {
  setArticleStatus,
  deleteArticle,
  approveArticle,
  rejectArticle,
} from "@/lib/admin-actions";
import type { AdminArticleRow, ArticleStatus } from "@/lib/mock/admin-types";

type Filter = "all" | ArticleStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "승인대기" },
  { key: "published", label: "발행" },
  { key: "draft", label: "임시저장" },
];

const LEVEL_LABEL: Record<string, string> = {
  applicant: "기자신청자",
  junior: "준기자",
  senior: "정기자",
};

// 기사 관리 — 발행/임시 토글·삭제를 낙관적으로 처리(서버액션 fire-and-forget).
export default function ArticleManager({
  initial,
}: {
  initial: AdminArticleRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !(`${r.title} ${r.author ?? ""}`.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [rows, filter, query]);

  function toggleStatus(slug: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.slug === slug
          ? { ...r, status: r.status === "published" ? "draft" : "published" }
          : r,
      ),
    );
    const next = rows.find((r) => r.slug === slug);
    const target: ArticleStatus =
      next?.status === "published" ? "draft" : "published";
    startTransition(() => setArticleStatus(slug, target));
  }

  function remove(slug: string) {
    if (!confirm("이 기사를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setRows((prev) => prev.filter((r) => r.slug !== slug));
    startTransition(() => deleteArticle(slug));
  }

  function approve(slug: string) {
    setRows((prev) =>
      prev.map((r) => (r.slug === slug ? { ...r, status: "published" } : r)),
    );
    startTransition(() => approveArticle(slug));
  }

  function reject(slug: string) {
    if (!confirm("이 기사를 반려할까요? 작성자의 임시저장으로 되돌아갑니다."))
      return;
    setRows((prev) =>
      prev.map((r) => (r.slug === slug ? { ...r, status: "draft" } : r)),
    );
    startTransition(() => rejectArticle(slug));
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="기사 관리"
        sub={`총 ${rows.length}건${pendingCount ? ` · 승인대기 ${pendingCount}` : ""}`}
        action={
          <Link
            href="/admin/articles/new"
            className="flex min-h-[40px] items-center rounded-element bg-rose-deep px-3.5 text-sm font-bold text-white"
          >
            ＋ 새 기사
          </Link>
        }
      />

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목·기자 검색"
        className="mb-3 min-h-[44px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
      />

      {/* 필터 칩 */}
      <div className="mb-3 flex gap-2">
        {FILTERS.map((f) => (
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

      <ul className="overflow-hidden rounded-card border border-line bg-white">
        {shown.map((a) => (
          <li
            key={a.slug}
            className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{a.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {a.category} · {a.date ?? "임시저장"}
                {a.views !== null && ` · 조회 ${a.views.toLocaleString()}`}
              </p>
              {a.status === "pending" && (
                <p className="mt-0.5 text-[11px] text-muted">
                  기자 {a.author}
                  {a.reporterLevel && ` (${LEVEL_LABEL[a.reporterLevel]})`} ·{" "}
                  {a.pledged ? "✅ 서약" : "⚠️ 서약없음"}
                </p>
              )}
            </div>
            {a.status === "published" ? (
              <Pill tone="ok">발행</Pill>
            ) : a.status === "pending" ? (
              <Pill tone="warn">승인대기</Pill>
            ) : (
              <Pill tone="muted">임시</Pill>
            )}
            <div className="flex flex-shrink-0 items-center gap-1">
              {a.status === "pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => approve(a.slug)}
                    className="min-h-[44px] px-2 text-xs font-bold text-rose-deep"
                  >
                    게시승인
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(a.slug)}
                    className="min-h-[44px] px-2 text-xs font-bold text-muted"
                  >
                    반려
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => toggleStatus(a.slug)}
                    className="min-h-[44px] px-2 text-xs font-bold text-rose-deep"
                  >
                    {a.status === "published" ? "임시전환" : "발행"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a.slug)}
                    className="min-h-[44px] px-2 text-xs font-bold text-rose"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted">
            해당하는 기사가 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
