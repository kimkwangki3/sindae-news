// 개발용 샘플 기사 시드. service role로 RLS 우회.
// 실행: node db/seed.mjs   (web 폴더에서)
// 재실행 안전: 동일 slug 기사 삭제 후 재삽입(article_views/reactions는 cascade 삭제).
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

const TITLES = {
  1: [
    "신대지구 주민자치회, 봄맞이 마을정원 가꾸기 나서",
    "순천만 인근 도보길 정비 완료… 주말 나들이객 늘어",
    "신대천 산책로에 야간 조명 설치, 안전 보행 기대",
    "동네 골목상권 살리기 ‘신대 페이백’ 행사 시작",
    "신대초 어린이 교통안전 캠페인, 학부모 호응",
    "주말 플리마켓 ‘신대장터’ 첫 개장… 200여 명 북적",
  ],
  2: [
    "시, 신대지구 청년 창업 지원금 2차 모집 공고",
    "순천시 ‘15분 생활권’ 시범사업에 신대동 선정",
    "신대지구 도시재생 뉴딜 2단계 예산 확정",
    "주민참여예산제 설명회, 신대동 행정복지센터서",
    "재활용 분리배출 요일제 7월부터 시행 안내",
  ],
  3: [
    "“30년 한 자리에서” 신대시장 떡집 사장님 이야기",
    "마을 도서관 지킴이 된 은퇴 교사 김OO 씨",
    "신대동 청년 농부, 도시농업으로 새 길 열다",
    "30년 봉사 외길… 신대 적십자 봉사회장 인터뷰",
  ],
  4: [
    "장마철 우리 동네 침수 대비 요령 정리",
    "신대지구 병원·약국 야간진료 안내 모음",
    "여름철 전기요금 아끼는 생활 속 절전 팁",
    "동네 반려견 산책 에티켓, 이것만은 지키자",
    "폭염 대비 무더위쉼터 위치와 이용 안내",
  ],
};
const SLUG = { 1: "local", 2: "admin", 3: "people", 4: "life" };

function body(title) {
  return [
    `${title}. 신대지구 주민들의 관심이 이어지는 가운데, 관계자들은 이번 소식이 지역 사회에 긍정적인 변화를 가져올 것으로 기대했다.`,
    "현장을 찾은 주민들은 “생활에 실질적인 도움이 된다”며 반겼다. 신대신문은 앞으로도 우리 동네의 생생한 이야기를 전한다.",
    "자세한 내용과 일정은 신대동 행정복지센터 및 신대신문 공지사항에서 확인할 수 있다.",
  ].join("\n\n");
}

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// 1) 기사 구성
const articles = [];
let n = 0;
for (const cid of [1, 2, 3, 4]) {
  TITLES[cid].forEach((title, i) => {
    n += 1;
    const slug = `${SLUG[cid]}-${i + 1}`;
    const publishedAgo = (n % 18) + 1; // 1~18일 전
    articles.push({
      slug,
      title,
      category_id: cid,
      body: body(title),
      status: "published",
      view_count: 800 + ((n * 137) % 900),
      published_at: new Date(now - publishedAgo * DAY).toISOString(),
    });
  });
}

const slugs = articles.map((a) => a.slug);

// 2) 기존 동일 slug 삭제(cascade)
await sb.from("articles").delete().in("slug", slugs);

// 3) 기사 삽입 → id 회수
const { data: inserted, error: insErr } = await sb
  .from("articles")
  .insert(articles)
  .select("id, slug");
if (insErr) {
  console.error("기사 삽입 실패:", insErr.message);
  process.exit(1);
}
const idBySlug = Object.fromEntries(inserted.map((r) => [r.slug, r.id]));
console.log(`기사 ${inserted.length}건 삽입`);

// 4) 반응(like/dislike) 삽입
const reactions = [];
articles.forEach((a, idx) => {
  const id = idBySlug[a.slug];
  const likes = (idx % 8) + 2;
  const dislikes = idx % 3;
  for (let i = 0; i < likes; i++)
    reactions.push({ article_id: id, ip_hash: `seed-l-${id}-${i}`, type: "like" });
  for (let i = 0; i < dislikes; i++)
    reactions.push({ article_id: id, ip_hash: `seed-d-${id}-${i}`, type: "dislike" });
});
const { error: rErr } = await sb.from("article_reactions").insert(reactions);
if (rErr) console.error("반응 삽입 경고:", rErr.message);
else console.log(`반응 ${reactions.length}건 삽입`);

// 5) 조회 로그(article_views) — 일/주/월 랭킹이 달라지도록 분산
const views = [];
articles.forEach((a, idx) => {
  const id = idBySlug[a.slug];
  const today = (idx * 3) % 7; // 최근 12시간
  const week = (idx * 5) % 9; // 1~6일 전
  const month = (idx * 11) % 13; // 8~28일 전
  for (let i = 0; i < today; i++)
    views.push({ article_id: id, ip_hash: `seed-vt-${id}-${i}`, created_at: new Date(now - (i + 1) * 60 * 60 * 1000).toISOString(), scroll_pct: 70, dwell_ms: 30000 });
  for (let i = 0; i < week; i++)
    views.push({ article_id: id, ip_hash: `seed-vw-${id}-${i}`, created_at: new Date(now - (1 + (i % 5)) * DAY - 3600000).toISOString(), scroll_pct: 60, dwell_ms: 25000 });
  for (let i = 0; i < month; i++)
    views.push({ article_id: id, ip_hash: `seed-vm-${id}-${i}`, created_at: new Date(now - (8 + (i % 20)) * DAY).toISOString(), scroll_pct: 50, dwell_ms: 20000 });
});
const { error: vErr } = await sb.from("article_views").insert(views);
if (vErr) console.error("조회로그 삽입 경고:", vErr.message);
else console.log(`조회로그 ${views.length}건 삽입`);

console.log("✅ 시드 완료");
