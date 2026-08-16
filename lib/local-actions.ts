"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { can } from "./permissions";
import { createClient, createServiceClient } from "./supabase/server";
import { parsePhotoUrls } from "./photos";
import { notify } from "./telegram";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.is_suspended) throw new Error("정지된 계정은 이용할 수 없습니다.");
  return user;
}

// --- 업체 ----------------------------------------------------------
// 업체 등록 신청 — 로그인 필수, 1인 1개. businesses insert(status=pending → 관리자 승인).
export async function registerBusiness(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) throw new Error("업체명을 입력해 주세요.");

  const photoUrls = parsePhotoUrls(formData.get("photos"), 5);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      name,
      category: String(formData.get("category") ?? "food"),
      address: String(formData.get("address") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      biz_reg_no: String(formData.get("biz_reg_no") ?? "").trim() || null,
      kakao_channel: String(formData.get("kakao_channel") ?? "").trim() || null,
      hours_open: String(formData.get("hours_open") ?? "") || null,
      hours_close: String(formData.get("hours_close") ?? "") || null,
      is_24h: formData.get("is_24h") === "on",
      intro: String(formData.get("intro") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(
      "등록에 실패했습니다. 이미 등록한 업체가 있는지 확인해 주세요.",
    );
  }
  if (photoUrls.length) {
    await supabase
      .from("business_photos")
      .insert(
        photoUrls.map((url, sort) => ({
          business_id: (data as { id: string }).id,
          url,
          sort,
        })),
      );
  }

  await notify({
    type: "business",
    name,
    category: String(formData.get("category") ?? "food"),
    owner: user.nickname ?? "익명",
  });
  redirect("/district");
}

// 홍보 글쓰기 — 승인된 본인 업체만. promo_posts insert(status=pending).
export async function writePromo(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "write_promo")) {
    throw new Error("승인된 업체만 홍보 글을 작성할 수 있습니다.");
  }
  const businessId = user.business?.id ?? "";
  if (!businessId) throw new Error("업체 정보를 찾을 수 없습니다.");
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) throw new Error("제목을 입력해 주세요.");

  const photoUrls = parsePhotoUrls(formData.get("photo_urls"), 5);
  const supabase = createClient();
  const { error } = await supabase.from("promo_posts").insert({
    business_id: businessId,
    author_id: user.id,
    title,
    category: String(formData.get("category") ?? "") || null,
    body: String(formData.get("body") ?? "").trim() || null,
    photo_urls: photoUrls.length ? photoUrls : null,
  });
  if (error) throw new Error("등록에 실패했습니다.");
  revalidatePath(`/district/${businessId}`);
  redirect(`/district/${businessId}`);
}

export interface BizEditState {
  ok?: boolean;
  error?: string;
}

// 요일 체크박스 허용값. 임의 문자열이 배열로 들어가면 화면이 깨진다.
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일", "연중무휴"];

/**
 * 업체 정보 수정 — 그 업체를 등록한 사장님만.
 *
 * 업체명은 받지 않는다. 상호를 고칠 수 있게 열면 분식집으로 승인받아 놓고
 * 다른 이름으로 바꿔 다는 일이 가능해진다. 신문이 확인해 실어 준 것은
 * '그 이름의 그 가게'다. DB 트리거로도 막아 뒀다
 * (db/business-verify-migration.sql).
 *
 * 승인 상태와 사업자 확인 기록도 받지 않는다 — 스스로 승인 도장을 찍는 길이
 * 열리면 이 목록을 믿을 이유가 없어진다. 그쪽도 트리거가 막는다.
 */
