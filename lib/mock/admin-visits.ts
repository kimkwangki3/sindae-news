// 접속 분석 데이터 — service_role. 관리자 화면에서만 쓴다.
//
// 세는 일은 전부 DB가 한다(db/visit-analytics-migration.sql). page_views 는
// 방문 한 번에 한 줄씩 쌓이는 원본 로그라, 앱으로 끌어와 세면 PostgREST 의
// 행 상한에 걸려 방문이 늘수록 조용히 '적은 수'를 보게 된다. 틀린 줄도
// 모르고 보는 숫자가 제일 나쁘다.

import { createServiceClient } from "@/lib/supabase/server";

/** 화면이 고를 수 있는 기간. 여기 없는 값은 받지 않는다. */
export const PERIODS = [7, 30, 90, 180] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  7: "최근 7일",
  30: "최근 30일",
  90: "최근 90일",
  180: "최근 6개월",
};

export function toPeriod(raw: string | undefined): Period {
  const n = Number(raw);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}

export interface VisitSummary {
  visitors: number;
  views: number;
  daysWithTraffic: number;
}

export interface PathRow {
  path: string;
  views: number;
  visitors: number;
}

export interface SourceRow {
  source: string;
  views: number;
  visitors: number;
}

export interface ArticleViewRow {
  slug: string;
  title: string;
  category: string;
  views: number;
  visitors: number;
  avgDwellSec: number;
  avgScroll: number;
}

export interface HourRow {
  hour: number;
  views: number;
  visitors: number;
}

/** 집계 함수가 아직 없을 때(마이그레이션 전) 화면이 0으로 착각하지 않게 한다. */
export interface VisitAnalytics {
  available: boolean;
  summary: VisitSummary;
  paths: PathRow[];
  sources: SourceRow[];
  articles: ArticleViewRow[];
  hours: HourRow[];
}

const n = (v: unknown) => Number(v ?? 0);

export async function getVisitAnalytics(days: number): Promise<VisitAnalytics> {
  const supabase = createServiceClient();
  const blank: VisitAnalytics = {
    available: false,
    summary: { visitors: 0, views: 0, daysWithTraffic: 0 },
    paths: [],
    sources: [],
    articles: [],
    hours: [],
  };

  const [summaryRes, pathRes, srcRes, artRes, hourRes] = await Promise.all([
    supabase.rpc("visit_summary", { p_days: days }),
    supabase.rpc("top_paths", { p_days: days, p_limit: 30 }),
    supabase.rpc("top_referrers", { p_days: days, p_limit: 12 }),
    supabase.rpc("article_view_stats", { p_days: days, p_limit: 50 }),
    supabase.rpc("hourly_visit_stats", { p_days: days }),
  ]);

  if (summaryRes.error) {
    // eslint-disable-next-line no-console
    console.error("[admin] visit_summary 실패:", summaryRes.error.message);
    return blank;
  }

  // returns table(...) 은 행 배열로 온다. 요약은 한 줄뿐이다.
  const s = (summaryRes.data as Record<string, unknown>[])?.[0] ?? {};

  // 기사 제목은 집계에 없다(id만 온다). 필요한 것만 골라 한 번에 붙인다.
  const artRows = (artRes.data ?? []) as Record<string, unknown>[];
  const ids = artRows.map((r) => r.article_id as string);
  const titles = new Map<string, { slug: string; title: string; cat: number | null }>();
  if (ids.length) {
    const { data } = await supabase
      .from("articles")
      .select("id, slug, title, category_id")
      .in("id", ids);
    for (const a of (data ?? []) as Record<string, unknown>[]) {
      titles.set(a.id as string, {
        slug: a.slug as string,
        title: a.title as string,
        cat: (a.category_id as number) ?? null,
      });
    }
  }

  const { CATEGORY_NAME, ID_TO_SLUG } = await import("@/lib/mock/articles-meta");

  return {
    available: true,
    summary: {
      visitors: n(s.visitors),
      views: n(s.views),
      daysWithTraffic: n(s.days_with_traffic),
    },
    paths: ((pathRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      path: String(r.path ?? ""),
      views: n(r.views),
      visitors: n(r.visitors),
    })),
    sources: ((srcRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      source: String(r.source ?? "기타"),
      views: n(r.views),
      visitors: n(r.visitors),
    })),
    articles: artRows
      .map((r) => {
        const meta = titles.get(r.article_id as string);
        return {
          slug: meta?.slug ?? "",
          title: meta?.title ?? "(삭제된 기사)",
          category: meta?.cat ? (CATEGORY_NAME[ID_TO_SLUG[meta.cat]] ?? "") : "",
          views: n(r.views),
          visitors: n(r.visitors),
          avgDwellSec: n(r.avg_dwell_sec),
          avgScroll: n(r.avg_scroll),
        };
      })
      // 지워진 기사는 목록에서 뺀다 — 제목도 링크도 없는 줄이 남는다.
      .filter((a) => a.slug),
    hours: ((hourRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      hour: n(r.hour),
      views: n(r.views),
      visitors: n(r.visitors),
    })),
  };
}
