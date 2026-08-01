// 보안 자동 점검 — 매일 GitHub Actions에서 실행. 이상이 있으면 텔레그램으로 알린다.
//
//   node automation/security-audit.mjs          (조용히 점검, 문제 있을 때만 알림)
//   node automation/security-audit.mjs --loud   (이상 없어도 결과를 보냄)
//
// 왜 앱이 아니라 API를 직접 두드리는가:
//   화면에서 막혀 있어도 Supabase API를 직접 부르면 뚫리는 경우가 실제로 있었다
//   (2026-08-01 점검에서 기사 무단 발행 등 3건). 공격자는 화면을 쓰지 않는다.
//
// 무엇을 잡는가:
//   · 권한 우회가 다시 열림(정책·트리거가 지워지거나 새 경로가 생김)
//   · 관리자·기자 권한이 몰래 늘어남
//   · 기자가 아닌 사람 이름으로 기사가 게재됨
// 무엇을 못 잡는가:
//   · 실시간 침입(하루 한 번 점검이다)
//   · 서비스 키 자체가 유출된 경우(그 키로는 무엇이든 가능하다)

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOUD = process.argv.includes("--loud");

// GitHub Actions면 환경변수, 로컬이면 .env.local 에서 읽는다.
function config() {
  const local = path.join(HERE, "..", ".env.local");
  if (!process.env.SUPABASE_URL && fs.existsSync(local)) {
    for (const l of fs.readFileSync(local, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z_]+)=(.*)$/.exec(l);
      if (m) process.env[m[1]] ??= m[2].trim();
    }
    process.env.SUPABASE_URL ??= process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_ANON_KEY ??= process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  const need = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = need.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`환경변수 없음: ${missing.join(", ")}`);
    process.exit(1);
  }
}
config();

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const svc = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const problems = [];
const notes = [];

// ---------------------------------------------------------------------
// 1. 실제 계정을 만들어 "되면 안 되는 일"을 시도한다
// ---------------------------------------------------------------------
async function probeWithRealAccount() {
  const email = `audit-${Date.now()}@sdtime.invalid`;
  const password = "Aud!" + Math.random().toString(36).slice(2, 12);
  const { data: made, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) { problems.push(`점검 계정을 만들지 못했습니다: ${error.message}`); return; }
  const uid = made.user.id;

  try {
    await svc.from("profiles").upsert({
      id: uid, nickname: `점검${Date.now() % 100000}`, neighborhood: "신대지구",
      nickname_set_at: new Date().toISOString(),
    });
    const u = createClient(URL, ANON, { auth: { persistSession: false } });
    await u.auth.signInWithPassword({ email, password });

    // 막혀야 하는 쓰기. 0행 매칭은 에러가 없으므로 select()로 개수를 확인한다.
    const blocked = async (label, q) => {
      const { data, error: e } = await q.select();
      if (!e && (data ?? []).length > 0) problems.push(`${label} — ${data.length}행이 바뀌었습니다`);
    };

    await blocked("일반 회원이 스스로 관리자가 될 수 있습니다",
      u.from("profiles").update({ role: "superadmin" }).eq("id", uid));
    await blocked("일반 회원이 스스로 정기자가 될 수 있습니다",
      u.from("profiles").update({ reporter_level: "senior" }).eq("id", uid));

    const slug = `audit-${Date.now()}`;
    const { data: fake } = await u.from("articles").insert({
      slug, title: "[보안점검] 무단 발행 시도", body: "x", category_id: 1,
      status: "published", author_id: uid, published_at: new Date().toISOString(),
    }).select("slug").maybeSingle();
    if (fake) {
      problems.push("⚠ 일반 회원이 기사를 발행할 수 있습니다 — 해룡신문 이름으로 아무나 글을 올릴 수 있는 상태입니다");
      await svc.from("articles").delete().eq("slug", slug);
    }

    const { data: biz } = await u.from("businesses")
      .insert({ owner_id: uid, name: "점검용업체", category: "food" }).select("id").maybeSingle();
    if (biz) await blocked("업체가 스스로 승인 상태로 바뀔 수 있습니다",
      u.from("businesses").update({ status: "approved" }).eq("id", biz.id));
    const { data: org } = await u.from("organizations")
      .insert({ owner_id: uid, name: "점검용단체", category: "etc" }).select("id").maybeSingle();
    if (org) await blocked("단체가 스스로 승인 상태로 바뀔 수 있습니다",
      u.from("organizations").update({ status: "approved" }).eq("id", org.id));

    // 남의 데이터가 읽히면 안 된다
    const leak = async (label, q) => {
      const { data, error: e } = await q;
      if (!e && (data ?? []).length > 0) problems.push(`${label} — ${data.length}건이 읽혔습니다`);
    };
    await leak("다른 회원 연락처가 노출됩니다", u.from("profiles").select("id, phone, kakao_id").neq("id", uid));
    await leak("제보 내용이 노출됩니다", u.from("tips").select("id, body"));
    await leak("신고 내용이 노출됩니다", u.from("reports").select("id, reason"));
    await leak("기자 지원서가 노출됩니다", u.from("reporter_applications").select("id, name, phone"));
    await leak("자동 생성 초안이 노출됩니다", u.from("news_drafts").select("id, title"));
    await leak("관리자 감사로그가 노출됩니다", u.from("admin_audit_logs").select("id, action"));
    await leak("비로그인에게 미발행 기사가 노출됩니다", anon.from("articles").select("slug").neq("status", "published"));

    // 관리자 경로가 살아 있는지(수정이 운영을 막지 않았는지)
    const svcSlug = `audit-svc-${Date.now()}`;
    const { error: aErr } = await svc.from("articles").insert({
      slug: svcSlug, title: "[보안점검] 관리자 발행", category_id: 1,
      status: "published", published_at: new Date().toISOString(),
    }).select();
    if (aErr) problems.push(`관리자 기사 발행이 막혀 있습니다 — 자동 게재가 동작하지 않습니다: ${aErr.message}`);
    await svc.from("articles").delete().eq("slug", svcSlug);
  } finally {
    await svc.from("board_comments").delete().eq("author_id", uid);
    await svc.from("board_posts").delete().eq("author_id", uid);
    await svc.from("businesses").delete().eq("owner_id", uid);
    await svc.from("organizations").delete().eq("owner_id", uid);
    await svc.from("profiles").delete().eq("id", uid);
    await svc.auth.admin.deleteUser(uid);
  }
}

