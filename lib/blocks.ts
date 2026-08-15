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
  | "accent" // 강조 — 네이비 + 굵게
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
// 영상은 유튜브 ID 11자만 저장한다. 주소도, 유튜브가 주는 퍼가기 코드도
// 저장하지 않는다 — 화면에 그릴 iframe 주소는 이 ID로 우리가 직접 조립한다.
export interface VideoBlock {
  type: "video";
  videoId: string;
  caption?: string;
}
/**
 * 설문 결과 그래프.
 *
 * 집계 숫자를 블록 안에 그대로 박아 둔다. 설문을 다시 열거나 표가 더 들어와도
 * 이미 나간 기사의 숫자가 조용히 바뀌면 안 된다 — 기사는 발행 시점의 사실을
 * 고정하는 글이다. surveyId 는 원본 조사로 가는 링크에만 쓴다.
 */
export interface ChartBlock {
  type: "chart";
  surveyId: string;
  surveySlug: string; // 원문으로 가는 주소. 공개 화면은 id가 아니라 slug로 연다
  title: string;
  totalVotes: number;
  options: { label: string; count: number }[];
  capturedAt: string; // 집계를 뜬 시각(ISO)
}
export interface DividerBlock {
  type: "divider";
}
export type Block =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | ChartBlock
  | DividerBlock;

export type BodyFormat = "text" | "blocks";

// ── 허용 목록 ─────────────────────────────────────────────────────────
const COLORS: readonly BlockColor[] = [
  "ink",
  "accent",
  "red",
  "blue",
  "green",
  "brown",
  "muted",
];

// 예전에 저장된 값 → 지금 이름. 강조색은 처음에 브랜드 로즈였다가 네이비로
// 바뀌었는데, 이름만 달라졌을 뿐 뜻은 같다. 이 표가 없으면 그때 쓴 기사의
// 강조가 검증에서 걸러져 기본색으로 되돌아간다.
const LEGACY_COLOR: Record<string, BlockColor> = { rose: "accent" };
const STYLES: readonly TextStyle[] = ["normal", "heading", "quote"];

// 색 이름 → Tailwind 클래스. 문자열을 여기에 통째로 적어둬야 Tailwind가
// 빌드할 때 클래스를 찾아낸다(`text-${color}` 처럼 조립하면 스타일이 사라진다).
export const COLOR_CLASS: Record<BlockColor, string> = {
  ink: "text-ink",
  // 강조는 색과 굵기를 한 몸으로 다룬다. 둘을 따로 고르게 하면 사람마다
  // 다르게 조합해 기사마다 강조 모양이 달라진다.
  accent: "text-body-navy font-bold",
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
  accent: "강조",
  red: "빨강",
  blue: "파랑",
  green: "초록",
  brown: "갈색",
  muted: "연회색",
};

/** 기사 본문용 팔레트 — 기본 + 강조 1색. */
export const ARTICLE_PALETTE: readonly BlockColor[] = ["ink", "accent"];
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 유튜브 ID는 11자, 그것도 URL에 안전한 글자만 쓴다.
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

// 기자가 붙여넣을 만한 주소 모양을 전부 받는다 — 공유 링크(youtu.be),
// 주소창(watch?v=), 쇼츠, 라이브, 퍼가기 코드 속 embed 주소.
const YT_URL =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^\s]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

/**
 * 유튜브 주소·ID → ID 11자. 못 알아보면 null.
 *
 * 보안 — 여기서 살아남는 것은 [A-Za-z0-9_-] 11자뿐이고, 저장도 재생도 그 ID로만
 * 한다. 그래서 주소의 호스트가 진짜 유튜브인지는 따질 필요조차 없다.
 * "evil.com/youtube.com/watch?v=…" 를 넣어도 우리가 만드는 주소는 언제나
 * youtube-nocookie.com/embed/<ID> 다. 남의 주소를 iframe 에 심을 길이 없다.
 */
export function youtubeId(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (YT_ID.test(s)) return s; // 이미 ID(저장된 값을 다시 읽는 경우)
  return s.match(YT_URL)?.[1] ?? null;
}

