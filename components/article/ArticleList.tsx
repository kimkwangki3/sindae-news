"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ArticleListItem, {
  type ArticleSummary,
} from "@/components/ArticleListItem";
import { loadMoreArticles } from "@/app/(public)/articles/actions";
import type { CategorySlug } from "@/lib/mock/articles-meta";

// 무한스크롤 기사 목록. 서버 렌더된 첫 페이지를 받고, 센티넬이 보이면 서버 액션으로 추가 로드.
export default function ArticleList({
  category,
  initialItems,
  initialCursor,
}: {
  category: CategorySlug | null;
  initialItems: ArticleSummary[];
  initialCursor: number | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || cursor === null) return;
    setLoading(true);
    try {
      const page = await loadMoreArticles(category, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [category, cursor, loading]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || cursor === null) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, cursor]);

  return (
    <div>
      {items.map((a) => (
        <ArticleListItem key={a.slug} article={a} />
      ))}

      {cursor !== null && (
        <div
          ref={sentinel}
          className="flex justify-center py-6 text-xs text-muted"
        >
          {loading ? "불러오는 중…" : "스크롤하여 더보기"}
        </div>
      )}
      {cursor === null && items.length > 0 && (
        <p className="py-6 text-center text-xs text-muted">
          마지막 기사입니다
        </p>
      )}
      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          아직 등록된 기사가 없습니다
        </p>
      )}
    </div>
  );
}
