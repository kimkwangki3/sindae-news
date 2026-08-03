// 본문 블록 — 기사·게시판 공용 코어.
//
// 본문을 "문단 / 사진 / 소제목 / 인용 / 구분선"이 순서대로 놓인 배열로 다룬다.
// 사진을 글 중간에 넣으려면 글과 사진이 같은 순서열 위에 있어야 하는데,
// text 한 덩어리로는 그 순서를 표현할 방법이 없었다.
//
// 보안 — 여기가 이 기능 전체에서 가장 중요한 파일이다.
//  * 색은 '색 이름'만 저장한다. CSS나 HTML은 저장하지 않는다. 화면에서 이름을
//    미리 정해둔 Tailwind 클래스로 바꿔 쓰기 때문에, 본문에 스타일이나 태그를
//    심어 넣을 경로 자체가 없다.
//  * 브라우저가 보낸 JSON은 절대 그대로 믿지 않는다. 검사해서 통과시키는 게
//    아니라, 허용 목록에 있는 값만 골라 새 객체로 '다시 만든다'. 모르는 필드는
//    통과하는 게 아니라 사라진다.
//
// 이 파일은 클라이언트 컴포넌트(BlockEditor)에서도 import 하므로
// 서버 전용 모듈(supabase/server 등)을 절대 끌어오면 안 된다.

import { parsePhotoUrls } from "./photos";

// ── 타입 ──────────────────────────────────────────────────────────────
export type BlockColor =
  | "ink" // 기본 본문색
  | "rose" // 브랜드 강조
  | "red"
  | "blue"
  | "green"
  | "brown"
  | "muted";

export type TextStyle = "normal" | "heading" | "quote";

export interface TextBlock {
  type: "text";
  text: string;
  color?: BlockColor;
  style?: TextStyle;
}
export interface ImageBlock {
  type: "image";
  url: string;
  caption?: string;
}
export interface DividerBlock {
  type: "divider";
}
export type Block = TextBlock | ImageBlock | DividerBlock;

export type BodyFormat = "text" | "blocks";

// ── 허용 목록 ─────────────────────────────────────────────────────────
const COLORS: readonly BlockColor[] = [
  "ink",
  "rose",
  "red",
  "blue",
  "green",
  "brown",
  "muted",
];
const STYLES: readonly TextStyle[] = ["normal", "heading", "quote"];

// 색 이름 → Tailwind 클래스. 문자열을 여기에 통째로 적어둬야 Tailwind가
// 빌드할 때 클래스를 찾아낸다(`text-${color}` 처럼 조립하면 스타일이 사라진다).
export const COLOR_CLASS: Record<BlockColor, string> = {
  ink: "text-ink",
  rose: "text-rose-deep",
  red: "text-body-red",
  blue: "text-body-blue",
  green: "text-body-green",
  brown: "text-body-brown",
  muted: "text-muted",
};

/**
 * 색 이름 → 클래스. 저장된 값이 검증을 거치므로 모르는 색이 올 일은 없지만,
 * 그래도 기본색으로 떨어뜨린다 — 여기서 undefined가 나오면 글자색 클래스가
 * 통째로 빠져 본문이 엉뚱하게 보인다.
 */
export function colorClass(c?: BlockColor): string {
  return (c && COLOR_CLASS[c]) || COLOR_CLASS.ink;
}

// 팔레트 UI에 쓸 라벨. 기사에는 이 중 일부만 노출한다(신문 톤 유지).
export const COLOR_LABEL: Record<BlockColor, string> = {
  ink: "기본",
  rose: "강조",
  red: "빨강",
  blue: "파랑",
  green: "초록",
  brown: "갈색",
  muted: "연회색",
};

/** 기사 본문용 팔레트 — 기본 + 브랜드 강조 1색. */
export const ARTICLE_PALETTE: readonly BlockColor[] = ["ink", "rose"];
/** 게시판용 팔레트 — 주민 자유글이라 폭을 넓게. */
export const BOARD_PALETTE: readonly BlockColor[] = COLORS;

// ── 한도 ──────────────────────────────────────────────────────────────
// 본문 길이에 상한이 없으면 거대한 JSON 한 방으로 DB와 화면을 망가뜨릴 수 있다.
export const MAX_BLOCKS = 100;
export const MAX_TEXT_LEN = 5000; // 문단 하나
export const MAX_CAPTION_LEN = 200;
export const MAX_TOTAL_CHARS = 50000; // 본문 전체 글자수

// ── 검증 ──────────────────────────────────────────────────────────────

