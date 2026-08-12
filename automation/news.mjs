// 타 매체 뉴스 수집 — 사건사고(해룡면 → 순천시)와 전국 이슈.
//
// 왜 필요한가. 순천시청 보도자료만 보면 "행정이 발표한 것"만 기사가 된다.
// 정작 주민이 궁금해하는 불·사고·사건은 시청이 발표하지 않는다. 그래서
// 언론사·방송사 보도를 단서로 삼는다.
//
// 저작권 — 여기서 읽는 것은 "무슨 일이 있었는가"라는 사실이다. 사실에는
// 저작권이 없지만 남이 쓴 문장에는 있다. 그래서 원문 문장을 옮기지 않는다.
// draft.mjs가 우리 문장으로 다시 쓰고, 어느 매체 보도인지 본문과 출처란에
// 밝히며 원문 링크를 남긴다. 이 규칙은 집필 프롬프트에 박아 두었다.
//
// 구조:
//   1) 매체 RSS를 읽어 제목·요약·링크를 모은다 (본문을 읽을 수 있는 것들)
//   2) 구글뉴스 검색 RSS로 "우리가 놓친 게 있는지" 훑는다 (제목만, 링크 못 씀)
//   3) 지역·사건 키워드로 1차(해룡면)·2차(순천시)·3차(전국)로 나눈다
//   4) 같은 사건을 여러 매체가 쓴 것은 하나로 묶는다 — 교차 확인이자 중복 방지

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0 Safari/537.36 (haeryongnews-bot; +https://www.sdtime.net)";

// 본문까지 읽을 수 있는 매체들. 여기 없는 매체 기사는 제목만 참고한다.
//
// kind: local = 전남·순천 담당(1·2차용), national = 전국(3차용)
// body: 본문 영역이 시작되는 태그. 못 찾으면 문서 전체에서 <p>를 긁는다.
export const FEEDS = [
  // ── 전남·순천 ─────────────────────────────────────────────
  { outlet: "순천광장신문", kind: "local", url: "https://www.agoranews.kr/rss/allArticle.xml" },
  { outlet: "전남일보", kind: "local", url: "https://www.jnilbo.com/rss/allArticle.xml" },
  { outlet: "남도일보", kind: "local", url: "https://www.namdonews.com/rss/allArticle.xml" },
  { outlet: "광주드림", kind: "local", url: "https://www.gjdream.com/rss/allArticle.xml" },
  { outlet: "연합뉴스", kind: "local", url: "https://www.yna.co.kr/rss/local.xml" },
  // ── 전국 ─────────────────────────────────────────────────
  // 순천 기사가 이쪽에 먼저 뜨는 일도 잦다. kind는 "우리 지역이 아닐 때
  // 3차 후보로 쓸 수 있는가"만 정한다 — 순천 기사면 어느 피드든 2차로 간다.
  { outlet: "연합뉴스", kind: "national", url: "https://www.yna.co.kr/rss/news.xml" },
  { outlet: "연합뉴스", kind: "national", url: "https://www.yna.co.kr/rss/society.xml" },
  { outlet: "뉴시스", kind: "national", url: "https://newsis.com/RSS/sokbo.xml" },
  { outlet: "SBS", kind: "national", url: "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=03" },
];

// 본문 영역 시작 태그. 호스트별로 다르다. 여는 태그만 찾고 그 뒤를 자른다 —
// 닫는 </div>를 정규식으로 맞추려 들면 중첩 때문에 어긋난다.
//
// 순서가 중요하다. 좁고 확실한 것부터 본다. "viewer" 같은 흔한 class를 앞에
// 두면 기사 대신 옆의 뉴스 위젯을 긁어온다(뉴시스에서 실제로 그랬다).
const BODY_START = [
  /<div[^>]+id="article-view-content-div"[^>]*>/i, // 전남일보·남도일보·순천광장신문(같은 CMS)
  /<[a-z]+[^>]+itemprop="articleBody"[^>]*>/i, // 뉴시스 등 schema.org 표기
  /<div[^>]+class="[^"]*story-news[^"]*"[^>]*>/i, // 연합뉴스
  /<div[^>]+class="[^"]*text_area[^"]*"[^>]*>/i, // SBS
  /<div[^>]+id="textBody"[^>]*>/i,
  /<article[^>]*>/i,
];

// 구글뉴스 검색 — 어느 매체든 걸린다. 다만 링크가 암호화돼 있어 본문은
// 읽지 못한다(확인함). 그래서 "이런 일이 있었다"는 신호로만 쓰고,
// 본문을 못 구한 건은 텔레그램 보고에 제목만 적어 발행인이 직접 보게 한다.
const GOOGLE_QUERIES = [
  "순천 해룡면",
  "순천 신대지구 OR 선월지구 OR 복성지구",
  "순천 화재 OR 사고 OR 경찰 OR 소방",
];

// 우리 지역. 앞의 것들은 다른 지역과 헷갈릴 일이 없다.
const HAERYONG_STRONG = ["해룡면", "해룡산단", "신대지구", "복성지구", "선월지구", "율촌산단"];
// 이것들은 "순천"과 같이 나와야 우리 동네다(신대동은 대전에도 있다).
const HAERYONG_WEAK = ["해룡", "신대", "복성", "선월", "오천동", "왕지동", "상삼", "홍내동"];

// 사건사고 판별. 두 단으로 나눈 이유가 있다 — "소방"·"경찰"·"폭염" 하나만
// 걸리면 '의용소방대 폭염순찰', '경찰서 합동훈련' 같은 홍보성 기사까지 사건으로
// 잡힌다. 그래서 아래 STRONG이 하나라도 있어야 1·2차 후보로 올린다.
//
// 낱말을 그냥 포함 검사하면 안 된다. 한국어는 붙여 쓰기 때문에
// "문화재단"에서 화재가, "산업구조"에서 구조가, "과학대학"에서 학대가 나온다.
// 실제로 '순천문화재단 어린이영화캠프'가 사건사고로 잡혔다. 그래서 앞뒤를
// 막은 정규식으로 센다.
const STRONG =
  /(?<!문)화재|불이 나|불이 붙|불길|방화(?!문|벽|셔터)|폭발|붕괴|무너져|무너진|누출|정전(?!협정)|침수|산사태|사고(?!방식|력)|추락|(?<!이해)충돌|전복|뺑소니|음주운전|역주행|감전|익사|숨져|숨진|사망|참변|중상(?!모략)|부상자|부상을|다쳐|다친|실종|구조됐|구조된|구조 작업|구조대|심정지|대피|중대재해|산업재해|구속(?!력)|체포|입건|송치|기소|적발|징역|선고|절도|폭행|보이스피싱|사기 혐의|사기를|마약|아동학대|노인학대|동물학대|학대 혐의|성범죄|성추행|성폭행|횡령|뇌물|리콜|집단감염/g;

// 정황을 알려주는 말. 혼자서는 부족하고, 우선순위를 매길 때만 쓴다.
const WEAK =
  /경찰|검찰|소방|119|수사|조사|재판|고소|고발|논란|항의|집회|파업|폭염|한파|호우|태풍|지진|온열질환|감염|확산|주의보|경보|안전/g;

// ── HTTP ────────────────────────────────────────────────────────────────

// 한국 언론사도 해외 IP를 막는 곳이 있다. 시청과 같은 중계를 먼저 쓰되,
// 중계가 실패하면 직접 시도한다 — 전국지 대부분은 해외에서도 열린다.
const RELAY_URL = process.env.RELAY_URL;
const RELAY_SECRET = process.env.RELAY_SECRET;

async function direct(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "application/rss+xml,text/xml,text/html,*/*",
      "accept-language": "ko-KR,ko;q=0.9",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function viaRelay(url) {
  const res = await fetch(`${RELAY_URL}?url=${encodeURIComponent(url)}`, {
    headers: { "x-relay-secret": RELAY_SECRET },
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`중계 ${res.status}`);
  return res.text();
}

async function get(url) {
  if (RELAY_URL && RELAY_SECRET) {
    try {
      return await viaRelay(url);
    } catch {
      // 중계가 막힌 도메인일 수 있다. 직접 한 번 더.
    }
  }
  return direct(url);
}

// ── 파싱 ────────────────────────────────────────────────────────────────

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&[lr]squo;/g, "'")
    .replace(/&[lr]dquo;/g, '"')
    .replace(/&middot;/g, "·")
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&");
}

// CDATA를 먼저 벗긴다. 이걸 태그로 보고 지우면 <![CDATA[제목]]> 이 통째로
// 사라진다 — 연합뉴스·뉴시스처럼 CDATA를 쓰는 매체가 전부 빈 제목이 된다.
function strip(html) {
  return decodeEntities(
    html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? strip(m[1]) : "";
}

// RSS 날짜는 매체마다 형식이 다르다. "2026-08-12 10:27:44"처럼 시간대가 없는
// 값은 한국시각으로 읽어야 한다 — 그냥 두면 UTC로 해석돼 9시간 어긋난다.
function parseDate(s) {
  if (!s) return null;
  const naive = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  const d = new Date(naive ? `${s.replace(" ", "T")}+09:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseRss(xml, { outlet, kind }) {
  const blocks = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  const out = [];
  for (const b of blocks) {
    const title = tag(b, "title");
    const link = tag(b, "link") || (b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "");
    if (!title || !link) continue;
    out.push({
      title,
      url: link,
      summary: tag(b, "description").slice(0, 600),
      outlet,
      kind,
      publishedAt: parseDate(tag(b, "pubDate") || tag(b, "dc:date")),
      readable: true,
    });
  }
  return out;
}

// 구글뉴스 제목은 "제목 - 매체명" 형태다. 매체명은 <source>에도 들어 있다.
// 포털·스포츠면은 원 매체의 기사를 그대로 실어 나른다. 출처로 적어도
// 의미가 없고 보도한 곳 수만 부풀린다.
const AGGREGATOR = /nate|daum|naver|zum\.com|msn|google|sports\./i;

function parseGoogle(xml) {
  const blocks = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  const out = [];
  for (const b of blocks) {
    const raw = tag(b, "title");
    if (!raw) continue;
    // 매체 이름과 주소를 둘 다 본다. 이름만 보면 "네이트"가 걸러지지 않는다.
    const src = b.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i);
    const outlet = (src ? strip(src[2]) : "") || raw.split(" - ").pop();
    if (AGGREGATOR.test(outlet) || AGGREGATOR.test(src?.[1] ?? "")) continue;
    const title = raw.replace(new RegExp(`\\s*-\\s*${outlet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
    out.push({
      title,
      url: "",
      summary: "",
      outlet: outlet || "타 매체",
      kind: "local",
      publishedAt: parseDate(tag(b, "pubDate")),
      readable: false, // 링크가 암호화돼 있어 본문을 못 읽는다
    });
  }
  return out;
}

// 본문 긁기. 문단(<p>) 단위로 모으고 저작권 고지·기자 서명·안내문을 걷어낸다.
// CSS 중괄호가 남은 줄은 본문이 아니라 페이지에 박힌 스타일이다 — 본문 영역
// 안에 위젯이 통째로 들어앉은 매체가 있어서 이 검사가 필요하다.
const NOISE =
  /무단\s*전재|재배포|저작권|Copyright|ⓒ|Internet Explorer|브라우저|구독|앱 다운로드|카카오톡|네이버에서|기사제보|광고 문의|\{[^}]*[:;][^}]*\}|^\s*\[.{0,20}\]\s*$/;

// 문단이 통째로 링크면 기사 본문이 아니라 옆에 붙은 다른 기사 목록이다
// (뉴시스 '오늘의 헤드라인' 위젯이 그래서 본문으로 딸려 왔다).
const WHOLE_LINK = /^\s*<a[\s>][\s\S]*<\/a>\s*$/i;

function paragraphs(chunk) {
  const found = [...chunk.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)]
    .filter((m) => !WHOLE_LINK.test(m[1]))
    .map((m) => strip(m[1]))
    .filter((t) => t.length >= 35 && !NOISE.test(t) && !/@[\w.]+/.test(t));
  return [...new Set(found)].join("\n\n");
}

