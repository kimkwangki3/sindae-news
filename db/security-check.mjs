// 권한 점검 — 실제 테스트 계정을 만들어 "되면 안 되는 일"을 직접 시도한다.
//
//   node db/security-check.mjs
//
// 화면(앱)이 아니라 Supabase API를 직접 부른다. 앱에서 막아둔 것과 DB에서
// 막힌 것은 다르기 때문이다. 앱만 믿으면 API를 직접 부르는 사람에게 뚫린다.
// 실제로 2026-08-01 점검에서 기사 무단 발행 등 3건이 이렇게 발견됐다.
//
// 끝나면 만든 계정과 데이터를 전부 지운다. 운영 DB에 대고 돌려도 된다.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim()]; }),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = 0, bad = 0;
const log = [];
function record(passed, label, note = "") {
  log.push(`${passed ? "  통과" : "❌ 취약"}  ${label}${note ? `  — ${note}` : ""}`);
  passed ? ok++ : bad++;
}
// 막혀야 하는 쓰기. 0행 매칭은 에러가 안 나므로 반드시 select()로 개수를 본다.
async function mustBlock(label, q) {
  const { data, error } = await q.select();
  record(Boolean(error) || (data ?? []).length === 0, label,
    error ? `차단(${error.code ?? "err"})` : (data ?? []).length ? `${data.length}행 변경됨` : "0행");
}
async function mustBeEmpty(label, q) {
  const { data, error } = await q;
  record(Boolean(error) || (data ?? []).length === 0, label,
    error ? `차단(${error.code ?? "err"})` : (data ?? []).length ? `${data.length}건 읽힘` : "0건");
}
async function mustWork(label, q) {
  const { data, error } = await q;
  record(!error, label, error ? error.message.slice(0, 50) : "정상");
  return data;
}

const EMAIL = `seccheck-${Date.now()}@sdtime.invalid`;
const PASS = "Sec!" + Math.random().toString(36).slice(2, 12);
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email: EMAIL, password: PASS, email_confirm: true,
});
if (cErr) { console.error("테스트 계정 생성 실패:", cErr.message); process.exit(1); }
const uid = created.user.id;
await admin.from("profiles").upsert({
  id: uid, nickname: `점검${Date.now() % 10000}`, neighborhood: "신대지구",
  nickname_set_at: new Date().toISOString(),
});

const u = createClient(URL, ANON, { auth: { persistSession: false } });
await u.auth.signInWithPassword({ email: EMAIL, password: PASS });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const { data: owner } = await admin.from("profiles").select("id").eq("role", "superadmin").limit(1).single();
const { data: art } = await admin.from("articles").select("id, slug").eq("status", "published").limit(1).single();

// --- 정상 동작(막히면 그것도 문제) ---
const post = await mustWork("게시판 글쓰기",
  u.from("board_posts").insert({ author_id: uid, category: "daily", title: "점검용", body: "본문" }).select("id").single());
if (post) await mustWork("댓글 쓰기",
  u.from("board_comments").insert({ post_id: post.id, author_id: uid, body: "점검용" }).select("id").single());
await mustWork("가입 직후 프로필 저장", u.from("profiles").update({ neighborhood: "복성지구" }).eq("id", uid));
await mustWork("공개 기사 읽기", u.from("articles").select("slug").eq("status", "published"));

// --- 권한 상승 ---
await mustBlock("스스로 관리자 되기", u.from("profiles").update({ role: "superadmin" }).eq("id", uid));
await mustBlock("스스로 정기자 되기", u.from("profiles").update({ reporter_level: "senior" }).eq("id", uid));
await mustBlock("관리자 강등시키기", u.from("profiles").update({ role: "member" }).eq("id", owner.id));

