"use client";

import { useState, useTransition } from "react";
import { reactArticle } from "@/app/(public)/articles/actions";

// 좋아요/싫어요 — IP당 1회(서버 article_reactions). 낙관적 표시 후 서버 집계로 보정.
export default function ReactionBar({
  slug,
  likeCount,
  dislikeCount,
  initialMine = null,
}: {
  slug: string;
  likeCount: number;
  dislikeCount: number;
  initialMine?: "like" | "dislike" | null;
}) {
  const [mine, setMine] = useState<"like" | "dislike" | null>(initialMine);
  const [likes, setLikes] = useState(likeCount);
  const [dislikes, setDislikes] = useState(dislikeCount);
  const [pending, startTransition] = useTransition();

  function react(type: "like" | "dislike") {
    if (pending) return;
    startTransition(async () => {
      const res = await reactArticle(slug, type);
      setLikes(res.likeCount);
      setDislikes(res.dislikeCount);
      setMine(res.mine);
    });
  }

  const base =
    "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-element border text-sm font-bold transition-colors disabled:opacity-60";

  return (
    <div className="my-6 flex gap-3">
      <button
        type="button"
        onClick={() => react("like")}
        disabled={pending}
        aria-pressed={mine === "like"}
        className={`${base} ${
          mine === "like"
            ? "border-rose bg-rose text-white"
            : "border-line bg-white text-ink"
        }`}
      >
        <span aria-hidden>👍</span> 좋아요 {likes}
      </button>
      <button
        type="button"
        onClick={() => react("dislike")}
        disabled={pending}
        aria-pressed={mine === "dislike"}
        className={`${base} ${
          mine === "dislike"
            ? "border-muted bg-muted text-white"
            : "border-line bg-white text-ink"
        }`}
      >
        <span aria-hidden>👎</span> 싫어요 {dislikes}
      </button>
    </div>
  );
}
