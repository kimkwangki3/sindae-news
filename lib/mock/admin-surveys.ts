// 설문 관리자 읽기 — service_role. RLS를 우회하므로 서버에서만 부른다.
//
// 공개 화면(lib/mock/surveys.ts)과 나눠 둔 이유: 관리자는 초안까지 봐야 하고
// 교차 분석을 위해 개별 응답을 읽어야 한다. 그 권한을 공개 경로와 한 파일에
// 두면 언젠가 실수로 섞인다.

import type { Block } from "@/lib/blocks";
import { createServiceClient } from "@/lib/supabase/server";
import type { ResultVisibility, SurveyStatus } from "@/lib/surveys";

export interface AdminSurveyRow {
  id: string;
  slug: string;
  title: string;
  status: SurveyStatus;
  totalVotes: number;
  endsAt: string | null;
  createdAt: string;
}

export interface AdminSurvey extends AdminSurveyRow {
  description: string | null;
  resultVisibility: ResultVisibility;
  collectDistrict: boolean;
  collectAgeBand: boolean;
  startsAt: string | null;
  options: { id: string; label: string; count: number }[];
}

/** 교차표 한 칸. rows(지구/연령대) × cols(보기). */
export interface CrossTab {
  key: string; // "district" | "age_band"
  label: string;
  rows: { label: string; counts: number[]; total: number }[];
  columns: string[]; // 보기 라벨
  answered: number; // 이 항목에 답한 사람 수
}

export interface IpAnomaly {
  hint: string; // 해시 앞 8자 — 원본 IP는 어디에도 없다
  accounts: number;
  votes: number;
}

// 교차 분석을 위해 개별 응답을 읽는다. 지역 신문 규모에서 한 설문이 이보다
// 많아질 일은 없고, 넘치면 그때는 SQL 집계로 옮겨야 한다는 신호다.
const VOTE_SCAN_LIMIT = 5000;

export async function getAdminSurveys(): Promise<AdminSurveyRow[]> {
  const { data } = await createServiceClient()
    .from("surveys")
    .select("id, slug, title, status, total_votes, ends_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    status: r.status as SurveyStatus,
    totalVotes: (r.total_votes as number) ?? 0,
    endsAt: (r.ends_at as string) ?? null,
    createdAt: (r.created_at as string) ?? "",
  }));
}

export async function getAdminSurvey(id: string): Promise<AdminSurvey | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("surveys")
    .select(
      "id, slug, title, description, status, result_visibility, collect_district, collect_age_band, starts_at, ends_at, total_votes, created_at, survey_options(id, label, sort_order, vote_count)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const r = data as Record<string, unknown>;
  const opts = ((r.survey_options ?? []) as Record<string, unknown>[])
    .slice()
    .sort((a, b) => (a.sort_order as number) - (b.sort_order as number));

  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    description: (r.description as string) ?? null,
    status: r.status as SurveyStatus,
    resultVisibility: r.result_visibility as ResultVisibility,
    collectDistrict: Boolean(r.collect_district),
    collectAgeBand: Boolean(r.collect_age_band),
    startsAt: (r.starts_at as string) ?? null,
    endsAt: (r.ends_at as string) ?? null,
    totalVotes: (r.total_votes as number) ?? 0,
    createdAt: (r.created_at as string) ?? "",
    options: opts.map((o) => ({
      id: o.id as string,
      label: o.label as string,
      count: (o.vote_count as number) ?? 0,
    })),
  };
}

// 한국 날짜 "2026년 8월 20일". 기사 문장에 그대로 들어간다.
function kstDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

/**
 * 결과 → 기사 초안.
 *
 * 이 기능의 종착점이다. 모인 의견이 그래프째로 기사 편집기에 들어간다.
 *
 * 문장은 사실만 적는다 — 몇 명이 무엇을 골랐는지까지다. "주민들이 불편을
 * 호소했다" 같은 해석은 자동으로 쓰지 않는다. 그건 기자가 취재해서 붙일 몫이고,
 * 기계가 미리 써 두면 그대로 나가기 쉽다.
 *
 * 법이 요구하는 표기는 여기서 문단으로 넣지 않는다. 문단은 지울 수 있어서다.
 * 그래프를 그리는 컴포넌트 안에 박혀 있어 그래프가 있는 한 함께 나간다.
 */
