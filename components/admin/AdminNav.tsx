"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminQueueCounts } from "@/lib/mock/admin";

type BadgeKey = keyof AdminQueueCounts;
interface Item {
  href: string;
  label: string;
  badge?: BadgeKey;
}
interface Group {
  title: string;
  items: Item[];
}

// 명세 3번 IA. 페이지가 추가될 때마다 해당 그룹에 항목을 더한다.
const GROUPS: Group[] = [
  {
    title: "현황",
    items: [{ href: "/admin", label: "대시보드" }],
  },
  {
    title: "보도",
    items: [
      { href: "/admin/articles", label: "기사 관리", badge: "pendingArticles" },
    ],
  },
  {
    title: "커뮤니티",
    items: [
      { href: "/admin/comments", label: "댓글 관리" },
      { href: "/admin/board", label: "자유게시판" },
      { href: "/admin/market", label: "나눔마켓" },
      { href: "/admin/tips", label: "제보함", badge: "newTips" },
      { href: "/admin/reports", label: "신고 관리", badge: "pendingReports" },
    ],
  },
  {
    title: "상권·단체",
    items: [
      { href: "/admin/business", label: "상권/업체", badge: "pendingBusiness" },
      { href: "/admin/orgs", label: "지역단체", badge: "pendingOrg" },
    ],
  },
  {
    title: "광고",
    items: [{ href: "/admin/ads", label: "광고 관리" }],
  },
  {
    title: "사람",
    items: [{ href: "/admin/members", label: "회원 관리" }],
  },
];

// 관리자 네비 — 모바일: 가로 스크롤, lg: 그룹 사이드바. 대기건수 배지.
export default function AdminNav({ counts }: { counts: AdminQueueCounts }) {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:gap-0.5 lg:px-2 lg:pb-4">
      {GROUPS.map((g) => (
        <Fragment key={g.title}>
          <p className="hidden w-full px-3.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-muted lg:block">
            {g.title}
          </p>
          {g.items.map((it) => {
            const active =
              it.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(it.href);
            const count = it.badge ? counts[it.badge] : 0;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-element px-3.5 text-sm font-bold lg:min-h-[44px] ${
                  active ? "bg-rose-soft text-rose-deep" : "text-muted"
                }`}
              >
                {it.label}
                {count > 0 && (
                  <span className="rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}
