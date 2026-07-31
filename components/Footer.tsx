import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";
import { MEDIA } from "@/lib/media";

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

      {/* 신문법 제21조 필요적 게재사항 — 값은 lib/media.ts 한 곳에서만 바꾼다 */}
      <div className="mt-4 flex flex-col gap-0.5 leading-relaxed">
        <p className="font-bold text-ink">{MEDIA.name}</p>
        <p>
          등록번호 {MEDIA.regNo} · {MEDIA.regDateShort} 등록 · {MEDIA.kind}
        </p>
        <p>
          발행소 {MEDIA.addressShort} · 문의 {MEDIA.email}
        </p>
        <p>
          발행인·편집인 {MEDIA.publisher} · 청소년보호책임자{" "}
          {MEDIA.youthOfficer}
        </p>
        <p>운영사 {MEDIA.operator}</p>
        <p className="mt-2 text-[11px]">
          © 2026 {MEDIA.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