export async function updateBusiness(
  businessId: string,
  _prev: BizEditState,
  formData: FormData,
): Promise<BizEditState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (user.is_suspended) return { error: "정지된 계정은 이용할 수 없습니다." };

  // 승인 전(pending)이어도 본인 업체면 고칠 수 있어야 한다. can()의
  // write_promo 는 '승인된' 업체만 보므로 여기서는 소유 여부만 확인한다.
  if (!user.businesses.some((b) => b.id === businessId)) {
    return { error: "이 업체를 등록한 분만 수정할 수 있습니다." };
  }

  const is24h = formData.get("is_24h") === "on";
  const closedDays = formData
    .getAll("closed_days")
    .map(String)
    .filter((d) => WEEKDAYS.includes(d));

  const supabase = createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      category: String(formData.get("category") ?? "food"),
      address: String(formData.get("address") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      kakao_channel:
        String(formData.get("kakao_channel") ?? "").trim() || null,
      // 24시간 영업이면 여닫는 시각이 뜻을 잃는다. 남겨두면 화면에
      // "24시간 영업 09:00~21:00" 같은 말이 안 되는 줄이 생긴다.
      hours_open: is24h ? null : String(formData.get("hours_open") ?? "") || null,
      hours_close: is24h
        ? null
        : String(formData.get("hours_close") ?? "") || null,
      is_24h: is24h,
      closed_days: closedDays.length ? closedDays : null,
      intro: String(formData.get("intro") ?? "").trim() || null,
    })
    .eq("id", businessId);
  if (error) return { error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };

  // 사진은 통째로 다시 쓴다(단체와 같은 방식).
  const photoUrls = parsePhotoUrls(formData.get("photos"), 5);
  await supabase.from("business_photos").delete().eq("business_id", businessId);
  if (photoUrls.length) {
    await supabase
      .from("business_photos")
      .insert(
        photoUrls.map((url, sort) => ({ business_id: businessId, url, sort })),
      );
  }

  revalidatePath(`/district/${businessId}`);
  revalidatePath("/district");
  return { ok: true };
}

// --- 단체 ----------------------------------------------------------

// 이름 비교용 정규화. DB 인덱스가 쓰는 식과 같은 규칙이어야 한다
// (lower + 공백 제거). 한쪽만 바꾸면 앱은 통과시키고 DB가 거부하는,
// 사용자에게 아무 설명도 못 해주는 상태가 된다.
function normalizeOrgName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

/**
 * 설립 연도 입력값 → 저장할 값. 비었거나 말이 안 되면 null.
 *
 * DB의 CHECK 는 자리수(1900~2100)만 본다. "내년 이후는 오타"라는 판단은
 * 지금 몇 년인지를 알아야 하는데 CHECK 제약에는 그걸 묻는 함수를 쓸 수 없다.
 * 그래서 그 몫은 여기가 진다.
 */
function parseFoundedYear(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n)) return null;
  const thisYear = new Date().getFullYear();
  return n >= 1900 && n <= thisYear ? n : null;
}

/** 같은 이름의 단체가 이미 있는지. 거절된 것은 세지 않는다. */
async function orgNameTaken(name: string): Promise<boolean> {
  const key = normalizeOrgName(name);
  if (!key) return false;

  // service role 로 읽는다. 일반 회원 권한으로는 승인된 단체만 보이는데,
  // 막아야 할 것은 '승인 대기 중인 같은 이름'이다. 그걸 못 보면 검사가
  // 헛돈다. 밖으로 나가는 것은 이름이 겹치는지 여부(true/false)뿐이다.
  const { data } = await createServiceClient()
    .from("organizations")
    .select("name, status")
    .neq("status", "rejected");

  return ((data ?? []) as { name: string }[]).some(
    (o) => normalizeOrgName(o.name) === key,
  );
}

export interface OrgRegisterState {
  error?: string;
}

