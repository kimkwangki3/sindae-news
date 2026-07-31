import type { Metadata, Viewport } from "next";
import { Gowun_Batang, Gowun_Dodum } from "next/font/google";
import "./globals.css";

// 헤드라인: Gowun Batang(serif) / 본문: Gowun Dodum(sans)
const gowunBatang = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-gowun-batang",
  display: "swap",
});

const gowunDodum = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gowun-dodum",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
// 제목·설명은 OG/트위터까지 동일 기조로 통일(검색 노출용).
const TITLE = "해룡신문 — 순천시 해룡면 지역 인터넷신문";
const DESCRIPTION =
  "순천시 해룡면 신대·선월·복성지구 소식을 전하는 지역 인터넷신문. 지역 행정, 생활, 문화, 경제 소식을 가장 빠르게 전합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s",
  },
  description: DESCRIPTION,
  applicationName: "해룡신문",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "해룡신문",
    locale: "ko_KR",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
  // 검색엔진 소유 확인용 메타 태그. 확인이 끝나도 지우면 안 된다
  // (네이버·구글이 주기적으로 재확인하며, 사라지면 소유권이 해제된다).
  verification: {
    other: {
      "naver-site-verification":
        "96c63e5b46982a913875aab53bab2339e4d0bab5",
    },
  },
};

// 모바일 우선: 사용자 확대 허용, 색상 테마
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF6F2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${gowunBatang.variable} ${gowunDodum.variable}`}>
      <body>{children}</body>
    </html>
  );
}