export function toArticleDraft(survey: AdminSurvey): {
  title: string;
  blocks: Block[];
} {
  const sorted = [...survey.options].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  const pct =
    survey.totalVotes > 0 && top
      ? Math.round((top.count * 1000) / survey.totalVotes) / 10
      : 0;

  const period = [kstDate(survey.startsAt), kstDate(survey.endsAt)]
    .filter(Boolean)
    .join("부터 ");
  const when = period ? `${period}까지 ` : "";

  const lead =
    `해룡신문이 ${when}주민 의견을 물었다. ` +
    `"${survey.title}"라는 물음에 모두 ${survey.totalVotes.toLocaleString()}명이 답했다.`;

  const finding = top
    ? `가장 많이 꼽힌 것은 '${top.label}'이었다. ` +
      `${top.count.toLocaleString()}명이 골라 전체의 ${pct}%를 차지했다.`
    : "";

  return {
    title: `[주민 의견 조사] ${survey.title}`,
    blocks: [
      { type: "text", text: lead },
      {
        type: "chart",
        surveyId: survey.id,
        surveySlug: survey.slug,
        title: survey.title,
        totalVotes: survey.totalVotes,
        options: survey.options.map((o) => ({
          label: o.label,
          count: o.count,
        })),
        capturedAt: new Date().toISOString(),
      },
      ...(finding ? [{ type: "text" as const, text: finding }] : []),
    ],
  };
}

/**
 * 교차표와 이상 징후.
 *
 * 응답을 한 번만 읽어 둘 다 만든다. 화면 하나에서 쓰는 값이라 두 번 읽을
 * 이유가 없다.
 */
export async function getSurveyBreakdown(
  survey: AdminSurvey,
): Promise<{ cross: CrossTab[]; anomalies: IpAnomaly[] }> {
  const { data } = await createServiceClient()
    .from("survey_votes")
    .select("option_id, district, age_band, ip_hash, user_id")
    .eq("survey_id", survey.id)
    .limit(VOTE_SCAN_LIMIT);

  const votes = (data ?? []) as {
    option_id: string;
    district: string | null;
    age_band: string | null;
    ip_hash: string | null;
    user_id: string;
  }[];

  const columns = survey.options.map((o) => o.label);
  const colIndex = new Map(survey.options.map((o, i) => [o.id, i]));

  function build(
    key: "district" | "age_band",
    label: string,
    pick: (v: (typeof votes)[number]) => string | null,
  ): CrossTab {
    const buckets = new Map<string, number[]>();
    let answered = 0;
    for (const v of votes) {
      const k = pick(v);
      if (!k) continue; // 답하지 않은 사람은 교차표에서 뺀다
      const col = colIndex.get(v.option_id);
      if (col === undefined) continue;
      if (!buckets.has(k)) buckets.set(k, new Array(columns.length).fill(0));
      buckets.get(k)![col] += 1;
      answered += 1;
    }
    const rows = [...buckets.entries()]
      .map(([label, counts]) => ({
        label,
        counts,
        total: counts.reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total);
    return { key, label, rows, columns, answered };
  }

  const cross: CrossTab[] = [];
  if (survey.collectDistrict) {
    cross.push(build("district", "거주 지구별", (v) => v.district));
  }
  if (survey.collectAgeBand) {
    cross.push(build("age_band", "연령대별", (v) => v.age_band));
  }

  // 같은 회선에서 여러 계정이 참여한 경우. 가족·직장·공용 와이파이면
  // 정상이므로 자동으로 막지 않는다. 사람이 보고 판단할 자료로만 낸다.
  const byIp = new Map<string, { users: Set<string>; votes: number }>();
  for (const v of votes) {
    if (!v.ip_hash) continue;
    if (!byIp.has(v.ip_hash)) {
      byIp.set(v.ip_hash, { users: new Set(), votes: 0 });
    }
    const e = byIp.get(v.ip_hash)!;
    e.users.add(v.user_id);
    e.votes += 1;
  }

  const anomalies: IpAnomaly[] = [...byIp.entries()]
    .filter(([, e]) => e.users.size >= 3)
    .map(([hash, e]) => ({
      hint: hash.slice(0, 8),
      accounts: e.users.size,
      votes: e.votes,
    }))
    .sort((a, b) => b.accounts - a.accounts);

  return { cross, anomalies };
}
