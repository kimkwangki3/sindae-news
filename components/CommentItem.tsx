"use client";

import { useState, useTransition, type ReactNode } from "react";

// 기사/나눔/게시판 댓글 공통 형태
export interface CommentLike {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  mine?: boolean;
}

// 댓글 한 줄 — 본인(mine) 댓글이면 인라인 수정/삭제 제공.
// 서버 처리는 부모가 onSave/onDelete로 주입(기사/나눔/게시판별 액션이 다름).
export default function CommentItem({
  comment,
  onSave,
  onDelete,
  reportNode,
}: {
  comment: CommentLike;
  onSave: (id: string, body: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
  reportNode?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isTmp = comment.id.startsWith("tmp-");

  function save() {
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const r = await onSave(comment.id, text);
      if (r.ok) setEditing(false);
      else setError(r.error ?? "수정에 실패했습니다.");
    });
  }

  function remove() {
    if (pending) return;
    if (!confirm("이 댓글을 삭제할까요?")) return;
    setError(null);
    startTransition(async () => {
      const r = await onDelete(comment.id);
      if (!r.ok) setError(r.error ?? "삭제에 실패했습니다.");
    });
  }

  return (
    <li className="border-t border-line pt-4 first:border-t-0">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">{comment.author}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">{comment.createdAt}</span>
          {reportNode}
        </div>
      </div>

      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-element border border-line bg-white p-2.5 text-sm outline-none focus:border-rose"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(comment.body);
                setError(null);
              }}
              className="min-h-[36px] rounded-element border border-line px-3 text-xs"
            >
              취소
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="min-h-[36px] rounded-element bg-rose-deep px-3 text-xs font-bold text-white disabled:opacity-50"
            >
              {pending ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-sm leading-relaxed">{comment.body}</p>
      )}

      {error && <p className="mt-1 text-xs text-rose-deep">{error}</p>}

      {comment.mine && !isTmp && !editing && (
        <div className="mt-1.5 flex gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] text-muted underline"
          >
            수정
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-[11px] text-muted underline disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      )}
    </li>
  );
}
