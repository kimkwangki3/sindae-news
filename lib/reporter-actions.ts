"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { canWriteArticle, articleStatusOnSubmit } from "./permissions";
import { createClient } from "./supabase/server";
import { CATEGORY_ID } from "./mock/articles-meta";

export interface WriteState {
  ok?: boolean;
  error?: string;
}

// 기자 기사 저장 — 임시저장(draft) 또는 제출(정기자=발행/준기자=승인대기).
// useFormState용 시그니처. 성공 시 /reporter/articles로 redirect.
export async function saveReporterArticle(
  _prev: WriteState,
  formData: FormData,
): Promise<WriteState> {
  const user = await getCurrentUser();
  if (!canWriteArticle(user) || !user) {
    return { error: "기사 작성 권한이 없습니다." };
  }

  const intent = String(formData.get("intent") ?? "draft"); // draft | submit
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const categorySlug = String(formData.get("category") ?? "local");
  const body = String(formData.get("body") ?? "").trim();
  const pledge = formData.get("pledge_ack") === "on";

  if (title.length < 2) return { error: "제목을 입력해 주세요." };
  if (!/^[a-z0-9-]{2,}$/.test(slug))
    return { error: "슬러그는 영문 소문자·숫자·하이픈(-) 2자 이상이어야 해요." };

  // 제출(발행/승인요청)에는 책임 서약 필수
  if (intent === "submit" && !pledge) {
    return { error: "기사 책임 서약에 동의해야 제출할 수 있습니다." };
  }

  const status =
    intent === "submit" ? articleStatusOnSubmit(user) : "draft";
  const nowIso = new Date().toISOString();

  const supabase = createClient();
  const { error } = await supabase.from("articles").insert({
    slug,
    title,
    category_id:
      CATEGORY_ID[categorySlug as keyof typeof CATEGORY_ID] ?? null,
    body: body || null,
    author_id: user.id,
    status,
    pledge_ack: pledge,
    pledge_ack_at: pledge ? nowIso : null,
    published_at: status === "published" ? nowIso : null,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "이미 사용 중인 슬러그예요. 다른 값으로 바꿔주세요." };
    return { error: "저장에 실패했습니다." };
  }

  revalidatePath("/reporter/articles");
  redirect("/reporter/articles");
}
