import type { Config } from "tailwindcss";

// 해룡신문 디자인 토큰 (design-mockup.html :root 변수 이식)
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#FBF6F2", // 메인 배경
        "ivory-2": "#F4EBE4", // 서브 배경
        rose: "#C77B8B", // 포인트
        "rose-deep": "#7C3A4E", // 딥 포인트(헤더/강조)
        ink: "#2B2426", // 본문 텍스트
        muted: "#8A7E80", // 보조 텍스트
        line: "#EADFD8", // 라인/보더
        // 역할 태그
        "tag-biz-bg": "#FBEAD2",
        "tag-biz-fg": "#B5803A",
        "tag-org-bg": "#E3F1E8",
        "tag-org-fg": "#3F8F5E",
        "rose-soft": "#F6E7EA", // 키커/뱃지 배경
      },
      fontFamily: {
        // next/font 변수로 주입 (app/layout.tsx)
        serif: ["var(--font-gowun-batang)", "serif"], // 헤드라인
        sans: ["var(--font-gowun-dodum)", "var(--font-gowun-batang)", "sans-serif"], // 본문
      },
      // 글자가 작다는 피드백 — Tailwind 기본 스케일을 단계별로 약 3px(0.1875rem)씩
      // 키웠다. 여백(spacing)은 그대로 두고 text-* 크기만 올려 레이아웃은 유지한다.
      fontSize: {
        xs: ["0.9375rem", { lineHeight: "1.1875rem" }], // 12 → 15px
        sm: ["1.0625rem", { lineHeight: "1.4375rem" }], // 14 → 17px
        base: ["1.1875rem", { lineHeight: "1.6875rem" }], // 16 → 19px
        lg: ["1.3125rem", { lineHeight: "1.9375rem" }], // 18 → 21px
        xl: ["1.4375rem", { lineHeight: "1.9375rem" }], // 20 → 23px
        "2xl": ["1.6875rem", { lineHeight: "2.1875rem" }], // 24 → 27px
        "3xl": ["2.0625rem", { lineHeight: "2.4375rem" }], // 30 → 33px
        "4xl": ["2.4375rem", { lineHeight: "2.6875rem" }], // 36 → 39px
        "5xl": ["3.1875rem", { lineHeight: "1" }], // 48 → 51px
        "6xl": ["3.9375rem", { lineHeight: "1" }], // 60 → 63px
        "7xl": ["4.6875rem", { lineHeight: "1" }], // 72 → 75px
        "8xl": ["6.1875rem", { lineHeight: "1" }], // 96 → 99px
        "9xl": ["8.1875rem", { lineHeight: "1" }], // 128 → 131px
      },
      borderRadius: {
        card: "18px", // 카드/큰 요소
        element: "12px", // 작은 요소
        thumb: "14px", // 썸네일
      },
      boxShadow: {
        soft: "0 8px 30px rgba(124,58,78,.08)",
      },
      maxWidth: {
        app: "480px", // 모바일 우선 컨테이너
      },
    },
  },
  plugins: [],
};

export default config;
