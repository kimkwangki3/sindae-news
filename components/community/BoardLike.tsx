"use client";

import { useState, useTransition } from "react";
import { toggleBoardLike } from "@/lib/community-actions";

// 게시글 좋아요 — 로그인 1인 1회(토글). board_likes upsert/delete + 서버 집계 보정.
export default function BoardLike({
  postId,
  initialCount,
  isLoggedIn,
  initialLiked = false,
}: {
  postId: string;
  initialCount: number;
  isLoggedIn: boolean;
  initialLiked?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    if (pending) return;
    startTransition(async () => {
      const res = await toggleBoardLike(postId);
      if (!res.error) {
        setLiked(res.liked);
        setCount(res.count);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      className={`flex min-h-[44px] items-center gap-2 rounded-element border px-5 text-sm font-bold disabled:opacity-60 ${
        liked
          ? "border-rose bg-rose text-white"
          : "border-line bg-white text-ink"
      }`}
    >
      <span aria-hidden>{liked ? "❤️" : "🤍"}</span> 좋아요 {count}
    </button>
  );
}
