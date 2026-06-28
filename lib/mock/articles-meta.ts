// 서버/클라이언트 공용 기사 메타(타입·상수). 서버 전용 import 금지.
// (articles.ts는 Supabase 클라이언트를 끌어오므로 'use client' 컴포넌트는 이 파일을 import)
import type { ArticleSummary } from "@/components/ArticleListItem";

export type CategorySlug = "local" | "admin" | "people" | "life";

export const CATEGORY_NAME: Record<CategorySlug, string> = {
  local: "지역소식",
  admin: "행정",
  people: "인물",
  life: "생활",
};

// db/schema.sql 초기 시드 기준 categories.id 매핑
export const CATEGORY_ID: Record<CategorySlug, number> = {
  local: 1,
  admin: 2,
  people: 3,
  life: 4,
};
export const ID_TO_SLUG: Record<number, CategorySlug> = {
  1: "local",
  2: "admin",
  3: "people",
  4: "life",
};

export interface ArticlesPage {
  items: ArticleSummary[];
  nextCursor: number | null;
}

export type HotPeriod = "day" | "week" | "month";

export interface HotItem extends ArticleSummary {
  rank: number;
  views: number;
}
