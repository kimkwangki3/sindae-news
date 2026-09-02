// 크롤러 감시 — 매시간 GitHub Actions에서 실행. 훑고 간 것이 있으면 텔레그램으로 알린다.
//
//   node automation/bot-watch.mjs          (감지됐을 때만 알림)
//   node automation/bot-watch.mjs --loud   (없어도 결과를 보냄. 손으로 확인할 때)
//   node automation/bot-watch.mjs --dry    (텔레그램으로 보내지 않고 화면에만)
//
// ── 무엇을 알리는가 ──────────────────────────────────────────────────
//
// 이름을 밝히는 봇(구글·네이버 색인 등)은 알리지 않는다. 매일 오고, 와야
// 하는 것들이다. 알림이 매일 울리면 곧 안 보게 된다.
//
// 알리는 것은 '이름을 숨기고 훑는 것'뿐이다 — db/bot-detection-migration.sql
// 의 bot_visitors() 가 reason='훑는 모양'으로 판정한 방문자들. 2026-09-02
// 새벽에 온 것이 그 종류였다(방문자 59명 중 56명, 31~32초 간격으로 태그 35개).
//
// ── 같은 일로 두 번 울리지 않게 ──────────────────────────────────────
//
// 알린 뒤 bot_alerts 에 어디까지 알렸는지 적는다. 다음 실행은 그 시각보다
// 새로운 것만 본다. 크롤링 한 번이 두 시간에 걸쳐도 알림은 이어서 하나씩만
// 온다(같은 구간을 다시 세지 않는다).

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOUD = process.argv.includes("--loud");
const DRY = process.argv.includes("--dry");

// 알림을 낼 최소 규모. 이보다 적으면 조용히 표시만 하고 넘어간다 —
// 서너 건은 사람의 우연한 겹침일 수 있다.
const MIN_VISITORS = 5;
// 처음 실행이거나 알림 기록이 없을 때 되짚어볼 시간.
const LOOKBACK_HOURS = 24;

// GitHub Actions면 환경변수, 로컬이면 .env.local 에서 읽는다.
// (automation/security-audit.mjs 와 같은 방식)
function config() {
  const local = path.join(HERE, "..", ".env.local");
  if (!process.env.SUPABASE_URL && fs.existsSync(local)) {
    for (const l of fs.readFileSync(local, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z_]+)=(.*)$/.exec(l);
      if (m) process.env[m[1]] ??= m[2].trim();
    }
    process.env.SUPABASE_URL ??= process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  const need = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = need.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`환경변수 없음: ${missing.join(", ")}`);
    process.exit(1);
  }
}
config();

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const API = "https://api.telegram.org";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clip(s, max) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

// 한국시간으로 읽기 좋게. 서버도 Actions도 UTC로 돈다.
function kst(iso, withDate = false) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const hm = d.toISOString().slice(11, 16);
  return withDate ? `${d.toISOString().slice(5, 10).replace("-", "/")} ${hm}` : hm;
}