// 단체 등록 신청 — 로그인 필수. organizations insert(status=pending) + 본인 owner 멤버십.
//
// 오류를 던지지 않고 돌려주는 이유: 서버 액션이 던진 오류 메시지는 운영
// 환경에서 가려진다(스키마가 새어 나가지 않게 Next가 일부러 지운다). 그러면
// 주민에게는 아무 설명 없는 오류 화면만 남는다. 중복 이름 안내처럼 실제로
// 자주 뜰 말은 화면까지 닿아야 한다.
export async function registerOrg(
  _prev: OrgRegisterState,
  formData: FormData,
): Promise<OrgRegisterState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "단체명을 입력해 주세요." };

  const supabase = createClient();

  // 같은 이름으로 이미 올라와 있으면 여기서 돌려보낸다.
  //
  // 이건 안내용이다. 진짜 차단은 DB의 유니크 인덱스가 한다
  // (db/orgs-migration.sql) — 두 사람이 동시에 같은 이름을 넣으면
  // 둘 다 이 검사를 통과하기 때문이다. 그래도 여기서 먼저 보는 이유는,
  // 인덱스에 걸려 나오는 오류는 사람이 읽을 수 있는 말이 아니어서다.
  //
  // 띄어쓰기를 지우고 비교한다. "신대지구 발전위원회"와 "신대지구발전위원회"는
  // 같은 단체이지 다른 단체가 아니다.
  if (await orgNameTaken(name)) {
    return {
      error: `'${name}'은(는) 이미 등록되어 있습니다. 같은 단체라면 단체 페이지에서 가입을 신청해 주세요.`,
    };
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      owner_id: user.id,
      name,
      category: String(formData.get("category") ?? "self"),
      leader: String(formData.get("leader") ?? "").trim() || null,
      region: String(formData.get("region") ?? "").trim() || null,
      contact: String(formData.get("contact") ?? "").trim() || null,
      kakao_channel: String(formData.get("kakao_channel") ?? "").trim() || null,
      accept_join: formData.get("accept_join") === "on",
      intro: String(formData.get("intro") ?? "").trim() || null,
      founded_year: parseFoundedYear(formData.get("founded_year")),
    })
    .select("id")
    .single();
  if (error || !data) {
    // DB의 유니크 인덱스에 걸린 경우(위 검사와 저장 사이에 누가 먼저 넣었을 때).
    // 23505 = unique_violation.
    if (error?.code === "23505") {
      return { error: `'${name}'은(는) 방금 다른 분이 등록했습니다.` };
    }
    return { error: "등록에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const orgId = (data as { id: string }).id;

  // 등록자는 owner(approved)로 멤버 등록
  await supabase.from("org_members").insert({
    org_id: orgId,
    user_id: user.id,
    role: "owner",
    status: "approved",
    apply_name: user.nickname ?? null,
  });

  const photoUrls = parsePhotoUrls(formData.get("photos"), 5);
  if (photoUrls.length) {
    await supabase
      .from("org_photos")
      .insert(photoUrls.map((url, sort) => ({ org_id: orgId, url, sort })));
  }

  await notify({
    type: "organization",
    name,
    category: String(formData.get("category") ?? "self"),
    owner: user.nickname ?? "익명",
  });
  redirect("/orgs");
}

export interface OrgEditState {
  ok?: boolean;
  error?: string;
}

/**
 * 단체 소개 수정 — 그 단체 운영진(owner·staff)만.
 *
 * 단체명은 받지 않는다. 이름은 단체를 가리키는 이름표라, 주민이 가입해 둔
 * 단체의 이름이 어느 날 다른 것으로 바뀌어 있으면 안 된다. 중복 등록을 막아둔
 * 약속도 '수정'으로 되살아난다. DB에도 같은 규칙을 트리거로 걸어 뒀다
 * (db/orgs-migration.sql) — 이 화면을 거치지 않아도 이름은 바뀌지 않는다.
 */
export async function updateOrg(
  orgId: string,
  _prev: OrgEditState,
  formData: FormData,
): Promise<OrgEditState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (user.is_suspended) return { error: "정지된 계정은 이용할 수 없습니다." };
  // 운영진 판정은 기존 권한 함수를 그대로 쓴다(가입 승인과 같은 기준).
  if (!can(user, "approve_member", { orgId })) {
    return { error: "단체 운영진만 수정할 수 있습니다." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      category: String(formData.get("category") ?? "self"),
      leader: String(formData.get("leader") ?? "").trim() || null,
      region: String(formData.get("region") ?? "").trim() || null,
      contact: String(formData.get("contact") ?? "").trim() || null,
      kakao_channel:
        String(formData.get("kakao_channel") ?? "").trim() || null,
      accept_join: formData.get("accept_join") === "on",
      intro: String(formData.get("intro") ?? "").trim() || null,
      founded_year: parseFoundedYear(formData.get("founded_year")),
    })
    .eq("id", orgId);
  if (error) return { error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };

  // 사진은 통째로 다시 쓴다. 순서를 바꾸거나 한 장을 빼는 것을 낱장 단위로
  // 맞추려면 화면이 복잡해지는데, 다섯 장짜리 목록에 그럴 값이 없다.
  const photoUrls = parsePhotoUrls(formData.get("photos"), 5);
  await supabase.from("org_photos").delete().eq("org_id", orgId);
  if (photoUrls.length) {
    await supabase
      .from("org_photos")
      .insert(photoUrls.map((url, sort) => ({ org_id: orgId, url, sort })));
  }

  revalidatePath(`/orgs/${orgId}`);
  revalidatePath("/orgs");
  return { ok: true };
}

