// 커뮤니티(나눔마켓·자유게시판) 데이터 액세스 — Supabase 실연동.
// 시그니처는 동일하나 전부 async.
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { readBlocks, type Block } from "@/lib/blocks";

// --- 공통 ------------------------------------------------------------
export interface PostComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  mine?: boolean; // 현재 로그인 사용자가 작성한 댓글
}

// timestamptz → "06.28 14:20"
function fmtShort(ts: string): string {
  return `${ts.slice(5, 10).replace("-", ".")} ${ts.slice(11, 16)}`;
}

// 임베디드 count(`rel(count)`) 결과 추출
function embeddedCount(v: unknown): number {
  if (Array.isArray(v) && v.length > 0) {
    return Number((v[0] as { count?: number }).count ?? 0);
  }
  return 0;
}

function authorName(v: unknown): string {
  return (v as { nickname?: string } | null)?.nickname ?? "익명";
}

// 임베디드 사진 관계(`rel(url, sort)`) → 정렬된 URL 배열
function embeddedPhotos(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as { url: string; sort?: number }[])
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((p) => p.url);
}

// --- 나눔마켓 --------------------------------------------------------
export type MarketCategory = "share" | "request" | "done";

export const MARKET_CAT_NAME: Record<MarketCategory, string> = {
  share: "나눔",
  request: "요청",
  done: "완료",
};

export interface MarketPost {
  id: string;
  category: MarketCategory;
  title: string;
  neighborhood: string;
  body: string;
  author: string;
  createdAt: string;
  commentCount: number;
  likeCount: number;
  photoCount: number;
  photos: string[];
  pinned: boolean;
  mine?: boolean; // 현재 로그인 사용자가 작성
}

const MARKET_COLS =
  "id, category, title, neighborhood, body, is_pinned, created_at, author_id, author:profiles!author_id(nickname), market_comments(count), market_photos(url, sort)";

function toMarketPost(r: Record<string, unknown>): MarketPost {
  const photos = embeddedPhotos(r.market_photos);
  return {
    id: r.id as string,
    category: r.category as MarketCategory,
    title: r.title as string,
    neighborhood: (r.neighborhood as string) ?? "",
    body: (r.body as string) ?? "",
    author: authorName(r.author),
    createdAt: fmtShort(r.created_at as string),
    commentCount: embeddedCount(r.market_comments),
    likeCount: 0, // 나눔마켓은 좋아요 없음(스키마 미보유)
    photoCount: photos.length,
    photos,
    pinned: Boolean(r.is_pinned),
  };
}

export async function getMarketPosts(
  category: MarketCategory | "all" = "all",
): Promise<MarketPost[]> {
  const supabase = createClient();
  let q = supabase
    .from("market_posts")
    .select(MARKET_COLS)
    .eq("visibility", "visible")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (category !== "all") q = q.eq("category", category);
  const { data } = await q;
  return (data ?? []).map((r) => toMarketPost(r as Record<string, unknown>));
}

export async function getMarketPost(id: string): Promise<MarketPost | null> {
  const supabase = createClient();
  const [{ data }, user] = await Promise.all([
    supabase
      .from("market_posts")
      .select(MARKET_COLS)
      .eq("id", id)
      .eq("visibility", "visible")
      .maybeSingle(),
    getCurrentUser(),
  ]);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const post = toMarketPost(row);
  post.mine = !!user && row.author_id === user.id;
  return post;
}

export async function getMarketComments(id: string): Promise<PostComment[]> {
  return getPostComments("market_comments", id);
}

// --- 자유게시판 ------------------------------------------------------
export type BoardCategory = "daily" | "question" | "local";
export type BoardPostCategory = BoardCategory | "notice";

export const BOARD_CAT_NAME: Record<BoardPostCategory, string> = {
  notice: "공지",
  daily: "일상",
  question: "질문",
  local: "동네소식",
};

export const BOARD_WRITE_CATS: BoardCategory[] = ["daily", "question", "local"];

export interface BoardPost {
  id: string;
  category: BoardPostCategory;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  photos: string[];
  // 블록 본문(사진 중간 삽입·문단 색). 목록 조회에서는 항상 null이고
  // 상세 조회에서만 채운다 — 목록 카드는 본문을 쓰지 않는데 블록까지
  // 끌어오면 글마다 쓸데없이 무거워진다.
  bodyBlocks: Block[] | null;
  pinned: boolean;
  mine?: boolean; // 현재 로그인 사용자가 작성
  orgId: string | null; // 단체 명의 글이면 해당 단체
  orgName: string | null;
}

