// 수집만 돌려 보는 점검용 스크립트. API 키 없이 실행된다.
//   node dryrun.mjs [시간창]
import { collectNews } from "./news.mjs";

const hours = Number(process.argv[2] ?? 30);
const r = await collectNews({ windowHours: hours });
console.log(`# 시간창 ${hours}시간`);

for (const t of [1, 2, 3]) {
  const items = r[`tier${t}`];
  console.log(`\n########## ${t}차 — ${items.length}건`);
  for (const it of items.slice(0, 5)) {
    console.log(`\n [${it.outlets.join("·")}] ${it.title}`);
    console.log(`   scope=${it.scope} 사건성=${it.incidents} 보도=${it.reportCount}곳 본문=${it.body?.length ?? 0}자`);
    if (it.body) console.log(`   → ${it.body.slice(0, 170).replace(/\n/g, " ")}`);
  }
}
console.log(
  "\n########## 제목만:",
  r.headlinesOnly.map((h) => `[${h.outlet}] ${h.title}`).join(" | ").slice(0, 400),
);
console.log("\n########## 실패:", r.failures);