/** 영상 미리보기 그림. hqdefault 는 어떤 영상에도 반드시 있다(maxres는 없을 수 있다). */
export function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
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

      const named = LEGACY_COLOR[String(rec.color)] ?? rec.color;
      const color = COLORS.includes(named as BlockColor)
        ? (named as BlockColor)
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

    if (rec.type === "image" || rec.type === "video") {
      // 사진은 허용된 스토리지 주소만, 영상은 유튜브 ID만 통과한다.
      let block: ImageBlock | VideoBlock;
      if (rec.type === "image") {
        const url = safeImageUrl(rec.url);
        if (!url) continue; // 알아볼 수 없는 값은 조용히 버린다
        block = { type: "image", url };
      } else {
        const videoId = youtubeId(rec.videoId);
        if (!videoId) continue;
        block = { type: "video", videoId };
      }

      const caption = String(rec.caption ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_CAPTION_LEN);
      // 글자수 한도에 걸리면 캡션만 포기한다. 사진·영상 자체는 글자수를
      // 차지하지 않으므로 여기서 그것까지 버리면 애먼 것이 사라진다.
      if (caption && caption.length <= budget) {
        budget -= caption.length;
        block.caption = caption;
      }
      out.push(block);
      continue;
    }

    if (rec.type === "chart") {
      // 편집기가 만드는 값이 아니라 관리자 화면이 집계에서 뜬 값이다. 그래도
      // 그대로 믿지 않는다 — 저장된 뒤 손댄 JSON이 다시 들어올 수 있다.
      const surveyId = String(rec.surveyId ?? "");
      if (!UUID_RE.test(surveyId)) continue;
      // 주소는 링크가 되어 나가므로 글자를 좁게 잡는다. 여기가 헐거우면
      // 본문에서 남의 사이트로 보내는 링크를 만들 수 있다.
      const surveySlug = String(rec.surveySlug ?? "");
      if (!/^[a-z0-9-]{1,60}$/.test(surveySlug)) continue;

      const rawOpts = Array.isArray(rec.options) ? rec.options : [];
      const options: ChartBlock["options"] = [];
      for (const o of rawOpts.slice(0, 12)) {
        const r = asRecord(o);
        if (!r) continue;
        const label = String(r.label ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80);
        const count = Math.max(0, Math.floor(Number(r.count) || 0));
        if (!label) continue;
        options.push({ label, count });
      }
      if (options.length < 2) continue; // 보기가 하나면 그래프가 아니다

      const title = String(rec.title ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_CAPTION_LEN);
      // 총계는 보낸 값을 그대로 쓰지 않고 다시 더한다. 두 숫자가 어긋나면
      // 비율이 100%를 넘거나 모자라 독자가 먼저 알아챈다.
      const totalVotes = options.reduce((a, o) => a + o.count, 0);

      const captured = new Date(String(rec.capturedAt ?? ""));
      const chart: ChartBlock = {
        type: "chart",
        surveyId,
        surveySlug,
        title,
        totalVotes,
        options,
        capturedAt: (isNaN(captured.getTime())
          ? new Date()
          : captured
        ).toISOString(),
      };

      const cost = title.length + options.reduce((a, o) => a + o.label.length, 0);
      if (cost > budget) break;
      budget -= cost;
      out.push(chart);
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

  // 사진·영상·그래프만 있는 글이면 딸린 글자라도 남긴다(설명이 완전히 비는
  // 것보단 낫다 — 목록 요약과 공유 미리보기가 이 값을 읽는다).
  return blocks
    .map((b) => {
      if (b.type === "chart") return b.title.trim();
      if (b.type === "image" || b.type === "video") {
        return b.caption?.trim() ?? "";
      }
      return "";
    })
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

/** 본문에 쓰인 사진 URL을 순서대로. 게시판 사진 목록 등에 쓴다. */
export function collectImageUrls(blocks: Block[]): string[] {
  return blocks
    .filter((b): b is ImageBlock => b.type === "image")
    .map((b) => b.url);
}

/**
 * 대표 이미지 후보 — 본문 첫 사진, 없으면 첫 영상의 유튜브 섬네일.
 *
 * 영상만 넣은 기사도 목록 카드와 공유 미리보기에 그림이 뜨게 하려는 것이다.
 * 사진 목록(collectImageUrls)에는 이 주소를 섞지 않는다 — 거기 들어가면
 * 게시판 사진첩에 남의 서버 그림이 사진인 척 끼어든다.
 */
export function coverImageUrl(blocks: Block[]): string {
  for (const b of blocks) {
    if (b.type === "image") return b.url;
    if (b.type === "video") return youtubeThumb(b.videoId);
  }
  return "";
}

/** 저장된 jsonb를 화면에서 쓰기 전에 한 번 더 통과시킨다(DB를 믿지 않는다). */
export function readBlocks(raw: unknown): Block[] | null {
  if (raw == null) return null;
  return parseBlocks(typeof raw === "string" ? raw : JSON.stringify(raw));
}