const BOARD_COLS =
  "id, category, title, body, like_count, view_count, is_pinned, created_at, author_id, org_id, author:profiles!author_id(nickname), org:organizations!org_id(name), board_comments(count), board_photos(url, sort)";

// 상세 화면에서만 블록 본문을 함께 읽는다.
const BOARD_DETAIL_COLS = `${BOARD_COLS}, body_blocks, body_format`;

function toBoardPost(r: Record<string, unknown>): BoardPost {
  return {
    id: r.id as string,
    category: r.category as BoardPostCategory,
    title: r.title as string,
    body: (r.body as string) ?? "",
    author: authorName(r.author),
    createdAt: fmtShort(r.created_at as string),
    likeCount: Number(r.like_count ?? 0),
    commentCount: embeddedCount(r.board_comments),
    viewCount: Number(r.view_count ?? 0),
    photos: embeddedPhotos(r.board_photos),
    // 목록 조회에는 컬럼 자체가 없어 undefined → null이 된다.
    bodyBlocks: r.body_format === "blocks" ? readBlocks(r.body_blocks) : null,
    pinned: Boolean(r.is_pinned),
    orgId: (r.org_id as string) ?? null,
    orgName: (r.org as { name?: string } | null)?.name ?? null,
  };
}

export async function getBoardPosts(
  category: BoardCategory | "all" | "popular" | "org" = "all",
): Promise<BoardPost[]> {
  const supabase = createClient();
  let q = supabase
    .from("board_posts")
    .select(BOARD_COLS)
    .eq("visibility", "visible");

  // '단체' 필터 — 단체 명의로 올라온 글만
  if (category === "org") q = q.not("org_id", "is", null);

  if (category === "popular") {
    q = q.order("like_count", { ascending: false });
  } else {
    if (category !== "all" && category !== "org") q = q.eq("category", category);
    q = q
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
  }
  const { data } = await q;
  return (data ?? []).map((r) => toBoardPost(r as Record<string, unknown>));
}

export async function getBoardPost(id: string): Promise<BoardPost | null> {
  const supabase = createClient();
  const [{ data }, user] = await Promise.all([
    supabase
      .from("board_posts")
      .select(BOARD_DETAIL_COLS)
      .eq("id", id)
      .eq("visibility", "visible")
      .maybeSingle(),
    getCurrentUser(),
  ]);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const post = toBoardPost(row);
  post.mine = !!user && row.author_id === user.id;
  return post;
}

export async function getBoardComments(id: string): Promise<PostComment[]> {
  return getPostComments("board_comments", id);
}

// 나눔/게시판 댓글 공통 조회(+mine 플래그)
async function getPostComments(
  table: "market_comments" | "board_comments",
  postId: string,
): Promise<PostComment[]> {
  const supabase = createClient();
  const [{ data }, user] = await Promise.all([
    supabase
      .from(table)
      .select("id, body, created_at, author_id, author:profiles!author_id(nickname)")
      .eq("post_id", postId)
      .eq("visibility", "visible")
      .order("created_at", { ascending: true }),
    getCurrentUser(),
  ]);
  return (data ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    return {
      id: row.id as string,
      author: authorName(row.author),
      body: row.body as string,
      createdAt: fmtShort(row.created_at as string),
      mine: !!user && row.author_id === user.id,
    };
  });
}

// ---------------------------------------------------------------------
// 단체 소식 — 게시판 글 중 해당 단체 것만. 단체 상세에서 5개씩 페이지로 본다.
// ---------------------------------------------------------------------
export interface OrgBoardPage {
  items: { id: string; title: string; createdAt: string; commentCount: number }[];
  page: number; // 1부터
  totalPages: number;
  total: number;
}

export async function getOrgBoardPosts(
  orgId: string,
  page = 1,
  perPage = 5,
): Promise<OrgBoardPage> {
  const supabase = createClient();
  const from = (page - 1) * perPage;
  const { data, count } = await supabase
    .from("board_posts")
    .select("id, title, created_at, board_comments(count)", { count: "exact" })
    .eq("org_id", orgId)
    .eq("visibility", "visible")
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  const total = count ?? 0;
  return {
    items: (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        title: row.title as string,
        createdAt: fmtShort(row.created_at as string),
        commentCount: embeddedCount(row.board_comments),
      };
    }),
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    total,
  };
}
