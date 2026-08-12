"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_NAME, type CategorySlug } from "@/lib/mock/articles-meta";

// 기사 목록 상단 칩 — 금일 뉴스 + 전체 + 4개 카테고리.
const CHIPS: { href: string; label: string }[] = [
  { href: "/articles", label: "전체" },
  { href: "/articles/today", label: "금일 뉴스" },
  ...(Object.keys(CATEGORY_NAME) as CategorySlug[]).map((slug) => ({
    href: `/articles/${slug}`,
    label: CATEGORY_NAME[slug],
  })),
];

export default function CategoryChips() {
  const pathname = usePathname();

  return (
    // 가로 스크롤이 아니라 줄바꿈이다. 글자 크기를 키운 뒤로는 칩 여섯 개가
    // 360px 한 줄에 들어가지 않아 마지막 칩이 화면 밖으로 잘렸다. 스크롤은
    // 잘린 게 있다는 걸 알려주지 못한다 — 두 줄로 접어 전부 보이게 한다.
    <div className="flex flex-wrap gap-2 px-[18px] py-3">
      {CHIPS.map((chip) => {
        const active = pathname === chip.href;
        return (
          <Link
            key={chip.href}
            href={chip.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[36px] items-center whitespace-nowrap rounded-full border px-3.5 text-sm ${
              active
                ? "border-rose bg-rose text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
