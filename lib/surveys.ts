// 주민 의견 조사(설문) — 공용 타입·상수·읽기.
//
// 용어. 코드에도 화면에도 '여론조사'를 쓰지 않는다. 공직선거법상 규제 용어라
// 그 이름으로 부르는 순간 다른 법이 적용된다. 우리가 하는 것은 '주민 의견 조사'다.
//
// 이 파일은 클라이언트 컴포넌트(투표 폼)에서도 import 하므로 서버 전용 모듈을
// 절대 끌어오면 안 된다. DB를 읽는 코드는 lib/mock/surveys.ts 에 있다
// (이 저장소는 데이터 접근을 그 폴더에 모아 둔다).

import { REGIONS } from "./region";

// ── 상수 ──────────────────────────────────────────────────────────────

/** 거주 지구 선택지. DB의 survey_district_ok() 와 글자까지 같아야 한다. */
export const SURVEY_DISTRICTS = REGIONS;

/** 연령대 선택지. DB의 survey_age_band_ok() 와 글자까지 같아야 한다. */
export const AGE_BANDS = [
  "10대",
  "20대",
  "30대",
  "40대",
  "50대",
  "60대 이상",
] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

/**
 * 결과 화면에 반드시 붙는 문구.
 *
 * 관리자가 지울 수 없어야 한다. 그래서 편집기가 건드리는 본문 문단이 아니라
 * 결과를 그리는 컴포넌트 안에 상수로 박아 둔다. 이 조사는 표본을 설계해 뽑은
 * 것이 아니라 홈페이지에 온 사람이 스스로 응답한 것이라, 대표성이 없다는 사실을
 * 결과와 떼어놓지 않는 것이 매체의 의무다.
 */
export const SURVEY_DISCLAIMER =
  "본 조사는 해룡신문 홈페이지를 통해 참여자가 스스로 응답한 것으로, " +
  "해룡면 전체 주민의 의견을 대표하지 않습니다.";

/** 관리자 설문 작성 화면 상단에 상시 노출하는 경고. */
export const SURVEY_FORBIDDEN_TOPICS = [
  "정당, 후보자, 시장·의원 등 선출직에 대한 평가·지지도 (공직선거법 위반)",
  "특정 업체·기관·개인을 지목한 평가 (명예훼손 소지)",
  "미성년자를 대상으로 하는 조사",
] as const;

export const MAX_OPTIONS = 6;
export const MIN_OPTIONS = 2;
export const MAX_OPTION_LEN = 40;

// ── 타입 ──────────────────────────────────────────────────────────────

export type SurveyStatus = "draft" | "open" | "closed";
export type ResultVisibility = "immediate" | "after_close";

export interface SurveyOption {
  id: string;
  label: string;
}

export interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  resultVisibility: ResultVisibility;
  collectDistrict: boolean;
  collectAgeBand: boolean;
  startsAt: string | null;
  endsAt: string | null;
  totalVotes: number;
  options: SurveyOption[];
}

/** 집계. 개별 투표는 어디에도 담지 않는다. */
export interface SurveyResults {
  surveyId: string;
  title: string;
  status: SurveyStatus;
  totalVotes: number;
  options: { id: string; label: string; count: number; ratio: number }[];
}

/** 목록 카드용 요약. */
export interface SurveySummary {
  slug: string;
  title: string;
  status: SurveyStatus;
  totalVotes: number;
  endsAt: string | null;
}

// ── 표시 도우미 ───────────────────────────────────────────────────────

/**
 * 마감까지 남은 시간. 목록·상세 카드에 쓴다.
 *
 * 분 단위까지 보여주지 않는다. "3일 남음"이면 충분하고, 초를 세면 참여를
 * 재촉하는 인상을 준다 — 조사에서 그건 좋은 태도가 아니다.
 */
export function remainingLabel(endsAt: string | null): string {
  if (!endsAt) return "";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "마감";
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days}일 남음`;
  const hours = Math.floor(ms / 3600000);
  return hours >= 1 ? `${hours}시간 남음` : "곧 마감";
}

/**
 * 표 수 → 그래프가 쓰는 모양.
 *
 * 공개 화면은 DB가 비율까지 계산해 주지만(get_survey_results), 관리자 화면과
 * 기사 초안은 개수만 들고 있다. 비율 계산이 두 군데로 갈라지면 같은 조사인데
 * 화면마다 소수점이 다르게 나온다 — 반올림 규칙을 여기 하나로 모은다.
 */
export function buildResults(s: {
  id: string;
  title: string;
  status: SurveyStatus;
  totalVotes: number;
  options: { id: string; label: string; count: number }[];
}): SurveyResults {
  return {
    surveyId: s.id,
    title: s.title,
    status: s.status,
    totalVotes: s.totalVotes,
    options: s.options.map((o) => ({
      ...o,
      ratio:
        s.totalVotes === 0
          ? 0
          : Math.round((o.count * 1000) / s.totalVotes) / 10,
    })),
  };
}

/**
 * 결과를 지금 보여줘도 되는지 — 화면 분기용.
 *
 * 진짜 차단은 DB의 get_survey_results() 가 한다(집계를 아예 돌려주지 않는다).
 * 여기서 한 번 더 보는 것은 화면에 빈 자리를 만들지 않기 위해서다.
 */
export function resultsVisible(s: {
  status: SurveyStatus;
  resultVisibility: ResultVisibility;
}): boolean {
  return s.status === "closed" || s.resultVisibility === "immediate";
}

