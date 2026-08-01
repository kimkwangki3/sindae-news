// 광고 자리 목록을 코드와 맞춘다. 재실행 안전(있으면 이름만 갱신).
//
//   node db/seed-ad-slots.mjs
//
// 화면에 실제로 붙어 있는 자리만 활성으로 둔다. 예전에 이름만 있고 코드에
// 자리가 없던 슬롯(article_top, home 사이드 등)은 비활성으로 내린다 —
// 관리자 화면에서 고를 수는 있는데 아무 데도 안 나오면 헷갈린다.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim()]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// key ↔ lib/mock/ads.ts 의 AdSlotKey (하이픈만 언더스코어로)
const SLOTS = [
  { key: "home_top",       label: "홈 상단 (첫 화면 헤드라인 아래)",   size: "1200x300" },
  { key: "home_mid",       label: "홈 중간 (해룡소식과 해룡인물 사이)", size: "1200x300" },
  { key: "home_bottom",    label: "홈 하단 (기사 목록 끝)",            size: "1200x300" },
  { key: "articles_top",   label: "기사 목록 상단",                    size: "1200x300" },
  { key: "article_mid",    label: "기사 본문 아래",                    size: "1200x300" },
  { key: "article_bottom", label: "기사 맨 아래 (관련기사 뒤)",        size: "1200x300" },
  { key: "board_top",      label: "게시판 상단",                       size: "1200x300" },
  { key: "district_top",   label: "상권 상단",                         size: "1200x300" },
  { key: "orgs_top",       label: "지역단체 상단",                     size: "1200x300" },
  { key: "info_bottom",    label: "생활정보 하단",                     size: "1200x300" },
  { key: "market_infeed",  label: "나눔마켓 인피드 (현재 미노출)",     size: "600x400" },
];

const live = new Set(SLOTS.map((s) => s.key));

for (const s of SLOTS) {
  const { error } = await db
    .from("ad_slots")
    .upsert({ ...s, is_active: s.key !== "market_infeed" }, { onConflict: "key" });
  console.log(`  ${s.key.padEnd(16)} ${error ? `실패: ${error.message}` : "등록"}`);
}

// 코드에 자리가 없는 옛 슬롯은 내린다(삭제하지 않는다 — 옛 광고가 물려 있을 수 있다).
const { data: all } = await db.from("ad_slots").select("id,key,is_active");
for (const row of all ?? []) {
  if (!live.has(row.key) && row.is_active) {
    await db.from("ad_slots").update({ is_active: false }).eq("id", row.id);
    console.log(`  ${row.key.padEnd(16)} 비활성으로 내림(코드에 자리 없음)`);
  }
}

const { data: fin } = await db.from("ad_slots").select("key,label,is_active").order("id");
console.log(`\n총 ${fin.length}개 · 사용 중 ${fin.filter((s) => s.is_active).length}개`);
for (const s of fin) console.log(`  ${s.is_active ? "사용" : "중지"}  ${s.key.padEnd(16)} ${s.label}`);
