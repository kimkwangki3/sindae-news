import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";
import { MEDIA } from "@/lib/media";

// 공개 영역 공통 푸터: 매체 정보 + 법적 페이지 링크 + 광고 문의.
export default function Footer() {
  return (
    <footer className="mt-6 border-t border-line bg-ivory-2 px-[18px] py-6 text-[17px] text-muted">
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
        <Link href="/reporters" className="min-h-[24px]">
          필자 소개
        </Link>
        <Link href="/ads/apply" className="min-h-[24px]">
          광고 문의
        </Link>
        <a
          href={MEDIA.kakaoChannel}
          target="_blank"
          rel="noreferrer"
          className="min-h-[24px]"
        >
          카카오톡 채널
        </a>
      </nav>

      {/* 신문법 제21조 게재사항을 모든 화면 아래에 둔다(2026-08-17 발행인 결정).
          전에는 /legal/publisher 한 곳에만 두었는데, 점검하는 쪽이 그 페이지를
          찾아 들어가야만 확인되는 구조였다. 누락은 과태료 대상이라 굳이 한 번
          더 클릭하게 만들 이유가 없다.

          발행소 소재지와 전화번호도 같은 조문의 항목이라 함께 싣는다
          (2026-08-17 발행인 결정, 그전까지는 미노출이었다). 주소는 건물번호를
          뺀 도로명까지만 적는다 — 자택이라 집을 특정당하지 않는 선을 발행인이
          거기로 잡았다. 값은 lib/media.ts 한 곳에서만 바꾼다. */}
      <div className="mt-4 flex flex-col gap-0.5 leading-relaxed">
        <p className="font-bold text-ink">{MEDIA.name}</p>
        <p>
          등록번호 {MEDIA.regNo} · {MEDIA.regDateShort} 등록 · {MEDIA.kind}
        </p>
        <p>
          발행인 {MEDIA.publisher} · 편집인 {MEDIA.editor}
        </p>
        <p>
          청소년보호책임자 {MEDIA.youthOfficer} · 개인정보 보호책임자{" "}
          {MEDIA.privacyOfficer}
        </p>
        <p>발행소 {MEDIA.addressPublic}</p>
        <p>
          전화{" "}
          <a href={`tel:${MEDIA.phoneTel}`} className="underline">
            {MEDIA.phone}
          </a>{" "}
          · 이메일{" "}
          <a href={`mailto:${MEDIA.email}`} className="underline">
            {MEDIA.email}
          </a>
        </p>
        <p className="mt-2 text-[16px]">
          © 2026 {MEDIA.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
