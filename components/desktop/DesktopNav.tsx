"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_LINKS, DESKTOP_LINKS } from "@/lib/nav";

// PC판 메뉴. 현재 위치는 색으로만 알린다 — 마우스를 올려야 알 수 있는 정보는 없다.
export default function DesktopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="주요 메뉴"
      className="sticky top-0 z-20 hidden border-b border-t-[3px] border-b-ink border-t-ink bg-ivory lg:block"
    >
      <div className="mx-auto flex min-h-[50px] max-w-[1240px] items-center gap-6 px-7 text-[18px]">
        {CATEGORY_LINKS.filter((l) => l.href !== "/info").map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={`flex min-h-[44px] items-center whitespace-nowrap font-display font-bold ${
              isActive(l.href) ? "text-rose-deep" : "text-ink"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <span className="h-4 w-px flex-shrink-0 bg-line" aria-hidden />
        {DESKTOP_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={`flex min-h-[44px] items-center whitespace-nowrap ${
              isActive(l.href) ? "text-rose-deep" : "text-muted"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/search"
          className="ml-auto flex min-h-[44px] items-center text-muted"
        >
          검색
        </Link>
      </div>
    </nav>
  );
}
