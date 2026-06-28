"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { MockComment } from "@/lib/mock/comments";
import { createComment } from "@/app/(public)/articles/actions";

// 댓글 — 로그인 필수(작성). comments insert(서버액션) + 낙관적 추가.
export default function Comments({
  slug,
  initial,
  isLoggedIn,
}: {
  slug: string;
  initial: MockComment[];
  isLoggedIn: boolean;
}) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || pending) return;
    setError(null);

    const tmpId = `tmp-${Date.now()}`;
    setComments((prev) => [
      ...prev,
      { id: tmpId, author: "나", body: text, createdAt: "방금" },
    ]);
    setBody("");

    startTransition(async () => {
      const res = await createComment(slug, text);
      if (res.ok && res.comment) {
        const saved = res.comment;
        setComments((prev) =>
          prev.map((c) => (c.id === tmpId ? saved : c)),
        );
      } else {
        // 실패 시 낙관적 항목 제거 + 오류 표시
        setComments((prev) => prev.filter((c) => c.id !== tmpId));
        setError(res.error ?? "등록에 실패했습니다.");
        setBody(text);
      }
    });
  }

  return (
    <section className="mt-8">
      <h3 className="mb-3 text-base text-rose-deep">
        댓글 <span className="text-rose">{comments.length}</span>
      </h3>

      <ul className="flex flex-col gap-4">
        {comments.map((c) => (
          <li key={c.id} className="border-t border-line pt-4 first:border-t-0">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold">{c.author}</span>
              <span className="text-[11px] text-muted">{c.createdAt}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed">{c.body}</p>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            첫 댓글을 남겨보세요
          </li>
        )}
      </ul>

      {isLoggedIn ? (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="따뜻한 댓글을 남겨주세요"
            className="w-full resize-none rounded-element border border-line bg-white p-3 text-sm outline-none focus:border-rose"
          />
          {error && <p className="text-xs text-rose-deep">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="min-h-[44px] self-end rounded-element bg-rose-deep px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "등록 중…" : "등록"}
          </button>
        </form>
      ) : (
        <div className="mt-5 flex items-center justify-between rounded-element border border-line bg-white p-4 text-sm text-muted">
          <span>댓글은 로그인 후 작성할 수 있어요</span>
          <Link href="/login" className="font-bold text-rose-deep">
            로그인 ›
          </Link>
        </div>
      )}
    </section>
  );
}