export interface JoinState {
  ok?: boolean;
  error?: string;
}

// 단체 가입 신청 — 로그인 필수. org_members insert(status=pending). orgId는 bind 선주입.
export async function joinOrg(
  orgId: string,
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "이름을 입력해 주세요." };
  if (formData.get("agree") !== "on") {
    return { error: "개인정보 제공에 동의해 주세요." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("org_members").insert({
    org_id: orgId,
    user_id: user.id,
    role: "member",
    status: "pending",
    apply_name: name,
    apply_phone: String(formData.get("phone") ?? "").trim() || null,
    neighborhood: String(formData.get("neighborhood") ?? "").trim() || null,
    motivation: String(formData.get("motivation") ?? "").trim() || null,
  });
  if (error) {
    return { error: "이미 신청했거나 가입된 단체입니다." };
  }
  return { ok: true };
}

// 단체 소식 글쓰기 — 해당 단체 운영진만. org_posts insert.
export async function writeOrgPost(
  orgId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  if (!can(user, "write_org_post", { orgId })) {
    throw new Error("단체 운영진만 소식을 작성할 수 있습니다.");
  }
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) throw new Error("제목을 입력해 주세요.");

  // 단체 소식은 별도 테이블이 아니라 동네 게시판에 올린다(org_id로 소속 표시).
  // 그래야 단체 활동이 게시판에서도 보이고, 단체 상세에서는 걸러 보여줄 수 있다.
  const photoUrls = parsePhotoUrls(formData.get("photo_urls"), 5);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .insert({
      org_id: orgId,
      author_id: user.id,
      title,
      category: String(formData.get("category") ?? "") || "local",
      body: String(formData.get("body") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("등록에 실패했습니다.");

  if (photoUrls.length) {
    await supabase.from("board_photos").insert(
      photoUrls.map((url, sort) => ({
        post_id: (data as { id: string }).id,
        url,
        sort,
      })),
    );
  }

  revalidatePath(`/orgs/${orgId}`);
  revalidatePath("/board");
  redirect(`/board/${(data as { id: string }).id}`);
}

// 가입 신청 승인/거절 — 운영진만. org_members update(status).
export async function decideMember(
  orgId: string,
  memberId: string,
  decision: "approved" | "rejected",
): Promise<void> {
  const user = await requireUser();
  if (!can(user, "approve_member", { orgId })) {
    throw new Error("권한이 없습니다.");
  }
  const supabase = createClient();
  await supabase
    .from("org_members")
    .update({ status: decision })
    .eq("id", Number(memberId))
    .eq("org_id", orgId);
  revalidatePath(`/orgs/${orgId}/manage`);
}

// 회원 내보내기 — 운영진만. org_members delete.
export async function removeMember(
  orgId: string,
  memberId: string,
): Promise<void> {
  const user = await requireUser();
  if (!can(user, "approve_member", { orgId })) {
    throw new Error("권한이 없습니다.");
  }
  const supabase = createClient();
  await supabase
    .from("org_members")
    .delete()
    .eq("id", Number(memberId))
    .eq("org_id", orgId);
  revalidatePath(`/orgs/${orgId}/manage`);
}

// ---------------------------------------------------------------------
// 업체 리뷰·별점 — 로그인 회원, 1업체 1건. 다시 쓰면 기존 리뷰가 갱신된다.
// ---------------------------------------------------------------------
export interface ReviewState {
  ok?: boolean;
  error?: string;
}

export async function saveBusinessReview(
  businessId: string,
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (user.is_suspended) return { error: "정지된 계정은 이용할 수 없습니다." };

  const rating = Number(formData.get("rating") ?? 0);
  const body = String(formData.get("body") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "별점을 선택해 주세요." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("business_reviews").upsert(
    {
      business_id: businessId,
      author_id: user.id,
      rating,
      body: body || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id,author_id" },
  );
  if (error) return { error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };

  revalidatePath(`/district/${businessId}`);
  revalidatePath("/district");
  return { ok: true };
}

export async function deleteBusinessReview(
  businessId: string,
  reviewId: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = createClient();
  // RLS가 본인/운영진만 삭제하도록 막지만, 앱에서도 작성자를 한 번 더 건다.
  await supabase
    .from("business_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("author_id", user.id);
  revalidatePath(`/district/${businessId}`);
  revalidatePath("/district");
}
