// 초안 승인 요청 전송 — lib/telegram-drafts.ts 의 Node 버전.
//
// 웹앱은 TypeScript로 빌드되지만 이 스크립트는 GitHub Actions에서 그냥 node로
// 돈다. 빌드 단계를 두지 않으려고 전송 부분만 여기에 다시 적었다.
// 버튼의 callback_data 형식(pub:<id> / dis:<id>)은 웹훅과 짝이므로 바꾸면 안 된다.

const API = "https://api.telegram.org";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clip(s, max) {
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

async function call(method, body) {
  if (!TOKEN || !CHAT_ID) return null;
  try {
    const res = await fetch(`${API}/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, ...body }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json();
    if (!json.ok) {
      console.error(`[telegram] ${method} 실패: ${json.description}`);
      return null;
    }
    return json.result ?? null;
  } catch (e) {
    console.error(`[telegram] ${method} 오류: ${e.message}`);
    return null;
  }
}

// lib/mock/articles-meta.ts 의 CATEGORY_NAME 과 같은 값을 유지한다.
const CATEGORY_NAME = {
  local: "해룡소식",
  admin: "행정",
  people: "해룡인물",
  life: "생활",
};

// 초안 1건 + [발행][보류] 버튼. 성공하면 message_id를 돌려준다.
export async function sendDraft(d, index) {
  const lines = [
    `<b>📝 기사 초안${index ? ` ${index}` : ""} · ${esc(CATEGORY_NAME[d.category_slug] ?? d.category_slug)}</b>`,
    "",
    `<b>${esc(d.title)}</b>`,
    d.subtitle ? esc(d.subtitle) : "",
    "",
    d.body ? esc(clip(d.body, 700)) : "",
    "",
    d.scope ? `지역: ${esc(d.scope)}` : "",
    d.source_name || d.source_url
      ? `출처: ${esc(d.source_name ?? "원문")}${d.source_url ? `\n${esc(d.source_url)}` : ""}`
      : "",
    // 오보는 여기서 걸러야 한다. 눈에 띄게 맨 아래에 둔다.
    d.needs_check ? `\n⚠️ <b>확인 필요</b>\n${esc(d.needs_check)}` : "",
  ];

  const result = await call("sendMessage", {
    text: lines.filter((l) => l !== "").join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ 발행", callback_data: `pub:${d.id}` },
          { text: "🗑 보류", callback_data: `dis:${d.id}` },
        ],
      ],
    },
  });
  return result?.message_id ?? null;
}

// 실행 요약. 초안이 0건이거나 수집이 실패해도 침묵하지 않는다 —
// 조용히 멈춘 자동화는 며칠 뒤에야 알아차리게 된다.
//
// slots: 하루 구성 칸별 결과 [{label, made, candidates}]
// notes: 비어 있는 칸의 사유
// headlines: 제목만 확인되고 본문을 못 구한 지역 소식(발행인이 직접 확인할 거리)
export async function sendRunReport({ drafted, skipped, failures, slots, notes, headlines }) {
  const lines = [`<b>🗞 초안 생성 완료 — ${drafted}건</b>`];

  if (slots?.length > 0) {
    lines.push("");
    for (const s of slots) {
      lines.push(`${s.made > 0 ? "✅" : "—"} ${esc(s.label)}: ${s.made}건`);
    }
  }
  if (skipped > 0) lines.push("", `이미 처리한 자료 ${skipped}건은 건너뛰었습니다.`);
  if (notes?.length > 0) {
    lines.push("");
    for (const n of notes) lines.push(`· ${esc(clip(n, 140))}`);
  }
  // 본문을 못 읽어 기사로 못 쓴 것들. 여기 걸린 건 대개 발로 확인해야 한다.
  if (headlines?.length > 0) {
    lines.push("", "<b>🔎 제목만 확인된 지역 소식</b>", "<i>본문을 못 읽어 초안은 못 만들었습니다.</i>");
    for (const h of headlines) lines.push(`· [${esc(h.outlet)}] ${esc(clip(h.title, 60))}`);
  }
  if (failures?.length > 0) {
    lines.push("", "<b>수집 실패</b>");
    for (const f of failures.slice(0, 5)) lines.push(`· ${esc(clip(f, 120))}`);
    if (failures.length > 5) lines.push(`· 외 ${failures.length - 5}건`);
  }
  if (drafted === 0) {
    lines.push("", "오늘은 올릴 만한 새 자료가 없었습니다.");
  }
  await call("sendMessage", {
    text: lines.join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}
