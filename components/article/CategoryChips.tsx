"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_NAME, type CategorySlug } from "@/lib/mock/articles-meta";

// 기사 목록 상단 카테고리 칩 (전체 + 4개 카테고리). 가로 스크롤.
const CHIPS: { href: string; label: string; slug: CategorySlug | null }[] = [
  { href: "/articles", label: "전체", slug: null },
  ...(Object.keys(CATEGORY_NAME) as CategorySlug[]).map((slug) => ({
    href: `/articles/${slug}`,
    label: CATEGORY_NAME[slug],
    slug,
  })),
];

export default function CategoryChips() {
  const pathname = usePathname();

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-[18px] py-3">
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
