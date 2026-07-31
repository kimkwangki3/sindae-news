// 기사 초안 승인 흐름 — 텔레그램 전송/응답.
//
// 초안 1건 = 메시지 1개 + [✅ 발행][🗑 보류] 인라인 버튼.
// 버튼을 누르면 /api/telegram/webhook 이 받아 처리하고, 같은 메시지를 결과로 바꾼다.
// 서버 전용(TELEGRAM_* 는 NEXT_PUBLIC_ 아님).

const API = "https://api.telegram.org";
const TIMEOUT_MS = 5000;

export interface DraftForTelegram {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  categoryName: string;
  sourceName: string | null;
  sourceUrl: string | null;
  scope: string | null;
  needsCheck: string | null;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function creds(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return token && chatId ? { token, chatId } : null;
}

async function call<T = unknown>(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) {
      // eslint-disable-next-line no-console
      console.error(`[telegram] ${method} 실패: ${json.description}`);
      return null;
    }
    return json.result ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[telegram] ${method} 오류`, err);
    return null;
  }
}

function renderDraft(d: DraftForTelegram, index?: string): string {
  const lines = [
    `<b>📝 기사 초안${index ? ` ${index}` : ""} · ${esc(d.categoryName)}</b>`,
    "",
    `<b>${esc(d.title)}</b>`,
    d.subtitle ? esc(d.subtitle) : "",
    "",
    d.body ? esc(clip(d.body, 700)) : "",
    "",
    d.scope ? `지역: ${esc(d.scope)}` : "",
    d.sourceName || d.sourceUrl
      ? `출처: ${esc(d.sourceName ?? "원문")}${d.sourceUrl ? `\n${esc(d.sourceUrl)}` : ""}`
      : "",
    // 사실관계가 불확실한 건은 눈에 띄게. 여기서 오보가 난다.
    d.needsCheck ? `\n⚠️ <b>확인 필요</b>\n${esc(d.needsCheck)}` : "",
  ];
  return lines.filter((l) => l !== "").join("\n");
}

// 초안 1건을 승인 버튼과 함께 보낸다. 성공 시 텔레그램 message_id 반환.
export async function sendDraft(
  d: DraftForTelegram,
  index?: string,
): Promise<number | null> {
  const c = creds();
  if (!c) return null;

  const result = await call<{ message_id: number }>(c.token, "sendMessage", {
    chat_id: c.chatId,
    text: renderDraft(d, index),
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

// 버튼을 누른 직후의 로딩 표시를 끄고 짧은 안내를 띄운다.
export async function answerCallback(
  callbackId: string,
  text: string,
): Promise<void> {
  const c = creds();
  if (!c) return;
  await call(c.token, "answerCallbackQuery", {
    callback_query_id: callbackId,
    text,
  });
}

// 처리 결과로 원래 메시지를 바꾸고 버튼을 없앤다(중복 클릭 방지).
export async function settleDraftMessage(
  messageId: number,
  text: string,
): Promise<void> {
  const c = creds();
  if (!c) return;
  await call(c.token, "editMessageText", {
    chat_id: c.chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}