function extractBody(html) {
  // 스크립트·스타일을 먼저 들어낸다. 남겨두면 본문 대신 CSS를 긁어온다.
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  let body = "";
  for (const re of BODY_START) {
    const m = clean.match(re);
    if (!m) continue;
    const from = m.index + m[0].length;
    body = paragraphs(clean.slice(from, from + 40000));
    break;
  }
  // 본문 영역을 못 찾았거나 위젯만 걸렸으면 문서 전체에서 문단을 모은다.
  if (body.length < 200) {
    const whole = paragraphs(clean);
    if (whole.length > body.length) body = whole;
  }
  // 그래도 짧으면 og:description이라도 건진다(항상 한두 문장은 들어 있다).
  const og = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i)?.[1];
  if (body.length < 120 && og) body = decodeEntities(og);

  return body.slice(0, 3000);
}

// 기사 하나의 본문. 3차는 후보가 수백 건이라 미리 다 받지 않고, 고른 뒤에
// draft.mjs가 이걸 직접 부른다.
export async function fetchBody(url) {
  return extractBody(await get(url));
}

// ── 분류 ────────────────────────────────────────────────────────────────

function has(text, words) {
  return words.some((w) => text.includes(w));
}

// 1 = 해룡면 사건사고, 2 = 순천시 사건사고, 3 = 전국 이슈, 0 = 버림
export function classify(item) {
  const text = `${item.title} ${item.summary}`;
  const strong = text.match(STRONG)?.length ?? 0;
  const incidents = strong * 2 + (text.match(WEAK)?.length ?? 0);
  const suncheon = text.includes("순천");
  const ours = has(text, HAERYONG_STRONG) || (suncheon && has(text, HAERYONG_WEAK));

  // 1·2차는 사건사고만 다룬다. 순천의 행정·행사 소식은 시청 자료 쪽 몫이다.
  if (strong > 0) {
    if (ours) return { tier: 1, scope: "해룡면", incidents };
    if (suncheon) return { tier: 2, scope: "순천시", incidents };
  }
  // 우리 지역 얘기가 아닌 것만 전국 이슈 후보로 남긴다.
  if (item.kind === "national" && !suncheon) return { tier: 3, scope: "전국", incidents };
  return { tier: 0, scope: null, incidents };
}

