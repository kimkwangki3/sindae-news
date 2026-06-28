import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";

// 공개 영역 공통 푸터: 매체 정보 + 법적 페이지 링크 + 광고 문의.
export default function Footer() {
  return (
    <footer className="mt-6 border-t border-line bg-ivory-2 px-[18px] py-6 text-[12px] text-muted">
      <nav className="flex flex-wrap gap-x-3 gap-y-2">
        {LEGAL_LINKS.map((l) => (
          <Link
            key={l.slug}
            href={`/legal/${l.slug}`}
            className={`min-h-[24px] ${
              l.slug === "privacy" ? "font-bold text-ink" : ""
            }`}
          >
            {l.title}
          </Link>
        ))}
        <Link href="/ads/apply" className="min-h-[24px]">
          광고 문의
        </Link>
      </nav>

      <div className="mt-4 flex flex-col gap-0.5 leading-relaxed">
        <p className="font-bold text-ink">신대신문</p>
        <p>운영사 DSBH · 신대지구(순천시) 인터넷 신문</p>
        <p>발행인·편집인 ⚠️확인요망 · 청소년보호책임자 ⚠️확인요망</p>
        <p className="mt-2 text-[11px]">
          © 2026 신대신문. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
