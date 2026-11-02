// 고정 테스트 — 외부 패키지 없이 `npm test` 로 돈다. 운영 DB에 접속하지 않는다.
// TypeScript 원본을 그대로 불러오므로 Node 22.18 이상이 필요하다.

const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const load = (file) =>
  import(pathToFileURL(path.join(__dirname, "..", file)).href);

const NOW = Date.parse("2026-11-02T03:00:00Z");
const art = (slug) => ({ slug });
const latest = ["a", "b", "c", "d", "e", "f"].map(art);
const slot = (key, slug, extra = {}) => ({
  slot: key,
  article: slug ? art(slug) : null,
  shortTitle: null,
  pinned: false,
  expiresAt: "2026-11-03T00:00:00Z",
  ...extra,
});

const cases = [];
const test = (name, fn) => cases.push([name, fn]);

async function main() {
  const { pickFrontPage, planSlotRows, shortTitleAfterTopChange } = await load(
    "lib/frontpage.ts",
  );
  const { isWidePath } = await load("lib/layout-paths.ts");
  const info = await load("lib/localinfo.ts");
  const MON_13 = Date.parse("2026-11-02T04:00:00Z"); // 월요일 13:00 KST
  const MON_20 = Date.parse("2026-11-02T11:00:00Z"); // 월요일 20:00 KST
  const SUN_13 = Date.parse("2026-11-08T04:00:00Z"); // 일요일 13:00 KST
  // 2026-11-02 실제 응답의 가까운평화약국
  const fields = {
    hpid: "C2601161",
    dutyName: "가까운평화약국",
    dutyAddr: "전라남도 순천시 해룡면 순광로 234-9, 가동 1층 101호",
    dutyEtc: "일요일 2,4주 휴무&#xD;\n",
    dutyTime1s: "0930",
    dutyTime1c: "1900",
    dutyTime7s: "0930",
    dutyTime7c: "1400",
  };
  const xml = `<item>${Object.entries(fields).map(([k, v]) => `<${k}>${v}</${k}>`).join("")}</item>`;
  const place = info.toPlace(info.parseXmlItems(xml)[0]);
  const slugs = (list) => list.map((a) => a.slug);

  test("편성이 없으면 최신순으로 채운다", () => {
    const p = pickFrontPage([], latest, NOW);
    assert.equal(p.lead.slug, "a");
    assert.deepEqual(slugs(p.subs), ["b", "c", "d"]);
    assert.deepEqual(slugs(p.rest), ["e", "f"]);
  });

  test("지정한 톱은 자동 칸에 다시 나오지 않는다", () => {
    const p = pickFrontPage([slot("top", "c")], latest, NOW);
    assert.equal(p.lead.slug, "c");
    assert.deepEqual(slugs(p.subs), ["a", "b", "d"]);
  });

  test("목록 밖의 오래된 기사도 지정할 수 있다", () => {
    const p = pickFrontPage([slot("top", "old")], latest, NOW);
    assert.equal(p.lead.slug, "old");
    assert.equal(p.subs.length, 3);
  });

  test("서브 칸 번호를 지킨다", () => {
    const p = pickFrontPage([slot("sub2", "f")], latest, NOW);
    assert.deepEqual(slugs(p.subs), ["b", "f", "c"]);
  });

  test("만료된 지정은 자동으로 복귀한다", () => {
    const p = pickFrontPage(
      [slot("top", "f", { expiresAt: "2026-11-01T00:00:00Z" })],
      latest,
      NOW,
    );
    assert.equal(p.lead.slug, "a");
  });

  test("고정은 만료되지 않는다", () => {
    const p = pickFrontPage(
      [slot("top", "f", { pinned: true, expiresAt: "2026-11-01T00:00:00Z" })],
      latest,
      NOW,
    );
    assert.equal(p.lead.slug, "f");
  });

  test("내린 기사(null)는 빠지고 짧은 제목도 쓰지 않는다", () => {
    const p = pickFrontPage(
      [slot("top", null, { shortTitle: "옛 제목" })],
      latest,
      NOW,
    );
    assert.equal(p.lead.slug, "a");
    assert.equal(p.leadTitle, null);
  });

  test("기사가 적어도 깨지지 않는다", () => {
    const p = pickFrontPage([], [art("a"), art("b")], NOW);
    assert.equal(p.lead.slug, "a");
    assert.deepEqual(slugs(p.subs), ["b"]);
    assert.deepEqual(pickFrontPage([], [], NOW).subs, []);
    assert.equal(pickFrontPage([], [], NOW).lead, null);
  });

  test("그대로 둔 기사는 만료 시각을 유지한다", () => {
    const rows = planSlotRows(
      { top: "t", subs: ["s"], shortTitle: " 짧게 ", pinned: false },
      [{ slot: "top", article_id: "t", expires_at: "2026-11-03T00:00:00.000Z" }],
      NOW,
    );
    assert.equal(rows[0].expires_at, "2026-11-03T00:00:00.000Z");
    assert.equal(rows[0].short_title, "짧게");
    assert.equal(rows[1].slot, "sub1");
    assert.equal(rows[1].short_title, null);
    assert.equal(rows[1].expires_at, "2026-11-05T03:00:00.000Z");
  });

  test("고정이면 만료 시각이 없고 서브는 3건까지만 받는다", () => {
    const rows = planSlotRows(
      { top: null, subs: ["1", "2", "3", "4"], shortTitle: "", pinned: true },
      [],
      NOW,
    );
    assert.deepEqual(rows.map((r) => r.slot), ["sub1", "sub2", "sub3"]);
    assert.ok(rows.every((r) => r.expires_at === null && r.pinned));
  });

  test("톱이 바뀌면 짧은 제목을 비운다", () => {
    assert.equal(shortTitleAfterTopChange("a", "b", "앞 기사 제목"), "");
    assert.equal(shortTitleAfterTopChange("a", null, "앞 기사 제목"), "");
    assert.equal(shortTitleAfterTopChange("a", "a", "그대로"), "그대로");
  });

  test("Encoding 키와 Decoding 키를 모두 받는다", () => {
    assert.equal(info.normalizeKey(" a%2Bb%3D%3D "), "a+b==");
    assert.equal(info.normalizeKey("a+b=="), "a+b==");
  });

  test("약국 응답을 읽고 영업 여부를 판정한다", () => {
    assert.equal(place.note, "일요일 2,4주 휴무");
    assert.equal(info.isHaeryong(place), true);
    assert.equal(info.isOpenAt(place, MON_13), true);
    assert.equal(info.isOpenAt(place, MON_20), false);
    assert.equal(info.isOpenAt(place, SUN_13), true);
    assert.equal(info.hoursLabel(place, 2), "등록된 시간 없음");
  });

  test("자정을 넘겨 여는 곳", () => {
    const late = { hours: [null, null, null, null, null, null, null, { open: 1800, close: 2600 }, null] };
    assert.equal(info.isOpenAt(late, Date.parse("2026-11-08T16:00:00Z")), true); // 월 01:00
    assert.equal(info.isOpenAt(late, Date.parse("2026-11-08T18:00:00Z")), false); // 월 03:00
    assert.equal(info.clock(2600), "다음날 02:00");
  });

  test("두 시도명에 나뉜 자료를 합친다", () => {
    const a = { id: "1", name: "나" };
    const b = { id: "2", name: "가" };
    assert.deepEqual(info.mergePlaces([[a, b], [a]]).map((p) => p.name), ["가", "나"]);
  });

  test("응급실 병상 표시 — 단정하지 않고 낡은 값은 내린다", () => {
    const stamp = "20261102144832"; // 2026-11-02 14:48 KST
    const at = Date.parse("2026-11-02T06:00:00Z"); // 15:00 KST
    const later = Date.parse("2026-11-02T07:00:00Z"); // 16:00 KST
    assert.equal(info.bedLabel("-7", stamp, at), "입력된 가용 병상 없음(0 이하) — 전화 확인");
    assert.equal(info.bedLabel("0", stamp, at), "입력된 가용 병상 없음(0 이하) — 전화 확인");
    assert.equal(info.bedLabel("3", stamp, at), "병원 입력 가용 병상 3");
    assert.equal(info.bedLabel("3", stamp, later), "병상 정보 확인 필요 — 전화 확인");
    assert.equal(info.bedLabel(undefined, stamp, at), "병상 정보 없음");
    assert.equal(info.stampLabel("20261102144832"), "11월 2일 14:48");
  });

  test("날씨 해석과 발표 시각", () => {
    assert.equal(info.skyLabel("1", "0"), "맑음");
    assert.equal(info.skyLabel("4", "1"), "비");
    assert.deepEqual(info.ncstBase(Date.parse("2026-11-02T05:10:00Z")), { date: "20261102", time: "1300" });
    assert.deepEqual(info.fcstBase(Date.parse("2026-11-02T05:30:00Z")), { date: "20261102", time: "1400" });
    assert.deepEqual(info.fcstBase(Date.parse("2026-11-01T16:30:00Z")), { date: "20261101", time: "2300" });
    assert.deepEqual(info.fcstBase(Date.parse("2026-11-01T17:30:00Z")), { date: "20261102", time: "0200" });
    assert.deepEqual(info.dayRangeBase(Date.parse("2026-11-02T05:30:00Z")), { date: "20261102", time: "0200" });
  });

  test("실패 사유는 조치 필요와 기다림을 가른다", () => {
    assert.equal(info.explainFailure({ missingKey: true }).needsAction, true);
    assert.equal(info.explainFailure({ status: 403 }).needsAction, true);
    assert.equal(info.explainFailure({ code: "22" }).needsAction, false);
    assert.equal(info.explainFailure({ timedOut: true }).needsAction, false);
  });

  test("넓은 지면을 쓰는 주소", () => {
    for (const p of ["/", "/info", "/articles", "/articles/local", "/article/x"])
      assert.equal(isWidePath(p), true, p);
    for (const p of ["/board", "/info/recycle", "/tips", "/articles-x"])
      assert.equal(isWidePath(p), false, p);
  });

  let failed = 0;
  for (const [name, fn] of cases) {
    try {
      fn();
      console.log(`  통과  ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`  실패  ${name}\n        ${err.message}`);
    }
  }
  console.log(`\n${cases.length - failed}/${cases.length} 통과`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
