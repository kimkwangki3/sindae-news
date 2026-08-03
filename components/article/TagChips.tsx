import Link from "next/link";
import { tagHref } from "@/lib/tags";

// 기사 태그 칩. 본문 끝에 놓고, 누르면 같은 태그 기사 목록으로 간다.
// 가로 스크롤이 아니라 줄바꿈(wrap)이다 — 태그는 개수가 들쭉날쭉해서
// 가로 스크롤로 두면 뒤쪽 태그가 있는지 알 수 없다.
export default function TagChips({
  tags,
  className = "",
}: {
  tags: string[];
  className?: string;
}) {
  if (tags.length === 0) return null;

  return (
    <nav aria-label="기사 태그" className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={tagHref(tag)}
          className="flex min-h-[36px] items-center rounded-element bg-ivory-2 px-3 text-[18px] text-muted"
        >
          #{tag}
        </Link>
      ))}
    </nav>
  );
}
