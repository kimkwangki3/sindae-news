"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { createClient } from "./supabase/server";
import { type PostComment } from "./mock/community";

// timestamptz → "06.28 14:20"
function fmtShort(ts: string): string {
  return `${ts.slice(5, 10).replace("-", ".")} ${ts.slice(11, 16)}`;
}

// 로그인 필수 가드(글쓰기 redirect형).
async function requireMemberOrRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.is_suspended)
    throw new Error("정지된 계정은 글을 작성할 수 없습니다.");
  return user;
}

// 나눔마켓 글쓰기 — market_posts insert.
export async function createMarketPost(formData: FormData): Promise<void> {
  const user = await requireMemberOrRedirect();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "share");
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 2) throw new Error("제목을 입력해 주세요.");

  const supabase = createClient();
  const { error } = await supabase.from("market_posts").insert({
    author_id: user.id,
    category,
    title,
    neighborhood: neighborhood || null,
    body: body || null,
  });
  if (error) throw new Error("등록에 실패했습니다.");
  revalidatePath("/market");
  redirect("/market");
}

// 게시판 글쓰기 — board_posts insert.
export async function createBoardPost(formData: FormData): Promise<void> {
  const user = await requireMemberOrRedirect();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "daily");
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 2) throw new Error("제목을 입력해 주세요.");

  const supabase = createClient();
  const { error } = await supabase.from("board_posts").insert({
    author_id: user.id,
    category,
    title,
    body: body || null,
  });
  if (error) throw new Error("등록에 실패했습니다.");
  revalidatePath("/board");
  redirect("/board");
}

export interface CommentResult {
  ok: boolean;
  comment?: PostComment;
  error?: string;
}

// 댓글 작성 공용(market_comments / board_comments).
async function createPostComment(
  table: "market_comments" | "board_comments",
  basePath: string,
  postId: string,
  body: string,
): Promise<CommentResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "내용을 입력해 주세요." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from(table)
    .insert({ post_id: postId, author_id: user.id, body: text })
    .select("id, body, created_at")
    .single();
  if (error || !data) return { ok: false, error: "등록에 실패했습니다." };

  const row = data as { id: string; body: string; created_at: string };
  revalidatePath(`${basePath}/${postId}`);
  return {
    ok: true,
    comment: {
      id: row.id,
      author: user.nickname ?? "나",
      body: row.body,
      createdAt: fmtShort(row.created_at),
    },
  };
}

export async function createMarketComment(
  postId: string,
  body: string,
): Promise<CommentResult> {
  return createPostComment("market_comments", "/market", postId, body);
}

export async function createBoardComment(
  postId: string,
  body: string,
): Promise<CommentResult> {
  return createPostComment("board_comments", "/board", postId, body);
}

export interface LikeResult {
  liked: boolean;
  count: number;
  error?: string;
}

// 게시글 좋아요 토글 — board_likes(unique post_id,user_id) + like_count 동기화.
export async function toggleBoardLike(postId: string): Promise<LikeResult> {
  const user = await getCurrentUser();
  if (!user) return { liked: false, count: 0, error: "로그인이 필요합니다." };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("board_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("board_likes")
      .delete()
      .eq("id", (existing as { id: number }).id);
  } else {
    await supabase
      .from("board_likes")
      .insert({ post_id: postId, user_id: user.id });
  }

  // 실제 개수 재집계 후 like_count 동기화
  const { count } = await supabase
    .from("board_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  const total = count ?? 0;
  await supabase
    .from("board_posts")
    .update({ like_count: total })
    .eq("id", postId);

  revalidatePath(`/board/${postId}`);
  return { liked: !existing, count: total };
}

export interface TipState {
  ok?: boolean;
  error?: string;
}

// 제보 — 비로그인 허용(reporter_id nullable). tips insert.
export async function submitTip(
  _prev: TipState,
  formData: FormData,
): Promise<TipState> {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  if (title.length < 2) return { error: "제목을 입력해 주세요." };
  if (body.length < 5) return { error: "내용을 조금 더 자세히 적어주세요." };

  const user = await getCurrentUser();
  const supabase = createClient();
  const { error } = await supabase.from("tips").insert({
    title,
    category: category || null,
    body,
    contact: contact || null,
    reporter_id: user?.id ?? null,
  });
  if (error) return { error: "전송에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  return { ok: true };
}