// ---------------------------------------------------------------------
// 2. 권한을 가진 사람이 몰래 늘지 않았는가
// ---------------------------------------------------------------------
async function checkRoster() {
  const base = JSON.parse(fs.readFileSync(path.join(HERE, "security-baseline.json"), "utf8"));
  const { data: admins } = await svc.from("profiles").select("id, nickname, role").in("role", ["admin", "superadmin"]);
  const known = new Set(base.admins.map((a) => a.id));
  for (const a of admins ?? []) {
    if (!known.has(a.id)) problems.push(`⚠ 등록되지 않은 관리자가 있습니다: ${a.nickname} (${a.role})`);
  }
  for (const a of base.admins) {
    if (!(admins ?? []).some((x) => x.id === a.id)) notes.push(`관리자 ${a.nickname} 계정이 사라졌습니다`);
  }

  const { data: reps } = await svc.from("profiles").select("id, nickname, reporter_level")
    .in("reporter_level", ["junior", "senior"]);
  const knownRep = new Set((base.reporters ?? []).map((r) => r.id));
  for (const r of reps ?? []) {
    if (!knownRep.has(r.id)) problems.push(`등록되지 않은 기자 권한이 있습니다: ${r.nickname} (${r.reporter_level})`);
  }
}

// ---------------------------------------------------------------------
// 3. 권한 없는 사람 이름으로 나간 기사가 있는가
// ---------------------------------------------------------------------
async function checkArticleAuthors() {
  const { data: arts } = await svc.from("articles")
    .select("slug, title, author_id").eq("status", "published");
  const ids = [...new Set((arts ?? []).map((a) => a.author_id).filter(Boolean))];
  if (!ids.length) return;
  const { data: who } = await svc.from("profiles").select("id, nickname, role, reporter_level").in("id", ids);
  const allowed = new Set((who ?? []).filter((p) =>
    ["admin", "superadmin"].includes(p.role) || ["junior", "senior"].includes(p.reporter_level)
  ).map((p) => p.id));
  for (const a of arts ?? []) {
    if (a.author_id && !allowed.has(a.author_id)) {
      problems.push(`⚠ 권한 없는 사람 이름으로 게재된 기사: "${a.title.slice(0, 30)}" (/article/${a.slug})`);
    }
  }
}

// ---------------------------------------------------------------------
async function alert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.log("(텔레그램 설정 없음 — 알림 생략)"); return; }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10000),
  }).catch((e) => console.error("알림 전송 실패:", e.message));
}

try {
  await probeWithRealAccount();
  await checkRoster();
  await checkArticleAuthors();
} catch (e) {
  problems.push(`점검 자체가 실패했습니다: ${e.message}`);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

if (problems.length) {
  console.error(problems.join("\n"));
  await alert([
    "<b>🚨 보안 점검 — 조치가 필요합니다</b>",
    "",
    ...problems.map((p) => `· ${esc(p)}`),
    "",
    "확인: db/security-fix-migration.sql 을 다시 실행했는지,",
    "관리자를 늘렸다면 automation/security-baseline.json 을 고쳤는지 보세요.",
  ].join("\n"));
} else {
  console.log("이상 없음");
  if (LOUD) await alert("<b>🔒 보안 점검 — 이상 없음</b>\n권한 우회·관리자 변동·무단 게재 모두 없습니다.");
}
if (notes.length) console.log(notes.join("\n"));

process.exit(problems.length ? 1 : 0);
