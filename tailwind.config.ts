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
      // 글자가 작다는 피드백 — Tailwind 기본 스케일을 단계별로 약 5px(0.3125rem)씩
      // 키웠다. 여백(spacing)은 그대로 두고 text-* 크기만 올려 레이아웃은 유지한다.
      fontSize: {
        xs: ["1.0625rem", { lineHeight: "1.3125rem" }], // 12 → 17px
        sm: ["1.1875rem", { lineHeight: "1.5625rem" }], // 14 → 19px
        base: ["1.3125rem", { lineHeight: "1.8125rem" }], // 16 → 21px
        lg: ["1.4375rem", { lineHeight: "2.0625rem" }], // 18 → 23px
        xl: ["1.5625rem", { lineHeight: "2.0625rem" }], // 20 → 25px
        "2xl": ["1.8125rem", { lineHeight: "2.3125rem" }], // 24 → 29px
        "3xl": ["2.1875rem", { lineHeight: "2.5625rem" }], // 30 → 35px
        "4xl": ["2.5625rem", { lineHeight: "2.8125rem" }], // 36 → 41px
        "5xl": ["3.3125rem", { lineHeight: "1" }], // 48 → 53px
        "6xl": ["4.0625rem", { lineHeight: "1" }], // 60 → 65px
        "7xl": ["4.8125rem", { lineHeight: "1" }], // 72 → 77px
        "8xl": ["6.3125rem", { lineHeight: "1" }], // 96 → 101px
        "9xl": ["8.3125rem", { lineHeight: "1" }], // 128 → 133px
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