// --- 기사 (2026-08-01 취약점 1) ---
const slug = `seccheck-${Date.now()}`;
const { data: fake, error: fErr } = await u.from("articles").insert({
  slug, title: "[점검] 무단 발행 시도", body: "x", category_id: 1,
  status: "published", author_id: uid, published_at: new Date().toISOString(),
}).select("slug").maybeSingle();
record(Boolean(fErr) || !fake, "일반 회원의 기사 무단 발행",
  fErr ? `차단(${fErr.code})` : "게재됨 — 해룡신문 이름으로 아무나 기사를 올릴 수 있다");
if (fake) await admin.from("articles").delete().eq("slug", slug);
await mustBlock("남의 기사 변조", u.from("articles").update({ title: "변조" }).eq("id", art.id));

// --- 승인 우회 (2026-08-01 취약점 2·3) ---
const { data: biz } = await u.from("businesses")
  .insert({ owner_id: uid, name: "점검용업체", category: "food" }).select("id").maybeSingle();
if (biz) await mustBlock("업체 스스로 승인", u.from("businesses").update({ status: "approved" }).eq("id", biz.id));
const { data: org } = await u.from("organizations")
  .insert({ owner_id: uid, name: "점검용단체", category: "etc" }).select("id").maybeSingle();
if (org) await mustBlock("단체 스스로 승인", u.from("organizations").update({ status: "approved" }).eq("id", org.id));

// 사장님·운영진이 자기 정보를 고칠 수 있게 열어 준 뒤로(2026-08-16), 그 문으로
// 무엇까지 되는지 확인한다. 고칠 수 있어야 하는 것과 없어야 하는 것을 함께 본다.
if (biz) {
  await mustWork("본인 업체 소개 수정(되어야 함)",
    u.from("businesses").update({ intro: "점검용 소개" }).eq("id", biz.id));
  await mustBlock("업체명 바꿔 달기",
    u.from("businesses").update({ name: "다른가게로변경" }).eq("id", biz.id));
  await mustBlock("사업자 확인 도장 스스로 찍기",
    u.from("businesses").update({ biz_verified_at: new Date().toISOString() }).eq("id", biz.id));
  await mustBlock("심사자 이름 바꿔치기",
    u.from("businesses").update({ reviewed_by: uid }).eq("id", biz.id));
}
if (org) {
  await mustWork("본인 단체 소개 수정(되어야 함)",
    u.from("organizations").update({ intro: "점검용 소개" }).eq("id", org.id));
  await mustBlock("단체명 바꿔 달기",
    u.from("organizations").update({ name: "다른단체로변경" }).eq("id", org.id));
}
// 남의 가게는 손대지 못해야 한다. 위 셋이 통과한 것은 '내 것'이기 때문이지
// 문이 열려서가 아니다.
const { data: otherBiz } = await admin.from("businesses").select("id").neq("owner_id", uid).limit(1).maybeSingle();
if (otherBiz) await mustBlock("남의 업체 정보 수정",
  u.from("businesses").update({ intro: "남이 고침" }).eq("id", otherBiz.id));
const { data: otherOrg } = await admin.from("organizations").select("id").neq("owner_id", uid).limit(1).maybeSingle();
if (otherOrg) await mustBlock("남의 단체 정보 수정",
  u.from("organizations").update({ intro: "남이 고침" }).eq("id", otherOrg.id));

// --- 남의 데이터 ---
await mustBeEmpty("다른 회원 연락처", u.from("profiles").select("id, phone, kakao_id").neq("id", uid));
await mustBeEmpty("제보 내용", u.from("tips").select("id, body"));
await mustBeEmpty("신고 내용", u.from("reports").select("id, reason"));
await mustBeEmpty("기자 지원서", u.from("reporter_applications").select("id, name, phone"));
await mustBeEmpty("자동 생성 초안", u.from("news_drafts").select("id, title"));
await mustBeEmpty("관리자 감사로그", u.from("admin_audit_logs").select("id, action"));
await mustBeEmpty("기사 조회 원본로그", u.from("article_views").select("id"));
await mustBeEmpty("비로그인의 미발행 기사", anon.from("articles").select("slug").neq("status", "published"));

