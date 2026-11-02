"use client";

import { usePathname } from "next/navigation";
import { isWidePath } from "@/lib/layout-paths";

// 본문 폭. 휴대폰은 바깥 셸의 480px 그대로이고, 태블릿부터 주소에 따라 넓힌다.
export default function MainFrame({ children }: { children: React.ReactNode }) {
  const wide = isWidePath(usePathname());
  return (
    <main
      className={`mx-auto w-full flex-1 ${
        wide ? "md:max-w-[1240px]" : "md:max-w-[720px]"
      }`}
    >
      {children}
    </main>
  );
}
