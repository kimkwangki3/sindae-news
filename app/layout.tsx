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

// 카카오톡·페이스북 등에 링크를 붙였을 때 뜨는 미리보기 그림.
// 1200x630 은 각 서비스가 가로형 큰 카드로 잡아주는 표준 규격이다.
// 개별 기사에 대표 이미지가 없으면 이 그림이 대신 쓰인다.
const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "해룡신문 — 순천시 해룡면 지역 인터넷신문",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s",
  },
  description: DESCRIPTION,
  applicationName: "해룡신문",
  // canonical(정규 주소)은 여기에 두면 안 된다. 루트 레이아웃의 metadata는
  // 하위 페이지가 같은 항목을 선언하지 않으면 그대로 상속되므로, 여기에
  // canonical: "/" 를 적으면 모든 하위 페이지가 "나는 홈의 중복이다"라고
  // 구글에 알리게 된다(2026-08 색인 누락의 원인). 각 page.tsx가 자기 경로를
  // 직접 선언한다.
  alternates: {
    // RSS 자동 발견용. 이게 있으면 크롤러·리더가 피드를 알아서 찾는다.
    types: { "application/rss+xml": `${SITE_URL}/rss.xml` },
  },
  openGraph: {
    type: "website",
    siteName: "해룡신문",
    locale: "ko_KR",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  // summary_large_image 로 올린다. 카카오톡·트위터에서 작은 정사각 썸네일이
  // 아니라 가로로 넓은 카드로 보인다 — 1200x630 은 그 규격이다.
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
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