// --- 설문(주민 의견 조사) ---
// 이 기능은 조작 방지가 존재 이유다. 화면을 거치지 않고 API를 직접 때려서
// DB만으로 막히는지 본다. 화면 검증은 개발자도구 앞에서 아무 의미가 없다.
async function voteCode(label, client, args, expected) {
  const { data, error } = await client.rpc("cast_survey_vote", args);
  const code = error ? `ERR:${error.code}` : data?.code;
  record(code === expected, label, `받은 코드 ${code}`);
}

const sTag = `seccheck-survey-${Date.now()}`;
async function mkSurvey(suffix, fields) {
  const { data } = await admin.from("surveys")
    .insert({ slug: `${sTag}-${suffix}`, title: `[점검] ${suffix}`, ...fields })
    .select("id").single();
  const { data: opts } = await admin.from("survey_options")
    .insert([
      { survey_id: data.id, label: "보기1", sort_order: 0 },
      { survey_id: data.id, label: "보기2", sort_order: 1 },
    ]).select("id");
  return { id: data.id, opt: opts[0].id };
}

const sOpen = await mkSurvey("open", { status: "open" });
const sOther = await mkSurvey("other", { status: "open" });
const sDraft = await mkSurvey("draft", { status: "draft" });
const sClosed = await mkSurvey("closed", { status: "closed" });
const sEnded = await mkSurvey("ended", {
  status: "open", ends_at: new Date(Date.now() - 86400000).toISOString(),
});
const sHidden = await mkSurvey("hidden", {
  status: "open", result_visibility: "after_close",
});

// 정상 투표가 되는지 먼저 본다. 막혀 있으면 나머지 통과는 의미가 없다.
await voteCode("설문 정상 투표", u,
  { p_survey_id: sOpen.id, p_option_id: sOpen.opt, p_district: "신대지구" }, "VOTED");

await voteCode("같은 계정 두 번 투표", u,
  { p_survey_id: sOpen.id, p_option_id: sOpen.opt }, "ALREADY_VOTED");

// 연타 — 브라우저에서 버튼을 빠르게 누르거나 스크립트로 동시에 쏘는 경우.
// 행 잠금과 유니크 인덱스가 함께 막아야 한다.
await Promise.all(Array.from({ length: 10 }, () =>
  u.rpc("cast_survey_vote", { p_survey_id: sOther.id, p_option_id: sOther.opt })));
const { count: burst } = await admin.from("survey_votes")
  .select("id", { count: "exact", head: true }).eq("survey_id", sOther.id);
record(burst === 1, "동시 연타 10회", `${burst}표 기록됨`);

await voteCode("다른 설문의 보기로 투표", u,
  { p_survey_id: sOpen.id, p_option_id: sOther.opt }, "INVALID_OPTION");
await voteCode("초안 설문에 투표", u,
  { p_survey_id: sDraft.id, p_option_id: sDraft.opt }, "SURVEY_NOT_OPEN");
await voteCode("종료된 설문에 투표", u,
  { p_survey_id: sClosed.id, p_option_id: sClosed.opt }, "SURVEY_NOT_OPEN");
await voteCode("기간이 지난 설문에 투표", u,
  { p_survey_id: sEnded.id, p_option_id: sEnded.opt }, "ALREADY_ENDED");
// 진행 중 설문에 넣어야 한다. 함수는 기간 → 보기 → 선택값 순으로 보므로
// 끝난 설문에 넣으면 지구 검증에 닿기도 전에 ALREADY_ENDED 로 끊긴다.
// 이 계정은 sOpen 에 이미 투표했지만, 선택값 검증이 저장보다 앞이라
// 허용 목록이 살아 있으면 ALREADY_VOTED 가 아니라 INVALID_* 가 나온다.
await voteCode("거주지구에 임의 문자열", u,
  { p_survey_id: sOpen.id, p_option_id: sOpen.opt, p_district: "<script>" },
  "INVALID_DISTRICT");