// 같은 사건인가. 제목의 두 글자 이상 낱말이 얼마나 겹치는지로 본다.
// 겹치는 낱말이 셋은 돼야 한다 — 비율만 보면 "순천 공장 화재"와
// "순천 아파트 화재"가 같은 사건이 돼 멀쩡한 기사가 중복으로 버려진다.
function words(title) {
  return new Set(
    title
      .replace(/[^가-힣0-9a-zA-Z ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2),
  );
}

export function sameEvent(a, b) {
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return false;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared >= 3 && shared / Math.min(A.size, B.size) >= 0.5;
}

// 여러 매체가 쓴 같은 사건을 하나로 묶는다. 대표는 본문을 읽을 수 있고
// 가장 자세한 것으로 고른다. 나머지 매체 이름은 교차 확인용으로 남긴다.
function cluster(items) {
  const groups = [];
  for (const it of items) {
    const g = groups.find((g) => sameEvent(g.title, it.title));
    if (g) g.members.push(it);
    else groups.push({ title: it.title, members: [it] });
  }
  return groups.map((g) => {
    const readable = g.members.filter((m) => m.readable);
    const lead = (readable.length > 0 ? readable : g.members).slice().sort((a, b) => (b.body?.length ?? 0) - (a.body?.length ?? 0))[0];
    // 몇 곳이 보도했는가 — 같은 매체의 여러 피드에 겹쳐 실린 것은 한 번으로 센다.
    const outlets = [...new Set(g.members.map((m) => m.outlet))];
    return { ...lead, outlets, reportCount: outlets.length };
  });
}

// ── 수집 ────────────────────────────────────────────────────────────────

// windowHours: 이 시간 안에 나온 기사만 본다. 매일 새벽 6시에 돌므로
// 기본 30시간이면 어제 하루가 통째로 들어온다.
export async function collectNews({ windowHours = 30, bodyLimit = 12 } = {}) {
  const failures = [];
  const since = Date.now() - windowHours * 3600 * 1000;
  const items = [];

  for (const feed of FEEDS) {
    try {
      items.push(...parseRss(await get(feed.url), feed));
    } catch (e) {
      failures.push(`${feed.outlet} RSS: ${e.message}`);
    }
  }

  for (const q of GOOGLE_QUERIES) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;
    try {
      items.push(...parseGoogle(await get(url)));
    } catch (e) {
      failures.push(`구글뉴스 "${q}": ${e.message}`);
    }
  }

  // 오래된 것은 뺀다. 날짜를 못 읽은 건 최신으로 보고 남긴다.
  const recent = items.filter((it) => !it.publishedAt || it.publishedAt.getTime() >= since);

  const tiers = { 1: [], 2: [], 3: [] };
  for (const it of recent) {
    const { tier, scope, incidents } = classify(it);
    if (tier === 0) continue;
    tiers[tier].push({ ...it, scope, incidents });
  }

  // 먼저 묶고 나서 본문을 읽는다. 순서가 반대면 같은 사건을 보도한 매체 수만큼
  // 중복해서 내려받는다.
  //
  // 정렬 기준은 칸마다 다르다 — 1·2차는 사건성이, 3차는 "몇 곳이 다뤘나"가
  // 중요하다. 여러 매체가 함께 쓴 것이 그날의 이슈다. 본문을 구한 건은
  // 언제나 앞으로 온다(제목만 있으면 기사를 쓸 수 없다).
  const usable = (it) => ((it.body?.length ?? 0) >= 120 ? 1 : 0);
  const order = (tier) => (a, b) => {
    if (usable(b) !== usable(a)) return usable(b) - usable(a);
    if (tier === 3) return b.reportCount - a.reportCount;
    return b.incidents - a.incidents || b.reportCount - a.reportCount;
  };

  const result = { failures };
  for (const tier of [1, 2, 3]) {
    result[`tier${tier}`] = cluster(tiers[tier])
      .sort(order(tier))
      .map((it) => ({ ...it, tier }));
  }

  // 본문 내려받기. 지역 기사부터, 예산 안에서.
  let budget = bodyLimit;
  for (const tier of [1, 2, 3]) {
    for (const it of result[`tier${tier}`].slice(0, tier === 3 ? 3 : 5)) {
      if (budget <= 0) break;
      if (!it.readable || !it.url) continue;
      budget -= 1;
      try {
        it.body = await fetchBody(it.url);
      } catch (e) {
        failures.push(`본문 ${it.outlet} "${it.title.slice(0, 18)}": ${e.message}`);
      }
    }
    result[`tier${tier}`].sort(order(tier));
  }

  // 본문을 못 구해 기사로 못 쓴 지역 소식 — 발행인이 직접 확인하도록 보고한다.
  result.headlinesOnly = [...result.tier1, ...result.tier2]
    .filter((it) => !it.body || it.body.length < 120)
    .slice(0, 6);

  return result;
}