async function send(text) {
  if (DRY || !TOKEN || !CHAT_ID) {
    console.log("--- 보내지 않음(텔레그램 미설정 또는 --dry) ---");
    console.log(text.replace(/<[^>]+>/g, ""));
    return;
  }
  try {
    const res = await fetch(`${API}/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json();
    if (!json.ok) console.error(`[telegram] 발송 실패: ${json.description}`);
  } catch (e) {
    console.error(`[telegram] 발송 오류: ${e.message}`);
  }
}

async function main() {
  // 1) 판정을 최신으로. pg_cron 이 매시간 하지만, 그것이 꺼져 있어도
  //    이 감시만으로 집계가 유지되도록 여기서도 한 번 부른다.
  const { error: markErr } = await db.rpc("mark_bot_visits", { p_hours: LOOKBACK_HOURS });
  if (markErr) {
    console.error(`mark_bot_visits 실패: ${markErr.message}`);
    console.error("db/bot-detection-migration.sql 을 실행했는지 확인할 것.");
    process.exit(1);
  }

  // 2) 어디까지 알렸나
  const { data: lastRows } = await db
    .from("bot_alerts")
    .select("detected_to")
    .order("detected_to", { ascending: false })
    .limit(1);

  const lookbackFrom = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);
  const lastTo = lastRows?.[0]?.detected_to ? new Date(lastRows[0].detected_to) : null;
  // 판정에는 앞뒤 맥락이 필요하므로 조회는 넉넉히 하고, 걸러내기는 아래에서 한다.
  const from = lookbackFrom;

  const { data: bots, error } = await db.rpc("bot_visitors", {
    p_from: from.toISOString(),
    p_to: new Date().toISOString(),
  });
  if (error) {
    console.error(`bot_visitors 실패: ${error.message}`);
    process.exit(1);
  }

  const all = bots ?? [];
  // 이름을 밝히는 봇은 알리지 않는다 — 와야 하는 것들이다.
  const disguised = all.filter((b) => b.reason === "훑는 모양");
  // 이미 알린 구간은 뺀다.
  const fresh = lastTo
    ? disguised.filter((b) => new Date(b.first_at) > lastTo)
    : disguised;

  const named = all.length - disguised.length;
  console.log(
    `최근 ${LOOKBACK_HOURS}시간: 이름을 밝힌 봇 ${named}, 훑는 모양 ${disguised.length}` +
      ` (그중 새로운 것 ${fresh.length})`,
  );

  if (fresh.length < MIN_VISITORS) {
    if (LOUD) {
      await send(
        `<b>🤖 크롤러 감시</b>\n\n최근 ${LOOKBACK_HOURS}시간 안에 새로 훑고 간 것은 없습니다.` +
          `\n(이름을 밝힌 봇 ${named}건은 정상이라 세지 않습니다)`,
      );
    }
    return;
  }

  // 3) 알림 한 통
  const times = fresh.map((b) => new Date(b.first_at).getTime());
  const detectedFrom = new Date(Math.min(...times));
  const detectedTo = new Date(Math.max(...fresh.map((b) => new Date(b.last_at).getTime())));
  const paths = [...new Set(fresh.map((b) => b.sample_path).filter(Boolean))];
  const uas = [...new Set(fresh.map((b) => b.user_agent).filter(Boolean))];
  const ips = new Set(fresh.map((b) => b.ip_hash)).size;

  // 몇 초 간격으로 훑었는지 — 사람이 아님을 한눈에 보여주는 숫자다.
  const sorted = [...times].sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((t, i) => Math.round((t - sorted[i]) / 1000));
  const median = gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : null;

  const site = process.env.SITE_URL ?? "https://www.sdtime.net";
  const lines = [
    "<b>🤖 크롤러가 사이트를 훑고 갔습니다</b>",
    "",
    `시간: ${kst(detectedFrom.toISOString(), true)} ~ ${kst(detectedTo.toISOString())}`,
    `가짜 방문자: ${fresh.length}명 (서로 다른 IP ${ips}개)`,
    `열어본 주소: ${paths.length}개`,
    median !== null ? `간격: 약 ${median}초마다 한 쪽 (사람은 이렇게 규칙적이지 않습니다)` : "",
    "",
    "<b>훑어간 주소</b>",
    ...paths.slice(0, 8).map((p) => `· ${esc(decodeURIComponent(p))}`),
    paths.length > 8 ? `· 외 ${paths.length - 8}개` : "",
    "",
    "<b>밝힌 이름</b>",
    ...(uas.length
      ? uas.slice(0, 2).map((u) => `<code>${esc(clip(u, 110))}</code>`)
      : ["(남기지 않았습니다)"]),
    "",
    "<i>이 방문은 접속 통계에서 이미 빼두었습니다. 관리자 화면의 방문자 수는 사람만 센 값입니다.</i>",
    "",
    `<a href="${site}/admin/visits">접속 분석에서 보기</a>`,
  ];

  await send(lines.filter((l) => l !== "").join("\n"));

  // 4) 여기까지 알렸다고 적어 둔다
  if (!DRY) {
    const { error: insErr } = await db.from("bot_alerts").insert({
      detected_from: detectedFrom.toISOString(),
      detected_to: detectedTo.toISOString(),
      visitors: fresh.length,
      views: fresh.length, // 1회성 방문자만 모인 집합이라 방문자 수와 같다
      sample_ua: uas[0] ?? null,
      sample_paths: paths.slice(0, 20),
    });
    // 여기서 실패하면 다음 시간에 같은 내용이 한 번 더 온다. 알림이 두 번
    // 오는 것이 아예 안 오는 것보다 낫다 — 그래서 실패해도 멈추지 않는다.
    if (insErr) console.error(`bot_alerts 기록 실패: ${insErr.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
