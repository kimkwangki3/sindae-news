"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string }[] = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/articles", label: "기사 관리" },
  { href: "/admin/comments", label: "댓글 관리" },
  { href: "/admin/reports", label: "신고 관리" },
  { href: "/admin/ads", label: "광고 관리" },
  { href: "/admin/members", label: "회원 관리" },
];

// 관리자 네비 — 모바일: 가로 스크롤 탭, lg: 세로 사이드바 메뉴.
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:gap-0.5 lg:px-2 lg:pb-4">
      {ITEMS.map((it) => {
        const active =
          it.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[40px] items-center whitespace-nowrap rounded-element px-3.5 text-sm font-bold lg:min-h-[44px] ${
              active
                ? "bg-rose-soft text-rose-deep"
                : "text-muted"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
