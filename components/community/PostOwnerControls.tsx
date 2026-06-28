"use client";

import Link from "next/link";

// 글 작성자 본인에게만 노출되는 수정/삭제 컨트롤.
// deleteAction은 id가 bind된 서버액션(삭제 후 목록으로 redirect).
export default function PostOwnerControls({
  editHref,
  deleteAction,
}: {
  editHref: string;
  deleteAction: () => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={editHref}
        className="rounded-element border border-line px-2.5 py-1 text-xs text-muted"
      >
        수정
      </Link>
      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (!confirm("이 글을 삭제할까요?")) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="rounded-element border border-line px-2.5 py-1 text-xs text-rose-deep"
        >
          삭제
        </button>
      </form>
    </div>
  );
}