await voteCode("연령대에 임의 문자열", u,
  { p_survey_id: sOpen.id, p_option_id: sOpen.opt, p_age_band: "99대" },
  "INVALID_AGE_BAND");

// 비로그인 — 실행 권한이 없어 차단되거나(42501) 함수가 거절해야 한다.
const { data: anonVote, error: anonErr } = await anon.rpc("cast_survey_vote",
  { p_survey_id: sOpen.id, p_option_id: sOpen.opt });
record(Boolean(anonErr) || anonVote?.code === "UNAUTHENTICATED",
  "비로그인 투표", anonErr ? `차단(${anonErr.code})` : `code=${anonVote?.code}`);

// 함수를 건너뛰고 테이블을 직접 건드리는 경로. 여기가 뚫리면 1인 1표가 무너진다.
await mustBlock("투표 테이블 직접 INSERT",
  u.from("survey_votes").insert({
    survey_id: sOpen.id, option_id: sOpen.opt, user_id: uid }));
await mustBlock("집계 숫자 직접 조작",
  u.from("survey_options").update({ vote_count: 9999 }).eq("id", sOpen.opt));
await mustBlock("일반 회원이 설문 개설",
  u.from("surveys").insert({ slug: `${sTag}-hack`, title: "[점검] 무단 개설", status: "open" }));
await mustBlock("설문을 임의로 종료",
  u.from("surveys").update({ status: "closed" }).eq("id", sOpen.id));

// 남의 표를 들여다보는 경로. 참여자가 적으면 누가 뭘 골랐는지 드러난다.
await mustBeEmpty("남의 투표 내역",
  u.from("survey_votes").select("id, user_id, option_id").neq("user_id", uid));
await mustBeEmpty("비로그인의 투표 내역", anon.from("survey_votes").select("id"));
await mustBeEmpty("초안 설문 열람", anon.from("surveys").select("id").eq("status", "draft"));

// '종료 후 공개' 설문의 진행 중 판세. 화면에서만 감추면 API로 새어 나간다.
const { data: hidden } = await anon.rpc("get_survey_results", { p_survey_id: sHidden.id });
record(hidden === null, "종료 후 공개 설문의 진행 중 결과", hidden ? "집계가 노출됨" : "가려짐");
const { data: shown } = await anon.rpc("get_survey_results", { p_survey_id: sOpen.id });
record(shown !== null, "즉시 공개 설문의 결과 조회", shown ? "정상" : "막힘");

// --- 관리자 경로가 여전히 되는지 (수정이 운영을 막지 않았는지) ---
const svcSlug = `seccheck-svc-${Date.now()}`;
await mustWork("service_role 기사 발행(관리자 경로)",
  admin.from("articles").insert({ slug: svcSlug, title: "[점검] 관리자 발행", category_id: 1, status: "published", published_at: new Date().toISOString() }).select("slug").single());
await admin.from("articles").delete().eq("slug", svcSlug);

// --- 정리 ---
await admin.from("board_comments").delete().eq("author_id", uid);
await admin.from("board_posts").delete().eq("author_id", uid);
await admin.from("businesses").delete().eq("owner_id", uid);
await admin.from("organizations").delete().eq("owner_id", uid);
await admin.from("articles").delete().like("slug", "seccheck-%");
// 설문은 보기·투표가 cascade로 함께 지워진다.
await admin.from("surveys").delete().like("slug", "seccheck-survey-%");
await admin.from("profiles").delete().eq("id", uid);
await admin.auth.admin.deleteUser(uid);

console.log(log.join("\n"));
console.log(`\n통과 ${ok} / 취약 ${bad}`);
process.exit(bad > 0 ? 1 : 0);
