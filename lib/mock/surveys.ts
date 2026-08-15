// 설문 데이터 액세스 — Supabase 실연동. 공개 화면(비로그인·회원)이 쓴다.
//
// 전부 RLS가 걸린 클라이언트로 읽는다. 그래서 초안(draft) 설문은 여기서
// 조회 자체가 되지 않는다 — 화면에서 거르는 게 아니라 DB가 안 준다.
// 관리자 화면은 service_role 로 따로 읽는다(lib/survey-actions.ts).

import { createClient } from "@/lib/supabase/server";
import type {
  Survey,
  SurveyResults,
  SurveyStatus,
  SurveySummary,
  ResultVisibility,
} from "@/lib/surveys";

interface SurveyRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  result_visibility: ResultVisibility;
  collect_district: boolean;
  collect_age_band: boolean;
  starts_at: string | null;
  ends_at: string | null;
  total_votes: number;
  survey_options?: { id: string; label: string; sort_order: number }[];
}

interface SummaryRow {
  slug: string;
  title: string;
  status: SurveyStatus;
  total_votes: number;
  ends_at: string | null;
}

const SURVEY_COLS =
  "id, slug, title, description, status, result_visibility, collect_district, collect_age_band, starts_at, ends_at, total_votes";
const SUMMARY_COLS = "slug, title, status, total_votes, ends_at";

function toSurvey(r: SurveyRow): Survey {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    status: r.status,
    resultVisibility: r.result_visibility,
    collectDistrict: r.collect_district,
    collectAgeBand: r.collect_age_band,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    totalVotes: r.total_votes,
    options: (r.survey_options ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((o) => ({ id: o.id, label: o.label })),
  };
}

function toSummary(r: SummaryRow): SurveySummary {
  return {
    slug: r.slug,
    title: r.title,
    status: r.status,
    totalVotes: r.total_votes,
    endsAt: r.ends_at,
  };
}

/** 목록. 진행 중과 끝난 것을 나눠서 준다 — 화면이 둘을 다르게 다룬다. */
export async function getSurveys(): Promise<{
  open: SurveySummary[];
  closed: SurveySummary[];
}> {
  const { data } = await createClient()
    .from("surveys")
    .select(SUMMARY_COLS)
    .in("status", ["open", "closed"])
    // 진행 중은 마감이 가까운 것부터, 끝난 것은 최근에 끝난 것부터 보여야
    // 하는데 정렬 방향이 반대다. 한 번에 받아 아래에서 나눈다.
    .order("ends_at", { ascending: false, nullsFirst: false })
    .limit(50);

  const rows = (data ?? []) as SummaryRow[];
  return {
    open: rows
      .filter((r) => r.status === "open")
      .reverse()
      .map(toSummary),
    closed: rows.filter((r) => r.status === "closed").map(toSummary),
  };
}

/** 홈 카드용 — 진행 중 설문 하나(마감이 가장 가까운 것). 없으면 null. */
export async function getFeaturedSurvey(): Promise<SurveySummary | null> {
  const { data } = await createClient()
    .from("surveys")
    .select(SUMMARY_COLS)
    .eq("status", "open")
    .order("ends_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data ? toSummary(data as SummaryRow) : null;
}

/** 진행 중 개수 — 하단 탭 배지. */
export async function getOpenSurveyCount(): Promise<number> {
  const { count } = await createClient()
    .from("surveys")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

export async function getSurveyBySlug(slug: string): Promise<Survey | null> {
  const { data } = await createClient()
    .from("surveys")
    .select(`${SURVEY_COLS}, survey_options(id, label, sort_order)`)
    .eq("slug", slug)
    .maybeSingle();
  return data ? toSurvey(data as unknown as SurveyRow) : null;
}

/**
 * 집계. 아직 가려둔 설문이면 null.
 *
 * 테이블을 직접 세지 않고 RPC를 부른다. 집계를 앱에서 만들려면 개별 투표를
 * 읽을 권한이 필요한데, 그 권한을 여는 순간 참여자가 적을 때 누가 무엇을
 * 골랐는지 추정된다. 그래서 DB가 합계만 밖으로 내보낸다.
 */
export async function getSurveyResults(
  surveyId: string,
): Promise<SurveyResults | null> {
  const { data } = await createClient().rpc("get_survey_results", {
    p_survey_id: surveyId,
  });
  if (!data) return null;
  const r = data as {
    survey_id: string;
    title: string;
    status: SurveyStatus;
    total_votes: number;
    options: { id: string; label: string; count: number; ratio: number }[];
  };
  return {
    surveyId: r.survey_id,
    title: r.title,
    status: r.status,
    totalVotes: r.total_votes,
    options: r.options ?? [],
  };
}

/** 내가 이미 투표했는지. 비로그인이면 voted=false. */
export async function getMyVote(
  surveyId: string,
): Promise<{ voted: boolean; optionId?: string }> {
  const { data } = await createClient().rpc("get_my_vote", {
    p_survey_id: surveyId,
  });
  const r = (data ?? { voted: false }) as { voted: boolean; option_id?: string };
  return { voted: r.voted, optionId: r.option_id };
}
