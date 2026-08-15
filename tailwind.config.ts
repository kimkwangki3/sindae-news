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
        // 본문 강조색(lib/blocks.ts 팔레트) — 아이보리 배경 위 본문 글씨로
        // 쓰이므로 대비 4.5:1 이상이 나오도록 뱃지용 색보다 어둡게 잡았다.
        // 뱃지용(tag-*-fg)을 그대로 쓰면 긴 문장에서 읽기 힘들다.
        "body-navy": "#1F3A68", // 본문 강조 — 굵게와 함께 쓴다
        "body-red": "#B3352F",
        "body-blue": "#2C5F94",
        "body-green": "#2F7A4C",
        "body-brown": "#8A5E22",
        // 그래프 계열색(설문 교차표). 본문 강조색을 그대로 쓰려다 검증에서
        // 떨어졌다 — 글자용이라 채도가 낮고, 빨강과 갈색이 색맹 시야에서
        // 거의 같은 색으로 보였다(ΔE 0.7). 아래 다섯은 명도대·채도·색맹 구분·
        // 정상시야 구분을 모두 통과한 조합이다. 순서를 섞거나 하나만 바꾸면
        // 그 검증이 깨지므로 손대지 말 것.
        // 주황은 배경 대비가 3:1에 못 미쳐, 숫자 라벨과 표를 반드시 함께 낸다.
        "chart-1": "#C2185B",
        "chart-2": "#0277BD",
        "chart-3": "#EF8C00",
        "chart-4": "#2E7D32",
        "chart-5": "#6A4CA0",
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
