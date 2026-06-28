// 개발용 상권(업체)·단체 샘플 시드. service role.
// 실행: node db/seed-local.mjs   (재실행 안전: 동일 이름 삭제 후 재삽입, cascade)
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

// --- 업체 ---
const BIZ = [
  { name: "신대분식", category: "food", address: "순천시 신대지구 신대로 12", phone: "061-123-4567", kakao_channel: "http://pf.kakao.com/_sindae", is_24h: false, hours_open: "10:00", hours_close: "21:00", closed_days: ["일"], intro: "30년 전통 손맛, 신대지구 대표 분식집입니다.", menus: [["떡볶이", 4000], ["김밥", 3500], ["모둠순대", 8000]], promos: [["신메뉴", "점심 특선 출시", "11~14시 한정, 떡볶이+김밥+음료 7,500원!"]] },
  { name: "봄날카페", category: "cafe", address: "순천시 신대지구 중앙로 8", phone: "061-222-1004", kakao_channel: "http://pf.kakao.com/_bomnal", is_24h: false, hours_open: "08:00", hours_close: "22:00", closed_days: ["연중무휴"], intro: "직접 로스팅한 원두와 수제 디저트를 즐겨보세요.", menus: [["아메리카노", 3500], ["수제 휘낭시에", 3000]], promos: [["이벤트", "신규 오픈 1+1 이벤트", "이번 주말 음료 1+1! 친구와 함께 오세요."]] },
  { name: "할매손칼국수", category: "food", address: "순천시 신대지구 덕암길 3", phone: "061-333-7788", kakao_channel: null, is_24h: false, hours_open: "11:00", hours_close: "20:00", closed_days: ["둘째·넷째 월요일"], intro: "손으로 직접 미는 칼국수와 시원한 육수.", menus: [["손칼국수", 7000], ["왕만두", 5000]], promos: [] },
  { name: "신대세탁소", category: "life", address: "순천시 신대지구 신대로 30", phone: "061-444-5566", kakao_channel: null, is_24h: false, hours_open: "08:00", hours_close: "20:00", closed_days: ["일"], intro: "친절하고 꼼꼼한 동네 세탁소. 수선도 가능합니다.", menus: [], promos: [] },
];

await sb.from("businesses").delete().in("name", BIZ.map((b) => b.name));
for (const b of BIZ) {
  const { menus, promos, ...row } = b;
  const { data, error } = await sb
    .from("businesses")
    .insert({ ...row, owner_id: null, status: "approved" })
    .select("id")
    .single();
  if (error) { console.error("business 실패:", b.name, error.message); continue; }
  const id = data.id;
  if (menus.length)
    await sb.from("business_menus").insert(menus.map(([name, price], i) => ({ business_id: id, name, price, sort: i })));
  if (promos.length)
    await sb.from("promo_posts").insert(promos.map(([category, title, body]) => ({ business_id: id, author_id: null, category, title, body, status: "approved", visibility: "visible" })));
}
console.log(`업체 ${BIZ.length}건 삽입`);

// --- 단체 ---
const ORGS = [
  { name: "신대주민자치회", category: "self", leader: "홍길동 회장", region: "순천시 신대지구 일대", contact: "061-000-0000", kakao_channel: "http://pf.kakao.com/_jachi", accept_join: true, intro: "마을 환경 개선, 정원 가꾸기, 이웃 돌봄 활동을 펼칩니다.", posts: [["모집", "봄맞이 정원 가꾸기 자원봉사 모집", "이번 주말 함께하실 분을 찾습니다."], ["공지", "6월 정기 회의 안내", "6월 30일 저녁 7시, 주민센터 2층."]], approved: ["홍길동", "김기자"], pending: [["이웃님", "신대동", "마을 활동에 참여하고 싶어요"], ["박주민", "중앙동", "봉사활동 함께하고 싶습니다"]] },
  { name: "해피나눔 봉사단", category: "volunteer", leader: "이봉사 단장", region: "순천시 신대지구", contact: "061-111-2222", kakao_channel: null, accept_join: true, intro: "이웃과 함께 나누는 따뜻한 봉사단입니다.", posts: [["활동후기", "5월 무료 급식 봉사 후기", "따뜻한 한 끼를 나눴습니다. 감사합니다!"]], approved: ["이봉사"], pending: [] },
  { name: "신대 둘레길 걷기 모임", category: "club", leader: "정걷기 모임장", region: "순천시 신대지구 둘레길", contact: "010-1234-5678", kakao_channel: "http://pf.kakao.com/_walk", accept_join: true, intro: "매주 토요일 아침 함께 걷는 건강 모임. 초보 환영!", posts: [], approved: ["정걷기"], pending: [] },
  { name: "신대 합창단", category: "culture", leader: "최노래 단장", region: "순천시 신대지구", contact: "061-555-6666", kakao_channel: null, accept_join: false, intro: "노래로 하나 되는 동네 합창단.", posts: [], approved: ["최노래"], pending: [] },
];

await sb.from("organizations").delete().in("name", ORGS.map((o) => o.name));
for (const o of ORGS) {
  const { posts, approved, pending, ...row } = o;
  const { data, error } = await sb
    .from("organizations")
    .insert({ ...row, owner_id: null, status: "approved" })
    .select("id")
    .single();
  if (error) { console.error("org 실패:", o.name, error.message); continue; }
  const id = data.id;
  if (posts.length)
    await sb.from("org_posts").insert(posts.map(([category, title, body]) => ({ org_id: id, author_id: null, category, title, body, visibility: "visible" })));
  const members = [
    ...approved.map((name, i) => ({ org_id: id, user_id: null, role: i === 0 ? "owner" : "staff", status: "approved", apply_name: name })),
    ...pending.map(([name, neighborhood, motivation]) => ({ org_id: id, user_id: null, role: "member", status: "pending", apply_name: name, neighborhood, motivation })),
  ];
  if (members.length) await sb.from("org_members").insert(members);
}
console.log(`단체 ${ORGS.length}건 삽입`);
console.log("✅ 상권·단체 시드 완료");
