"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { revalidatePublic } from "./revalidate";
import { getCurrentUser } from "./auth";
import { canWriteArticle, articleStatusOnSubmit } from "./permissions";
import { createClient } from "./supabase/server";
import { notify } from "./telegram";
import { CATEGORY_ID } from "./mock/articles-meta";
import { normalizeSlug, nextArticleSlug } from "./slug";
import { parseTags } from "./tags";
import { parseBlocks, blocksToPlainText, collectImageUrls } from "./blocks";

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
  const categorySlug = String(formData.get("category") ?? "local");
  const pledge = formData.get("pledge_ack") === "on";

  // 본문 — 편집기가 보낸 블록 JSON은 믿지 않고 허용 목록만으로 다시 만든다.
  // 쓸 만한 블록이 없으면 예전처럼 text로 저장한다(관리자 에디터와 같은 규칙).
  const blocks = parseBlocks(formData.get("body_blocks"));
  const body = blocks
    ? blocksToPlainText(blocks)
    : String(formData.get("body") ?? "").trim();

  // 대표 이미지를 따로 고르지 않았으면 본문 첫 사진을 쓴다. 목록 카드와 공유
  // 미리보기에 사진이 비면 기사가 눈에 띄지 않는다.
  const thumbnailUrl =
    String(formData.get("thumbnail_url") ?? "").trim() ||
    (blocks ? (collectImageUrls(blocks)[0] ?? "") : "");

  if (title.length < 2) return { error: "제목을 입력해 주세요." };

  // 제출(발행/승인요청)에는 책임 서약 필수
  if (intent === "submit" && !pledge) {
    return { error: "기사 책임 서약에 동의해야 제출할 수 있습니다." };
  }

  // 주소는 비워두면 날짜+순번으로 자동 생성한다. 기자에게 영문 주소를
  // 지어내게 하지 않는다(관리자 에디터와 같은 규칙).
  const slug =
    normalizeSlug(String(formData.get("slug") ?? "")) || (await nextArticleSlug());

  const status =
    intent === "submit" ? articleStatusOnSubmit(user) : "draft";
  const nowIso = new Date().toISOString();

  const supabase = createClient();
  const { error } = await supabase.from("articles").insert({
    slug,
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    tags: parseTags(String(formData.get("tags") ?? "")),
    category_id:
      CATEGORY_ID[categorySlug as keyof typeof CATEGORY_ID] ?? null,
    body: body || null,
    body_blocks: blocks,
    body_format: blocks ? "blocks" : "text",
    thumbnail_url: thumbnailUrl || null,
    author_id: user.id,
    status,
    ai_text: formData.get("ai_text") === "on",
    ai_image: formData.get("ai_image") === "on",
    source_name: String(formData.get("source_name") ?? "").trim() || null,
    source_url: String(formData.get("source_url") ?? "").trim() || null,
    pledge_ack: pledge,
    pledge_ack_at: pledge ? nowIso : null,
    published_at: status === "published" ? nowIso : null,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "이미 사용 중인 슬러그예요. 다른 값으로 바꿔주세요." };
    return { error: "저장에 실패했습니다." };
  }

  // 준기자 제출분만 관리자 승인이 필요 → 그때만 알린다(임시저장·정기자 발행은 제외).
  if (status === "pending") {
    await notify({
      type: "article_pending",
      title,
      author: user.nickname ?? "익명",
      slug,
    });
  }

  revalidatePath("/reporter/articles");
  // 정기자가 즉시 발행하면 공개 목록·홈에도 바로 반영돼야 한다.
  revalidatePublic();
  redirect("/reporter/articles");
}
