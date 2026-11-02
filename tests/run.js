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
