"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_TABS } from "@/lib/nav";

// 하단 고정 탭바. 활성 탭은 rose-deep + 굵게. 터치 타깃 44px+.
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex justify-around border-t border-line bg-white pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
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
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-1 text-[10px] ${
              active ? "font-bold text-rose-deep" : "text-muted"
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
