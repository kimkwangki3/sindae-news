import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { CATEGORY_ID, type CategorySlug } from "@/lib/mock/articles-meta";
import { nextArticleSlug } from "@/lib/slug";
import { answerCallback, settleDraftMessage } from "@/lib/telegram-drafts";
import { revalidatePublic } from "@/lib/revalidate";
import { MEDIA } from "@/lib/media";

// 텔레그램 초안 승인 버튼 수신 엔드포인트.
//
// 보안 2중 확인:
//  1) X-Telegram-Bot-Api-Secret-Token 헤더 — setWebhook 때 등록한 비밀값과 대조.
//     이 값을 모르면 아무나 이 주소로 발행 요청을 넣을 수 있다.
//  2) 누른 사람의 chat id가 TELEGRAM_CHAT_ID와 같은지. 봇이 다른 방에 초대돼도
//     발행인 외에는 발행하지 못한다.
//
// 텔레그램은 200이 아니면 계속 재시도하므로, 처리 실패도 200으로 응답하고
// 원인은 로그와 콜백 안내로 남긴다.

export const dynamic = "force-dynamic";

interface CallbackQuery {
  id: string;
  data?: string;
  from?: { id?: number };
  message?: { message_id?: number };
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (
    !secret ||
    req.headers.get("x-telegram-bot-api-secret-token") !== secret
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await req.json().catch(() => null)) as {
    callback_query?: CallbackQuery;
  } | null;
  const cq = update?.callback_query;
  if (!cq?.data) return NextResponse.json({ ok: true });

  // 발행인 본인만 처리 가능
  if (String(cq.from?.id ?? "") !== String(process.env.TELEGRAM_CHAT_ID ?? "")) {
    await answerCallback(cq.id, "권한이 없습니다.");
    return NextResponse.json({ ok: true });
  }

  const [action, draftId] = cq.data.split(":");
  const messageId = cq.message?.message_id;
  const supabase = createServiceClient();

  const { data: draft } = await supabase
    .from("news_drafts")
    .select(
      "id, title, subtitle, body, category_slug, source_name, source_url, image_prompt, status, published_slug",
    )
    .eq("id", draftId)
    .maybeSingle();

  if (!draft) {
    await answerCallback(cq.id, "초안을 찾을 수 없습니다.");
    return NextResponse.json({ ok: true });
  }

  const d = draft as {
    id: string;
    title: string;
    subtitle: string | null;
    body: string | null;
    category_slug: string;
    source_name: string | null;
    source_url: string | null;
    image_prompt: string | null;
    status: string;
    published_slug: string | null;
  };

  // 이미 처리된 초안 — 버튼이 남아 있는 옛 메시지를 눌렀을 때
  if (d.status !== "pending") {
    await answerCallback(cq.id, `이미 처리된 초안입니다 (${d.status}).`);
    if (messageId) {
      await settleDraftMessage(messageId, `<b>이미 처리됨</b>\n${d.title}`);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "dis") {
    await supabase
      .from("news_drafts")
      .update({ status: "discarded", decided_at: new Date().toISOString() })
      .eq("id", d.id);
    await answerCallback(cq.id, "보류했습니다.");
    if (messageId) {
      await settleDraftMessage(messageId, `<b>🗑 보류</b>\n${d.title}`);
    }
    return NextResponse.json({ ok: true });
  }

  if (action !== "pub") return NextResponse.json({ ok: true });

  // --- 발행 ---
  const now = new Date().toISOString();

  // 슬러그는 날짜+순번이라, 같은 순간에 두 건을 발행하면 번호가 겹칠 수 있다.
  // 겹치면 다시 번호를 받아 한 번 더 시도한다.
  let slug = "";
  let error = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    slug = await nextArticleSlug();
    ({ error } = await supabase.from("articles").insert({
      slug,
      title: d.title,
      subtitle: d.subtitle,
      body: d.body,
      category_id: CATEGORY_ID[d.category_slug as CategorySlug] ?? CATEGORY_ID.local,
      status: "published",
      published_at: now,
      updated_at: now,
      // 자동 생성 초안이므로 본문은 AI 작성으로 고지한다. 대표 이미지는 수동이라 false.
      ai_text: true,
      ai_image: false,
      source_name: d.source_name,
      source_url: d.source_url,
    }));
    if (!error || error.code !== "23505") break;
  }

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[draft] 발행 실패:", error.message);
    await answerCallback(cq.id, "발행에 실패했습니다.");
    return NextResponse.json({ ok: true });
  }

  await supabase
    .from("news_drafts")
    .update({ status: "published", published_slug: slug, decided_at: now })
    .eq("id", d.id);

  // 관리 행위이므로 감사로그에 남긴다(작성자는 자동화이므로 actor 없음).
  await supabase.from("admin_audit_logs").insert({
    actor_id: null,
    action: "publish_draft",
    target_type: "article",
    target_id: slug,
    memo: "telegram",
  });

  revalidatePublic();

  // 게재 직후 필요한 것을 한 화면에 모아 준다. 이미지는 나중에 수정으로 붙이는
  // 흐름이라, 프롬프트와 수정 링크가 여기 없으면 폰에서 이어가기 어렵다.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const url = `${site}/article/${slug}`;
  const editUrl = `${site}/admin/articles/new?slug=${encodeURIComponent(slug)}`;
  const esc = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const parts = [
    "<b>✅ 게재 완료</b>",
    esc(d.title),
    "",
    `<a href="${url}">${MEDIA.name}에서 보기</a>`,
    `<a href="${editUrl}">이미지 추가·수정하기</a>`,
  ];
  if (d.image_prompt) {
    parts.push(
      "",
      "🎨 <b>대표 이미지 프롬프트</b>",
      `<pre>${esc(d.image_prompt)}</pre>`,
      "만든 뒤 위 '이미지 추가·수정하기'에서 올리고 AI 생성 고지를 체크하세요.",
    );
  }

  // 카카오톡 채널 '소식'은 API가 없어 손으로 올려야 한다(카카오 공식 답변).
  // 그래서 붙여넣기만 하면 되게 문구를 미리 만들어 둔다. 텔레그램의 <pre>는
  // 폰에서 눌러 한 번에 복사된다.
  const post = [...(d.subtitle ? [d.title, d.subtitle] : [d.title]), "", url];
  parts.push(
    "",
    "🗨 <b>카카오톡 채널 소식용</b> — 눌러서 복사",
    `<pre>${esc(post.join("\n"))}</pre>`,
  );

  await answerCallback(cq.id, "게재했습니다.");
  if (messageId) {
    await settleDraftMessage(messageId, parts.join("\n"));
  }

  return NextResponse.json({ ok: true });
}
