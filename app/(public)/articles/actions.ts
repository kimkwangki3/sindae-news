"use server";

import { revalidatePath } from "next/cache";
import { type MockComment, fmtDateTime } from "@/lib/mock/comments";
import { type ArticleViewEvent } from "@/lib/mock/views";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getIpHash } from "@/lib/ip";

// slug → article id 헬퍼
async function articleIdBySlug(slug: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data ? (data as { id: string }).id : null;
}

// 댓글 작성 — 로그인 필요(RLS: author_id = auth.uid()).
export async function createComment(
  slug: string,
  body: string,
): Promise<{ ok: boolean; comment?: MockComment; error?: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "내용을 입력해 주세요." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const articleId = await articleIdBySlug(slug);
  if (!articleId) return { ok: false, error: "기사를 찾을 수 없습니다." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ article_id: articleId, author_id: user.id, body: text })
    .select("id, body, created_at")
    .single();

  if (error || !data) return { ok: false, error: "등록에 실패했습니다." };

  const row = data as { id: string; body: string; created_at: string };
  revalidatePath(`/article/${slug}`);
  return {
    ok: true,
    comment: {
      id: row.id,
      author: user.nickname ?? "나",
      body: row.body,
      createdAt: fmtDateTime(row.created_at),
    },
  };
}

// 본인 댓글 수정 — RLS(author_id=auth.uid())로 본인만 가능.
export async function editComment(
  id: string,
  body: string,
): Promise<{ ok: boolean; body?: string; error?: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "내용을 입력해 주세요." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = createClient();
  const { error } = await supabase
    .from("comments")
    .update({ body: text })
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: "수정에 실패했습니다." };
  return { ok: true, body: text };
}

// 본인 댓글 삭제(소프트삭제: visibility=hidden) — 화면에서 사라짐, 관리자 복구 가능.
export async function deleteComment(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = createClient();
  const { error } = await supabase
    .from("comments")
    .update({ visibility: "hidden" })
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };
  return { ok: true };
}

export interface ReactionResult {
  likeCount: number;
  dislikeCount: number;
  mine: "like" | "dislike" | null;
}

// 좋아요/싫어요 — IP당 1회. 같은 버튼=취소, 다른 버튼=변경.
export async function reactArticle(
  slug: string,
  type: "like" | "dislike",
): Promise<ReactionResult> {
  const supabase = createClient();
  const articleId = await articleIdBySlug(slug);
  if (!articleId) return { likeCount: 0, dislikeCount: 0, mine: null };

  const ipHash = getIpHash();
  const user = await getCurrentUser();

  const { data: existing } = await supabase
    .from("article_reactions")
    .select("id, type")
    .eq("article_id", articleId)
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (existing) {
    const ex = existing as { id: number; type: "like" | "dislike" };
    if (ex.type === type) {
      // 같은 버튼 → 취소
      await supabase.from("article_reactions").delete().eq("id", ex.id);
    } else {
      // 다른 버튼 → 변경
      await supabase
        .from("article_reactions")
        .update({ type })
        .eq("id", ex.id);
    }
  } else {
    await supabase.from("article_reactions").insert({
      article_id: articleId,
      ip_hash: ipHash,
      user_id: user?.id ?? null,
      type,
    });
  }

  // 최신 집계 + 내 상태 재조회(권위 있는 값 반환)
  const [{ count: likeCount }, { count: dislikeCount }, { data: mineRow }] =
    await Promise.all([
      supabase
        .from("article_reactions")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleId)
        .eq("type", "like"),
      supabase
        .from("article_reactions")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleId)
        .eq("type", "dislike"),
      supabase
        .from("article_reactions")
        .select("type")
        .eq("article_id", articleId)
        .eq("ip_hash", ipHash)
        .maybeSingle(),
    ]);

  return {
    likeCount: likeCount ?? 0,
    dislikeCount: dislikeCount ?? 0,
    mine: mineRow ? (mineRow as { type: "like" | "dislike" }).type : null,
  };
}

// 기사 조회/읽음 집계 — 상세 화면의 ReadTracker가 진입/이탈 시 호출.
export async function trackArticleView(ev: ArticleViewEvent): Promise<void> {
  const articleId = await articleIdBySlug(ev.slug);
  if (!articleId) return;

  const supabase = createClient();
  const user = await getCurrentUser();
  const { error } = await supabase.from("article_views").insert({
    article_id: articleId,
    ip_hash: getIpHash(),
    user_id: user?.id ?? null,
    scroll_pct: Math.max(0, Math.min(100, Math.round(ev.scrollPct))),
    dwell_ms: Math.max(0, Math.round(ev.dwellMs)),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[view] article_views 기록 실패:", error.message);
    return;
  }

  // 화면에 보이는 조회수는 articles.view_count다. 로그만 쌓고 이걸 갱신하지
  // 않으면 계속 0으로 보인다.
  //
  // +1 누적이 아니라 article_views 실제 건수로 덮어쓴다. 동시에 여러 명이
  // 읽어도 값이 어긋나지 않고, 어긋나 있었더라도 다음 조회 때 스스로 맞춰진다.
  // article_views는 RLS로 anon 조회가 막혀 있고 articles UPDATE도 열지 않았으므로
  // 이 두 쿼리만 service role로 처리한다(서버 전용 경로).
  const admin = createServiceClient();
  const { count } = await admin
    .from("article_views")
    .select("*", { count: "exact", head: true })
    .eq("article_id", articleId);

  const { error: incErr } = await admin
    .from("articles")
    .update({ view_count: count ?? 0 })
    .eq("id", articleId);
  if (incErr) {
    // eslint-disable-next-line no-console
    console.error("[view] 조회수 갱신 실패:", incErr.message);
  }
}
