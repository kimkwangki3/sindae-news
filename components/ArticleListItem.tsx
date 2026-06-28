import Link from "next/link";
import Thumb from "./Thumb";

export interface ArticleSummary {
  slug: string;
  category: string;
  title: string;
  meta: string; // "지역소식 · 2026.06.25"
  thumbnailUrl?: string | null;
}

// 기사 목록 한 줄: 썸네일 + 카테고리/제목/메타.
export default function ArticleListItem({ article }: { article: ArticleSummary }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="flex gap-3.5 border-t border-line py-3.5"
    >
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-bold text-rose">
          {article.category}
        </span>
        <h4 className="mt-1 line-clamp-2 text-base font-bold leading-snug">
          {article.title}
        </h4>
        <p className="mt-2 text-[11px] text-muted">{article.meta}</p>
      </div>
      <Thumb
        src={article.thumbnailUrl}
        alt={article.title}
        className="h-[84px] w-[84px] flex-shrink-0"
      />
    </Link>
  );
}
