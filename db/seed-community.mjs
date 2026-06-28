// 개발용 커뮤니티(나눔마켓·게시판) 샘플 시드. service role.
// 실행: node db/seed-community.mjs
// 재실행 안전: 시드 표식 제목으로 기존 삭제 후 재삽입(댓글/사진 cascade).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const MARKET = [
  { category: "share", title: "아기 옷 (6~12개월) 무료로 드려요", neighborhood: "신대동", body: "아이가 자라서 못 입는 옷들이에요. 상태 좋고 깨끗하게 세탁했습니다. 필요하신 분 댓글 주세요.", is_pinned: true },
  { category: "share", title: "책장 나눔합니다 (직접 가져가실 분)", neighborhood: "중앙동", body: "원목 5단 책장입니다. 이사로 정리해요. 직접 가져가실 분께 무료로 드립니다.", is_pinned: false },
  { category: "request", title: "유아용 카시트 잠깐 빌릴 수 있을까요?", neighborhood: "신대동", body: "주말에 잠깐 사용할 카시트를 빌리고 싶어요. 대여 가능하신 이웃 계실까요?", is_pinned: false },
  { category: "done", title: "화분 나눔 — 마감되었습니다 🙏", neighborhood: "덕암동", body: "많은 관심 감사합니다. 좋은 분께 잘 전달했어요!", is_pinned: false },
  { category: "share", title: "주방 살림 모음 나눔 (그릇·냄비)", neighborhood: "신대동", body: "잘 안 쓰는 그릇과 냄비 모음이에요. 필요하신 분께 나눔합니다.", is_pinned: false },
];

const BOARD = [
  { category: "notice", title: "게시판 이용 규칙 안내", body: "서로 존중하는 댓글 문화를 부탁드려요. 광고·비방·허위 게시물은 통보 없이 삭제될 수 있습니다.", like_count: 8, view_count: 1204, is_pinned: true },
  { category: "question", title: "신대동 근처 괜찮은 소아과 있을까요?", body: "아이가 자주 아픈데 친절하고 잘 보는 소아과 추천 부탁드려요!", like_count: 12, view_count: 156, is_pinned: false },
  { category: "daily", title: "오늘 순천만 노을 미쳤어요 📷", body: "퇴근길에 본 노을이 너무 예뻐서 공유해요. 다들 한 번씩 보세요!", like_count: 34, view_count: 402, is_pinned: false },
  { category: "local", title: "중앙시장 주차장 공사 시작했네요", body: "오늘부터 공사 가림막이 생겼더라고요. 당분간 주차 불편할 듯해요.", like_count: 6, view_count: 233, is_pinned: false },
];

// 1) 기존 시드 삭제
await sb.from("market_posts").delete().in("title", MARKET.map((m) => m.title));
await sb.from("board_posts").delete().in("title", BOARD.map((b) => b.title));

// 2) 나눔마켓 삽입 + 댓글
const { data: mIns, error: mErr } = await sb
  .from("market_posts")
  .insert(MARKET.map((m) => ({ ...m, author_id: null })))
  .select("id, title");
if (mErr) { console.error("market 실패:", mErr.message); process.exit(1); }
console.log(`나눔마켓 ${mIns.length}건 삽입`);

const firstMarket = mIns.find((r) => r.title.startsWith("아기 옷"));
if (firstMarket) {
  await sb.from("market_comments").insert([
    { post_id: firstMarket.id, author_id: null, body: "혹시 아직 있을까요? 받고 싶어요!" },
    { post_id: firstMarket.id, author_id: null, body: "네 있어요~ 쪽지 드릴게요 😊" },
  ]);
}

// 3) 게시판 삽입 + 댓글
const { data: bIns, error: bErr } = await sb
  .from("board_posts")
  .insert(BOARD.map((b) => ({ ...b, author_id: null })))
  .select("id, title");
if (bErr) { console.error("board 실패:", bErr.message); process.exit(1); }
console.log(`게시판 ${bIns.length}건 삽입`);

const qPost = bIns.find((r) => r.title.includes("소아과"));
if (qPost) {
  await sb.from("board_comments").insert([
    { post_id: qPost.id, author_id: null, body: "신대소아과 추천해요. 선생님이 자세히 봐주세요." },
    { post_id: qPost.id, author_id: null, body: "저도 거기 다녀요 +1" },
  ]);
}

console.log("✅ 커뮤니티 시드 완료");
