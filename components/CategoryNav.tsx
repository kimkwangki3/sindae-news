"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_LINKS } from "@/lib/nav";

// 가로 스크롤 카테고리 바. 활성 항목 하단 보더 강조.
export default function CategoryNav() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex gap-5 overflow-x-auto border-b border-line px-[18px] py-3 text-sm">
      {CATEGORY_LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap pb-1 ${
              active
                ? "border-b-2 border-rose font-bold text-rose-deep"
                : "text-muted"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
