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

      {/* 신문법 제21조 필요적 게재사항 — 등록증 표기와 글자 그대로 일치시킬 것 */}
      <div className="mt-4 flex flex-col gap-0.5 leading-relaxed">
        <p className="font-bold text-ink">해룡신문</p>
        <p>등록번호 전남광주,아00766 · 2026.07.27 등록 · 인터넷신문</p>
        <p>발행소 순천시 오천4길 39 · 전화 010-3535-1221</p>
        <p>발행인·편집인 김광기 · 청소년보호책임자 김광기</p>
        <p>운영사 DSBH</p>
        <p className="mt-2 text-[11px]">
          © 2026 해룡신문. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
