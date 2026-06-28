"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_TABS } from "@/lib/nav";

// 선형 SVG 아이콘 (href로 매핑). 색은 currentColor라 활성/비활성 텍스트색을 따라간다.
const ICONS: Record<string, JSX.Element> = {
  "/": (
    <>
      <path d="M3 11.2 12 4l9 7.2" />
      <path d="M5.5 9.6V20h13V9.6" />
      <path d="M9.7 20v-5.2h4.6V20" />
    </>
  ),
  "/articles": (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M7.5 8.5h6M7.5 12h9M7.5 15.5h9" />
    </>
  ),
  "/district": (
    <>
      <path d="M4 9.5 5.2 5h13.6L20 9.5" />
      <path d="M4 9.5c0 1.4 1 2.5 2.3 2.5S8.6 10.9 8.6 9.5c0 1.4 1 2.5 2.3 2.5S13.2 10.9 13.2 9.5c0 1.4 1 2.5 2.3 2.5S17.8 10.9 17.8 9.5" />
      <path d="M5.4 12v8h13.2v-8" />
      <path d="M10 20v-4.5h4V20" />
    </>
  ),
  "/orgs": (
    <>
      <path d="M12 3.5 20 8H4l8-4.5Z" />
      <path d="M6 8v8M10 8v8M14 8v8M18 8v8" />
      <path d="M4 20h16" />
    </>
  ),
  "/market": (
    <path d="M12 20.5s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 8.4 3.9 3.9 0 0 1 19 11.1c0 5-7 9.4-7 9.4Z" />
  ),
  "/board": (
    <>
      <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4Z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
};

// 하단 고정 탭바 — 선형 아이콘 + 활성 인디케이터(rose). 터치 타깃 44px+.
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex items-stretch border-t border-line bg-white pb-[max(env(safe-area-inset-bottom),0px)] shadow-[0_-8px_30px_-18px_rgba(60,50,35,0.25)]">
      {BOTTOM_TABS.map((tab) => {
        const active =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1.5 px-1 pb-2.5 pt-3.5 transition-colors lg:hover:bg-ivory-2 ${
              active ? "text-rose-deep" : "text-muted"
            }`}
          >
            {active && (
              <span className="absolute left-1/2 top-0 h-[3px] w-[34px] -translate-x-1/2 rounded-b bg-rose" />
            )}
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {ICONS[tab.href]}
            </svg>
            <span
              className={`text-[12px] tracking-tight ${
                active ? "font-bold" : "font-medium"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
