"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdmin } from "./audit";
import { getCurrentUser } from "./auth";
import { revalidatePublic } from "./revalidate";
import { createServiceClient } from "./supabase/server";
import {
  MAX_OPTIONS,
  MAX_OPTION_LEN,
  MIN_OPTIONS,
  type ResultVisibility,
  type SurveyStatus,
} from "./surveys";

// 설문 관리 — 관리자 전용.
//
// 화면(app/admin/layout.tsx)이 이미 막고 있지만 여기서 다시 확인한다. 서버
// 액션은 주소만 알면 화면을 거치지 않고 부를 수 있다. 화면 가드는 UI일 뿐이다.
async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    throw new Error("권한이 없습니다.");
  }
  return user;
}

const STATUSES: SurveyStatus[] = ["draft", "open", "closed"];
const VISIBILITIES: ResultVisibility[] = ["immediate", "after_close"];

// 설문 주소. 기사와 달리 날짜 순번을 쓰지 않는다 — 설문은 며칠씩 살아 있는
// 주소라 무엇을 묻는지 알아볼 수 있어야 이웃에게 링크를 보내기 좋다.
function normalizeSurveySlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function fallbackSlug(): string {
  const d = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
  return `survey-${d}-${Math.random().toString(36).slice(2, 6)}`;
}

// 빈 칸은 null 로. 빈 문자열을 timestamptz 에 넣으면 저장이 통째로 실패한다.
function orNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

/**
 * 날짜 입력칸(datetime-local) → 저장할 시각.
 *
 * 입력칸은 "2026-08-20T18:00" 처럼 시간대가 없는 값을 준다. 그대로 넣으면
 * DB(UTC)가 그걸 UTC로 읽어 아홉 시간 밀린다 — 저녁 6시 마감이 새벽 3시가 된다.
 * 이 신문을 만드는 사람도 읽는 사람도 한국에 있으므로 한국시로 못 박는다.
 */
function fromKstInput(v: FormDataEntryValue | null): string | null {
  const s = orNull(v);
  if (!s) return null;
  const withSec = s.length === 16 ? `${s}:00` : s;
  return `${withSec}+09:00`;
}

/**
 * 설문 저장(생성·수정).
 *
 * 보기는 통째로 다시 쓴다. 다만 이미 표가 들어온 보기는 지우지 않는다 —
 * 지우면 그 표까지 함께 사라져 총계와 어긋난다.
 */
export async function saveSurvey(formData: FormData): Promise<void> {
  const user = await assertAdmin();
  const supabase = createServiceClient();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 5) throw new Error("제목을 5자 이상 입력해 주세요.");

  const labels = formData
    .getAll("option")
    .map((v) => String(v).trim().slice(0, MAX_OPTION_LEN))
    .filter(Boolean)
    .slice(0, MAX_OPTIONS);
  if (labels.length < MIN_OPTIONS) {
    throw new Error(`보기를 ${MIN_OPTIONS}개 이상 입력해 주세요.`);
  }

  const status = String(formData.get("status") ?? "draft") as SurveyStatus;
  const visibility = String(
    formData.get("result_visibility") ?? "immediate",
  ) as ResultVisibility;
  if (!STATUSES.includes(status) || !VISIBILITIES.includes(visibility)) {
    throw new Error("잘못된 값입니다.");
  }

  const startsAt = fromKstInput(formData.get("starts_at"));
  const endsAt = fromKstInput(formData.get("ends_at"));
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new Error("종료 일시는 시작 일시보다 뒤여야 합니다.");
  }

  const row = {
    title,
    description: orNull(formData.get("description")),
    status,
    result_visibility: visibility,
    collect_district: formData.get("collect_district") === "on",
    collect_age_band: formData.get("collect_age_band") === "on",
    starts_at: startsAt,
    ends_at: endsAt,
    updated_at: new Date().toISOString(),
  };

  let surveyId = id;

  if (id) {
    const { error } = await supabase.from("surveys").update(row).eq("id", id);
    if (error) throw new Error("저장에 실패했습니다.");
  } else {
    const typed = normalizeSurveySlug(String(formData.get("slug") ?? ""));
    const { data, error } = await supabase
      .from("surveys")
      .insert({ ...row, slug: typed || fallbackSlug(), created_by: user.id })
      .select("id")
      .single();
    if (error || !data) throw new Error("주소가 이미 쓰이고 있습니다.");
    surveyId = data.id as string;
  }

  // ── 보기 맞추기 ──
  const { data: existing } = await supabase
    .from("survey_options")
    .select("id, label, vote_count")
    .eq("survey_id", surveyId)
    .order("sort_order");

  const olds = (existing ?? []) as {
    id: string;
    label: string;
    vote_count: number;
  }[];

  // 순서대로 짝지어 이름만 고친다. 새 행으로 갈아치우면 이미 받은 표가
  // 딸려 사라진다.
  for (let i = 0; i < labels.length; i++) {
    if (olds[i]) {
      await supabase
        .from("survey_options")
        .update({ label: labels[i], sort_order: i })
        .eq("id", olds[i].id);
    } else {
      await supabase
        .from("survey_options")
        .insert({ survey_id: surveyId, label: labels[i], sort_order: i });
    }
  }
  // 줄어든 만큼은 지운다 — 단, 표가 있는 보기는 남긴다.
  for (let i = labels.length; i < olds.length; i++) {
    if (olds[i].vote_count > 0) continue;
    await supabase.from("survey_options").delete().eq("id", olds[i].id);
  }

  await logAdmin(id ? "update_survey" : "create_survey", {
    targetType: "survey",
    targetId: surveyId,
    memo: title,
  });

  revalidatePath("/admin/surveys");
  revalidatePublic();
  redirect(`/admin/surveys/${surveyId}/results`);
}

/** 진행/종료 전환. 목록에서 한 번에 누른다. */
export async function setSurveyStatus(
  id: string,
  status: SurveyStatus,
): Promise<void> {
  await assertAdmin();
  if (!STATUSES.includes(status)) throw new Error("잘못된 상태입니다.");

  await createServiceClient()
    .from("surveys")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  await logAdmin("set_survey_status", {
    targetType: "survey",
    targetId: id,
    memo: status,
  });
  revalidatePath("/admin/surveys");
  revalidatePublic();
}

/**
 * 삭제.
 *
 * 표가 하나라도 들어온 설문은 지우지 못하게 한다. 주민이 답한 기록을 관리자
 * 한 번의 클릭으로 없앨 수 있으면 안 된다. 접으려면 '종료'로 두면 된다.
 */
export async function deleteSurvey(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("surveys")
    .select("total_votes")
    .eq("id", id)
    .maybeSingle();
  if ((data?.total_votes ?? 0) > 0) {
    throw new Error("이미 참여자가 있는 조사는 지울 수 없습니다. 종료해 주세요.");
  }

  await supabase.from("surveys").delete().eq("id", id);
  await logAdmin("delete_survey", { targetType: "survey", targetId: id });
  revalidatePath("/admin/surveys");
  revalidatePublic();
}