// 이미지 URL은 사진 첨부와 똑같은 규칙(Supabase 공개 스토리지 URL)만 통과시킨다.
// 검증 규칙이 두 벌이 되면 한쪽만 고쳐지는 사고가 나므로 기존 함수를 그대로 쓴다.
// 줄바꿈이 섞인 값으로 검사를 우회하지 못하도록, 통과한 값이 입력과 완전히
// 같을 때만 인정한다.
function safeImageUrl(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const [ok] = parsePhotoUrls(s, 1);
  return ok === s ? s : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/**
 * 브라우저가 보낸 블록 JSON을 허용 목록만으로 재구성한다.
 *
 * 쓸 수 있는 블록이 하나도 없으면 null을 돌려준다. 호출부는 그때 기존 text
 * 방식으로 저장하면 된다 — 어떤 경우에도 예외를 던지지 않으므로, 편집기가
 * 이상한 값을 보내도 글이 통째로 날아가는 일은 없다.
 */
export function parseBlocks(raw: unknown): Block[] | null {
  const source = typeof raw === "string" ? raw : String(raw ?? "");
  if (!source.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const out: Block[] = [];
  let budget = MAX_TOTAL_CHARS;

  for (const item of parsed) {
    if (out.length >= MAX_BLOCKS) break;
    const rec = asRecord(item);
    if (!rec) continue;

    if (rec.type === "text") {
      // 줄바꿈은 살리고 CRLF만 정규화한다(textarea가 \r\n으로 보낸다).
      const text = String(rec.text ?? "")
        .replace(/\r\n?/g, "\n")
        .slice(0, MAX_TEXT_LEN)
        .trimEnd();
      if (!text.trim()) continue; // 빈 문단은 버린다
      if (text.length > budget) break; // 전체 한도 초과 — 여기서 자른다
      budget -= text.length;

      const color = COLORS.includes(rec.color as BlockColor)
        ? (rec.color as BlockColor)
        : undefined;
      const style = STYLES.includes(rec.style as TextStyle)
        ? (rec.style as TextStyle)
        : undefined;

      const block: TextBlock = { type: "text", text };
      // 기본값은 저장하지 않는다 — 저장물이 작고, 나중에 기본색을 바꿔도
      // 예전 글이 옛 색에 고정되지 않는다.
      if (color && color !== "ink") block.color = color;
      if (style && style !== "normal") block.style = style;
      out.push(block);
      continue;
    }

    if (rec.type === "image") {
      const url = safeImageUrl(rec.url);
      if (!url) continue; // 허용되지 않은 URL은 조용히 버린다
      const caption = String(rec.caption ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_CAPTION_LEN);
      const block: ImageBlock = { type: "image", url };
      // 글자수 한도에 걸리면 캡션만 포기한다. 사진 자체는 글자수를 차지하지
      // 않으므로 여기서 사진까지 버리면 애먼 것이 사라진다.
      if (caption && caption.length <= budget) {
        budget -= caption.length;
        block.caption = caption;
      }
      out.push(block);
      continue;
    }

    if (rec.type === "divider") {
      // 구분선만 연달아 오는 건 의미가 없다.
      if (out[out.length - 1]?.type === "divider") continue;
      out.push({ type: "divider" });
      continue;
    }
    // 그 밖의 type은 무시.
  }

  // 앞뒤 구분선은 잘라낸다(편집 중 남은 흔적).
  while (out[0]?.type === "divider") out.shift();
  while (out[out.length - 1]?.type === "divider") out.pop();

  return out.length ? out : null;
}

// ── 변환 ──────────────────────────────────────────────────────────────

/**
 * 블록에서 글자만 뽑아낸다. body(text) 컬럼에 계속 채워 넣기 위한 것.
 *
 * 목록 요약·공유 미리보기 설명·검색이 body를 읽고 있어서, 블록으로 저장하면서
 * 여기를 비우면 본문과 상관없어 보이는 화면들이 조용히 깨진다.
 */
export function blocksToPlainText(blocks: Block[]): string {
  const paras = blocks
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text.trim())
    .filter(Boolean);
  if (paras.length) return paras.join("\n\n");

  // 사진만 있는 글이면 캡션이라도 남긴다(설명이 완전히 비는 것보단 낫다).
  return blocks
    .filter((b): b is ImageBlock => b.type === "image")
    .map((b) => b.caption?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 기존 text 본문 → 블록. 예전 글을 편집기에서 열 때 쓴다.
 *
 * 문단을 나누는 규칙은 기사 상세의 기존 동작(lib/mock/articles.ts의
 * toParagraphs)과 같아야 한다. 다르면 예전 기사를 열었을 때 문단이 갑자기
 * 합쳐지거나 쪼개져 보인다. 그 파일은 서버 전용 모듈을 import 하므로
 * 여기서 불러올 수 없어 같은 규칙을 다시 적었다 — 한쪽을 고치면 다른 쪽도
 * 함께 고쳐야 한다.
 */
export function textToBlocks(body: string | null | undefined): Block[] {
  if (!body) return [];
  const text = body.replace(/\r\n?/g, "\n");
  const byBlankLine = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const paras =
    byBlankLine.length > 1
      ? byBlankLine
      : text
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean);
  return paras.slice(0, MAX_BLOCKS).map((p) => ({
    type: "text" as const,
    text: p.slice(0, MAX_TEXT_LEN),
  }));
}

/** 본문에 쓰인 사진 URL을 순서대로. 대표 이미지 자동 선택 등에 쓴다. */
export function collectImageUrls(blocks: Block[]): string[] {
  return blocks
    .filter((b): b is ImageBlock => b.type === "image")
    .map((b) => b.url);
}

/** 저장된 jsonb를 화면에서 쓰기 전에 한 번 더 통과시킨다(DB를 믿지 않는다). */
export function readBlocks(raw: unknown): Block[] | null {
  if (raw == null) return null;
  return parseBlocks(typeof raw === "string" ? raw : JSON.stringify(raw));
}
