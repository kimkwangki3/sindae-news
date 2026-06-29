// 추가 기능 점검용 시드: 기사 댓글 + 광고 배너 + 제보 + 광고신청.
// 실행: node db/seed-extra.mjs  (재실행 안전: 시드 표식으로 기존 삭제 후 재삽입)
// service role로 RLS 우회. author_id/reporter_id=null → '익명' 표시(정상).
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

// 1) 기사 댓글 — 발행된 기사 중 앞쪽 6건에 댓글 부착
const { data: arts, error: aErr } = await sb
  .from("articles")
  .select("id, title")
  .eq("status", "published")
  .order("published_at", { ascending: false })
  .limit(6);
if (aErr) { console.error("기사 조회 실패:", aErr.message); process.exit(1); }

const COMMENT_POOL = [
  "좋은 소식이네요. 잘 읽었습니다 👍",
  "우리 동네 이야기라 더 반갑네요.",
  "이런 기사 자주 부탁드려요!",
  "유용한 정보 감사합니다.",
  "현장 분위기가 그대로 전해지네요.",
  "공유하고 갑니다 :)",
];
const comments = [];
arts.forEach((a, i) => {
  const k = (i % 3) + 1; // 1~3개씩
  for (let j = 0; j < k; j++) {
    comments.push({ article_id: a.id, author_id: null, body: COMMENT_POOL[(i + j) % COMMENT_POOL.length] });
  }
});
// 시드 댓글 정리 후 재삽입(본문 매칭)
await sb.from("comments").delete().in("body", COMMENT_POOL);
const { error: cErr, count: cCount } = await sb
  .from("comments")
  .insert(comments, { count: "exact" });
if (cErr) console.error("기사 댓글 경고:", cErr.message);
else console.log(`기사 댓글 ${comments.length}건 삽입`);

// 2) 광고 배너 — AdSlot이 쓰는 4개 슬롯에 게재중 배너 1건씩
//    슬롯 키: home_top / article_mid / district_top / market_infeed
const BANNERS = [
  { key: "home_top", advertiser: "신대분식", link_url: "https://www.sindae.net/district" },
  { key: "article_mid", advertiser: "봄날카페", link_url: "https://www.sindae.net/district" },
  { key: "district_top", advertiser: "신대지구 상인회", link_url: "https://www.sindae.net/district" },
  { key: "market_infeed", advertiser: "할매손칼국수", link_url: "https://www.sindae.net/district" },
];
const { data: slots } = await sb.from("ad_slots").select("id, key");
const slotId = Object.fromEntries((slots || []).map((s) => [s.key, s.id]));
const ads = BANNERS.map((b) => ({
  slot_id: slotId[b.key],
  advertiser: b.advertiser,
  link_url: b.link_url,
  image_url: null, // 업로드 UI 없음 → 텍스트 배너로 표시
  is_active: true,
}));
await sb.from("ads").delete().in("advertiser", BANNERS.map((b) => b.advertiser));
const { error: adErr } = await sb.from("ads").insert(ads);
if (adErr) console.error("광고 배너 경고:", adErr.message);
else console.log(`광고 배너 ${ads.length}건 삽입(home_top·article_mid·district_top·market_infeed)`);

// 3) 제보(tips)
const TIPS = [
  { title: "신대로 가로등 점등 안 됨", category: "제보", body: "밤에 신대로 일부 구간 가로등이 꺼져 있어 어둡습니다. 점검 부탁드려요.", contact: "010-0000-0001" },
  { title: "중앙시장 앞 불법주정차 심해요", category: "제보", body: "주말마다 시장 앞 도로에 불법주정차가 많아 보행이 위험합니다.", contact: null },
];
await sb.from("tips").delete().in("title", TIPS.map((t) => t.title));
const { error: tErr } = await sb.from("tips").insert(TIPS.map((t) => ({ ...t, reporter_id: null, status: "pending" })));
if (tErr) console.error("제보 경고:", tErr.message);
else console.log(`제보 ${TIPS.length}건 삽입`);

// 4) 광고 신청(ad_requests) — 관리자 광고관리 승인 대기 점검용
const REQS = [
  { advertiser: "신대세탁소", slot_id: slotId["home_mid"], link_url: "https://www.sindae.net/district", duration: "1개월", contact: "061-444-5566", status: "pending" },
];
await sb.from("ad_requests").delete().in("advertiser", REQS.map((r) => r.advertiser));
const { error: arErr } = await sb.from("ad_requests").insert(REQS);
if (arErr) console.error("광고신청 경고:", arErr.message);
else console.log(`광고신청 ${REQS.length}건 삽입`);

console.log("✅ 추가 시드 완료");
