"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import ReportSheet from "@/components/ReportSheet";
import CommentItem from "@/components/CommentItem";
import type { PostComment } from "@/lib/mock/community";
import type { ReportTarget } from "@/lib/report";
import {
  createMarketComment,
  createBoardComment,
  editMarketComment,
  deleteMarketComment,
  editBoardComment,
  deleteBoardComment,
} from "@/lib/community-actions";

// 나눔마켓·게시판 공용 댓글. 로그인 필수(작성), 낙관적 추가 + 서버 보정, 댓글별 신고(선택).
export default function PostComments({
  postType,
  postId,
  initial,
  isLoggedIn,
  commentReportType,
}: {
  postType: "market" | "board";
  postId: string;
  initial: PostComment[];
  isLoggedIn: boolean;
  commentReportType?: ReportTarget;
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
      { id: tmpId, author: "나", body: text, createdAt: "방금", mine: true },
    ]);
    setBody("");

    startTransition(async () => {
      const res =
        postType === "market"
          ? await createMarketComment(postId, text)
          : await createBoardComment(postId, text);
      if (res.ok && res.comment) {
        const saved = { ...res.comment, mine: true };
        setComments((prev) => prev.map((c) => (c.id === tmpId ? saved : c)));
      } else {
        setComments((prev) => prev.filter((c) => c.id !== tmpId));
        setError(res.error ?? "등록에 실패했습니다.");
        setBody(text);
      }
    });
  }

  async function handleSave(id: string, text: string) {
    const r =
      postType === "market"
        ? await editMarketComment(id, text)
        : await editBoardComment(id, text);
    if (r.ok)
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, body: text } : c)),
      );
    return r;
  }

  async function handleDelete(id: string) {
    const r =
      postType === "market"
        ? await deleteMarketComment(id)
        : await deleteBoardComment(id);
    if (r.ok) setComments((prev) => prev.filter((c) => c.id !== id));
    return r;
  }

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-base text-rose-deep">
        댓글 <span className="text-rose">{comments.length}</span>
      </h3>

      <ul className="flex flex-col gap-4">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            onSave={handleSave}
            onDelete={handleDelete}
            reportNode={
              commentReportType && !c.id.startsWith("tmp-") ? (
                <ReportSheet
                  targetType={commentReportType}
                  targetId={c.id}
                  targetLabel={c.body.slice(0, 20)}
                  triggerClassName="text-[11px] text-muted"
                  triggerLabel="🚩"
                />
              ) : undefined
            }
          />
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
