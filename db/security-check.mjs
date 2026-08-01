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

// --- 남의 데이터 ---
await mustBeEmpty("다른 회원 연락처", u.from("profiles").select("id, phone, kakao_id").neq("id", uid));
await mustBeEmpty("제보 내용", u.from("tips").select("id, body"));
await mustBeEmpty("신고 내용", u.from("reports").select("id, reason"));
await mustBeEmpty("기자 지원서", u.from("reporter_applications").select("id, name, phone"));
await mustBeEmpty("자동 생성 초안", u.from("news_drafts").select("id, title"));
await mustBeEmpty("관리자 감사로그", u.from("admin_audit_logs").select("id, action"));
await mustBeEmpty("기사 조회 원본로그", u.from("article_views").select("id"));
await mustBeEmpty("비로그인의 미발행 기사", anon.from("articles").select("slug").neq("status", "published"));

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
await admin.from("profiles").delete().eq("id", uid);
await admin.auth.admin.deleteUser(uid);

console.log(log.join("\n"));
console.log(`\n통과 ${ok} / 취약 ${bad}`);
process.exit(bad > 0 ? 1 : 0);
