// 첫 화면 편성 규칙 — DB·프레임워크를 모르는 순수 함수만 둔다.
//
// 편집인이 고른 기사를 먼저 놓고, 빈 칸은 최신 기사로 채운다. 그래서 편성을
// 하루 쉬어도 첫 화면이 비지 않는다. 규칙을 바꾸면 tests/run.js 도 함께 고친다.

export const SUB_SLOTS = ["sub1", "sub2", "sub3"] as const;
export type FrontSlotKey = "top" | (typeof SUB_SLOTS)[number];

// 지정한 기사가 머무는 기간. 묵은 톱이 남아 있으면 신문이 멈춘 것처럼 보인다.
export const SLOT_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface FrontSlot<T> {
  slot: FrontSlotKey;
  article: T | null; // 비공개·삭제된 기사는 null로 들어온다
  shortTitle: string | null;
  pinned: boolean;
  expiresAt: string | null;
}

export interface FrontPick<T> {
  lead: T | null;
  leadTitle: string | null; // 톱 전용 짧은 제목. 없으면 기사 제목을 쓴다
  subs: T[];
  rest: T[];
}

function isLive<T>(s: FrontSlot<T>, now: number): boolean {
  if (!s.article) return false;
  if (s.pinned) return true;
  if (!s.expiresAt) return true;
  const until = new Date(s.expiresAt).getTime();
  return Number.isNaN(until) ? false : until > now;
}

export function pickFrontPage<T extends { slug: string }>(
  slots: FrontSlot<T>[],
  latest: T[],
  now: number,
): FrontPick<T> {
  const live = slots.filter((s) => isLive(s, now));
  const top = live.find((s) => s.slot === "top");
  const picked = SUB_SLOTS.map(
    (key) => live.find((s) => s.slot === key)?.article ?? null,
  );

  const used = new Set(
    [top?.article, ...picked].filter(Boolean).map((a) => (a as T).slug),
  );
  const auto = latest.filter((a) => !used.has(a.slug));

  const lead = top?.article ?? auto.shift() ?? null;
  const subs: T[] = [];
  for (const a of picked) {
    const next = a ?? auto.shift();
    if (next) subs.push(next);
  }

  return {
    lead,
    leadTitle: top?.shortTitle?.trim() || null,
    subs,
    rest: auto,
  };
}

// 톱 기사가 바뀌면 짧은 제목을 비운다. 앞 기사의 제목이 다른 기사에 붙어
// 첫 화면에 나가면 그대로 오보가 된다.
export function shortTitleAfterTopChange(
  prevTop: string | null,
  nextTop: string | null,
  shortTitle: string,
): string {
  return prevTop === nextTop ? shortTitle : "";
}

export interface FrontSelection {
  top: string | null; // article id
  subs: string[]; // article id, 최대 3건
  shortTitle: string;
  pinned: boolean;
}

export interface SlotRow {
  slot: FrontSlotKey;
  article_id: string;
  short_title: string | null;
  pinned: boolean;
  expires_at: string | null;
}

// 저장할 행을 만든다. 그대로 둔 기사는 만료 시각을 유지한다 — 서브 하나만
// 바꿨다고 톱의 3일이 다시 시작되면 기사가 끝없이 내려가지 않는다.
export function planSlotRows(
  sel: FrontSelection,
  existing: Pick<SlotRow, "slot" | "article_id" | "expires_at">[],
  now: number,
): SlotRow[] {
  const entries: [FrontSlotKey, string][] = [];
  if (sel.top) entries.push(["top", sel.top]);
  sel.subs
    .slice(0, SUB_SLOTS.length)
    .forEach((id, i) => entries.push([SUB_SLOTS[i], id]));

  const expiry = new Date(now + SLOT_DAYS * DAY_MS).toISOString();
  return entries.map(([slot, article_id]) => {
    const same = existing.find(
      (e) => e.article_id === article_id && e.expires_at,
    );
    return {
      slot,
      article_id,
      short_title: slot === "top" ? sel.shortTitle.trim() || null : null,
      pinned: sel.pinned,
      expires_at: sel.pinned ? null : (same?.expires_at ?? expiry),
    };
  });
}
