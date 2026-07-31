// 텔레그램 알림 — 관리자 확인이 필요한 신규 이벤트를 개인 채팅으로 보고한다.
// 서버 전용(TELEGRAM_* 는 NEXT_PUBLIC_ 아님). best-effort: 실패해도 사용자 제출은 막지 않는다.
// 명세는 `텔레그램봇_명세.md` 기능 B. 큐/다이제스트 없이 실시간 발송만 구현.

import { REPORT_TARGET_LABEL, type ReportTarget } from "./report";

const API = "https://api.telegram.org";
const TIMEOUT_MS = 3000;

export type NotifyEvent =
  | {
      type: "reporter_application";
      name: string;
      phone?: string | null;
      email?: string | null;
      neighborhood?: string | null;
      interests?: string[];
      motivation?: string | null;
    }
  | {
      type: "tip";
      title: string;
      category?: string | null;
      body: string;
      contact?: string | null;
      byMember: boolean;
    }
  | {
      type: "report";
      target: ReportTarget;
      targetId: string;
      reasonLabel: string;
      detail?: string | null;
    }
  | { type: "business"; name: string; category: string; owner: string }
  | { type: "organization"; name: string; category: string; owner: string }
  | {
      type: "ad_request";
      advertiser: string;
      position?: string | null;
      contact: string;
    }
  | { type: "article_pending"; title: string; author: string; slug: string };

// 이벤트 → 제목·본문 줄·관리자 딥링크
function render(e: NotifyEvent): { head: string; lines: string[]; path: string } {
  switch (e.type) {
    case "reporter_application":
      return {
        head: "✍️ 기자 신청",
        lines: [
          `이름: ${e.name}`,
          e.phone ? `연락처: ${e.phone}` : "",
          e.email ? `이메일: ${e.email}` : "",
          e.neighborhood ? `동네: ${e.neighborhood}` : "",
          e.interests?.length ? `관심분야: ${e.interests.join(", ")}` : "",
          e.motivation ? `동기: ${clip(e.motivation, 200)}` : "",
        ],
        path: "/admin/reporters",
      };
    case "tip":
      return {
        head: "📣 기사 제보",
        lines: [
          `제목: ${e.title}`,
          e.category ? `분류: ${e.category}` : "",
          `내용: ${clip(e.body, 300)}`,
          e.contact ? `연락처: ${e.contact}` : "",
          e.byMember ? "" : "(비로그인 제보)",
        ],
        path: "/admin/tips",
      };
    case "report":
      return {
        head: "🚨 신고 접수",
        lines: [
          `대상: ${REPORT_TARGET_LABEL[e.target] ?? e.target}`,
          `사유: ${e.reasonLabel}`,
          e.detail ? `내용: ${clip(e.detail, 300)}` : "",
          `대상 ID: ${e.targetId}`,
        ],
        path: "/admin/reports",
      };
    case "business":
      return {
        head: "🏪 업체 등록 신청",
        lines: [`업체: ${e.name}`, `분류: ${e.category}`, `신청자: ${e.owner}`],
        path: "/admin/business",
      };
    case "organization":
      return {
        head: "🏛 지역단체 등록 신청",
        lines: [`단체: ${e.name}`, `분류: ${e.category}`, `신청자: ${e.owner}`],
        path: "/admin/orgs",
      };
    case "ad_request":
      return {
        head: "📢 광고 신청",
        lines: [
          `광고주: ${e.advertiser}`,
          e.position ? `위치: ${e.position}` : "",
          `연락처: ${e.contact}`,
        ],
        path: "/admin/ads",
      };
    case "article_pending":
      return {
        head: "📝 기사 승인 요청 (준기자)",
        lines: [`제목: ${e.title}`, `작성: ${e.author}`, `슬러그: ${e.slug}`],
        path: "/admin/articles",
      };
  }
}

// 신규 이벤트를 텔레그램으로 보고. 토큰 미설정이면 조용히 건너뛴다.
export async function notify(event: NotifyEvent): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const { head, lines, path } = render(event);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const body = lines.filter(Boolean).map(esc).join("\n");
  const text = `<b>${esc(head)}</b>\n\n${body}\n\n<a href="${site}${path}">관리자에서 보기</a>`;

  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`[telegram] ${event.type} 발송 실패: ${res.status}`);
    }
  } catch (err) {
    // 알림 실패가 사용자 제출을 막아선 안 된다.
    // eslint-disable-next-line no-console
    console.error(`[telegram] ${event.type} 발송 오류`, err);
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
