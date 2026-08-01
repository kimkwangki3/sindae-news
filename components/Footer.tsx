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

      {/* 발행소·연락처·발행인·운영사는 발행인 판단으로 푸터에서 제외(2026-07-31).
          필요적 게재사항 전체는 /legal/publisher에, 청소년보호책임자는 홈 하단에
          그대로 게재돼 있다. 값은 lib/media.ts 한 곳에서만 바꾼다. */}
      <div className="mt-4 flex flex-col gap-0.5 leading-relaxed">
        <p className="font-bold text-ink">{MEDIA.name}</p>
        <p>
          등록번호 {MEDIA.regNo} · {MEDIA.regDateShort} 등록 · {MEDIA.kind}
        </p>
        <p className="mt-2 text-[11px]">
          © 2026 {MEDIA.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
