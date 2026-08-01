// 생활정보 조회. 기사와 달리 계속 갱신되는 상시 정보다.
//
// 기사 카테고리에도 '생활'이 있지만 그쪽은 모집·행사 소식이고, 이건 버스
// 시간표나 야간 약국처럼 필요할 때 찾아오는 자료다. 주소도 /info 로 나눈다.

import { createAnonClient, createServiceClient } from "./supabase/server";

export interface InfoPage {
  slug: string;
  title: string;
  summary: string | null;
  icon: string | null;
  body: string | null;
  imageUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  autoUpdated: boolean;
  isPublished: boolean;
  updatedAt: string;
}

// 컬럼을 하나씩 적지 않고 * 를 쓴다. 컬럼을 새로 추가할 때 마이그레이션과
// 배포 순서가 어긋나면(코드가 먼저 나가면) 없는 컬럼을 골라 조회가 통째로
// 실패하고 생활정보가 사이트에서 사라진다. 공개 테이블이라 * 로 받아도
// 민감한 값이 새지 않는다.
const COLS = "*";

interface Row {
  slug: string;
  title: string;
  summary: string | null;
  icon: string | null;
  body: string | null;
  image_url?: string | null;
  source_name: string | null;
  source_url: string | null;
  auto_updated: boolean;
  is_published: boolean;
  updated_at: string;
}

function toPage(r: Row): InfoPage {
  return {
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    icon: r.icon,
    body: r.body,
    imageUrl: r.image_url ?? null,
    sourceName: r.source_name,
    sourceUrl: r.source_url,
    autoUpdated: r.auto_updated,
    isPublished: r.is_published,
    updatedAt: r.updated_at,
  };
}

// 공개된 항목만. 내용을 채우기 전에는 목록에 뜨지 않는다 —
// 빈 페이지를 독자에게 보이지 않기 위해서다.
export async function getInfoPages(): Promise<InfoPage[]> {
  const { data, error } = await createAnonClient()
    .from("info_pages")
    .select(COLS)
    .eq("is_published", true)
    .order("sort");
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[info] 목록 조회 실패:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(toPage);
}

export async function getInfoPage(slug: string): Promise<InfoPage | null> {
  const { data } = await createAnonClient()
    .from("info_pages")
    .select(COLS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data ? toPage(data as Row) : null;
}

// 관리자용 — 공개 여부와 무관하게 전부.
export async function getAllInfoPages(): Promise<InfoPage[]> {
  const { data, error } = await createServiceClient()
    .from("info_pages")
    .select(COLS)
    .order("sort");
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[info] 관리자 목록 조회 실패:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(toPage);
}

// "2026.08.01" — 언제 기준 정보인지 늘 함께 보여준다.
export function fmtUpdated(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}
