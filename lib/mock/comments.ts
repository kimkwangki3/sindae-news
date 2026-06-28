// 기사 댓글 데이터 액세스 — Supabase(comments) 실연동.
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export interface MockComment {
  id: string;
  author: string;
  body: string;
  createdAt: string; // "2026.06.26 14:20"
  mine?: boolean; // 현재 로그인 사용자가 작성한 댓글이면 true
}

// timestamptz → "2026.06.26 14:20" (로케일 비의존, UTC 절단)
export function fmtDateTime(ts: string): string {
  const d = ts.slice(0, 10).replace(/-/g, ".");
  const t = ts.slice(11, 16);
  return `${d} ${t}`;
}

export async function getComments(slug: string): Promise<MockComment[]> {
  const supabase = createClient();
  const { data: art } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!art) return [];

  const [{ data }, user] = await Promise.all([
    supabase
      .from("comments")
      .select("id, body, created_at, author_id, author:profiles(nickname)")
      .eq("article_id", (art as { id: string }).id)
      .eq("visibility", "visible")
      .order("created_at", { ascending: true }),
    getCurrentUser(),
  ]);

  return (data ?? []).map((c) => {
    const row = c as unknown as {
      id: string;
      body: string;
      created_at: string;
      author_id: string | null;
      author?: { nickname?: string } | null;
    };
    return {
      id: row.id,
      author: row.author?.nickname ?? "익명",
      body: row.body,
      createdAt: fmtDateTime(row.created_at),
      mine: !!user && row.author_id === user.id,
    };
  });
}
