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
const DESCRIPTION =
  "신대지구(순천시) 이웃들의 소식을 전하는 인터넷 신문 · 운영사 DSBH";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "신대신문 — 신대지구 이웃 소식",
    template: "%s",
  },
  description: DESCRIPTION,
  applicationName: "신대신문",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "신대신문",
    locale: "ko_KR",
    url: SITE_URL,
    title: "신대신문 — 신대지구 이웃 소식",
    description: DESCRIPTION,
  },
  twitter: { card: "summary", title: "신대신문", description: DESCRIPTION },
  robots: { index: true, follow: true },
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
