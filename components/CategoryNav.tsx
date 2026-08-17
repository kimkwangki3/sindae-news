"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_LINKS } from "@/lib/nav";

// 가로 스크롤 카테고리 바. 활성 항목 하단 보더 강조.
//
// 굵기는 어디서나 같게 두고 색과 밑줄로만 지금 위치를 알린다(하단 탭바와 같은
// 규칙). 글꼴에 굵은 자체가 없어 굵게 쓰면 글자가 부풀고, 고른 것만 부풀면
// 그때마다 옆 항목들이 밀린다. 글자는 14px에서 17px로 키웠다.
export default function CategoryNav() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex gap-5 overflow-x-auto border-b border-line px-[18px] py-3 text-[17px] font-medium">
      {CATEGORY_LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap pb-1 ${
              active ? "border-b-2 border-rose text-rose-deep" : "text-muted"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
