// 기사 댓글 데이터 액세스 — Supabase(comments) 실연동.
import { createClient } from "@/lib/supabase/server";

export interface MockComment {
  id: string;
  author: string;
  body: string;
  createdAt: string; // "2026.06.26 14:20"
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

  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, author:profiles(nickname)")
    .eq("article_id", (art as { id: string }).id)
    .eq("visibility", "visible")
    .order("created_at", { ascending: true });

  return (data ?? []).map((c) => {
    const row = c as unknown as {
      id: string;
      body: string;
      created_at: string;
      author?: { nickname?: string } | null;
    };
    return {
      id: row.id,
      author: row.author?.nickname ?? "익명",
      body: row.body,
      createdAt: fmtDateTime(row.created_at),
    };
  });
}
