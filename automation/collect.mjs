// 1차 자료 수집 — 순천시청 보도자료·새소식.
//
// 두 게시판 모두 서버 렌더링이라 일반 HTTP로 읽힌다(User-Agent만 있으면 된다).
// 브라우저 자동화는 필요 없다 — 더 빠르고 덜 깨진다.
//
// 저작권: 공공누리 대상 1차 자료만 본다. 타 언론사 기사는 수집하지 않는다.

import http from "node:http";
import https from "node:https";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0 Safari/537.36 (haeryongnews-bot; +https://www.sdtime.net)";

export const SOURCES = [
  {
    key: "press",
    name: "순천시청 보도자료",
    list: "https://www.suncheon.go.kr/kr/news/0006/0001/",
  },
  {
    key: "notice",
    name: "순천시청 새소식",
    list: "https://www.suncheon.go.kr/kr/news/0001/0001/",
  },
];

// 보도 대상 지역. 앞쪽일수록 우선순위가 높다(운영매뉴얼 4절).
const PRIORITY = [
  { words: ["해룡면", "해룡"], score: 100, scope: "해룡면" },
  { words: ["신대지구", "신대"], score: 90, scope: "신대지구" },
  { words: ["선월지구", "선월"], score: 90, scope: "선월지구" },
  { words: ["복성지구", "복성"], score: 90, scope: "복성지구" },
  { words: ["오천"], score: 70, scope: "해룡면" },
];

// 해룡면 주민 생활에 직접 닿는 주제 — 지역명이 없어도 끌어올린다.
const TOPIC_BONUS = [
  "어린이집", "학교", "학구", "버스", "교통", "도로", "상가", "분양", "입주",
  "보육", "복지", "행정복지센터", "쓰레기", "재활용", "공사", "축제", "모집",
];

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 시청 사이트 요청.
//
// node:http/https를 직접 쓴다. 전역 fetch는 연결 타임아웃이 10초 고정이라
// 느린 응답을 기다려주지 못한다. 리다이렉트도 직접 따라간다.
//
// 주의: 보도자료 게시판(0006/0001)은 https 요청을 http로 되돌린다. 망에 따라
// 80포트가 막혀 있으면 이 게시판만 실패하는데, 그건 정상 동작이다 —
// collect()가 실패를 모아 텔레그램 요약에 적고 새소식만으로 진행한다.
// 게시판 주소에 boardId를 붙여 https 경로로 우회하는 건 통하지 않는다(확인함).
function request(url, { timeout = 20000, hops = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(
      url,
      { headers: { "user-agent": UA, accept: "text/html,*/*" } },
      (res) => {
        const { statusCode, headers } = res;
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume();
          if (hops <= 0) return reject(new Error("리다이렉트가 너무 많습니다"));
          const next = new URL(headers.location, url).toString();
          return resolve(request(next, { timeout, hops: hops - 1 }));
        }
        if (statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      },
    );
    req.setTimeout(timeout, () => req.destroy(new Error("응답 시간 초과")));
    req.on("error", reject);
  });
}

async function get(url, { retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request(url);
    } catch (e) {
      if (attempt >= retries) throw new Error(`${e.message} — ${url}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// 목록에서 (상세 URL, 제목) 뽑기.
// 두 게시판이 td class도 링크 형식도 다르다:
//   보도자료 ?mode=view&seq=71587
//   새소식   ?boardId=BBS_...&mode=view&cntId=12476&...
// 형식을 특정하지 말고 제목 셀 안의 쿼리스트링 링크를 그대로 쓴다.
function parseList(html, listUrl) {
  const cells = [
    ...html.matchAll(/<td class="title_minwon lefttd">([\s\S]*?)<\/td>/g),
    ...html.matchAll(/<td class="title">([\s\S]*?)<\/td>/g),
  ];
  const out = [];
  const seen = new Set();
  for (const c of cells) {
    const a = c[1].match(/href="(\?[^"]*mode=view[^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    const query = a[1].replace(/&amp;/g, "&");
    const url = `${listUrl}${query}`;
    const title = strip(a[2]);
    if (!title || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

function parseDetail(html) {
  const m =
    html.match(/<div[^>]*class="[^"]*bbsViewCont[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/) ??
    html.match(/<td[^>]*class="[^"]*cont[^"]*"[^>]*>([\s\S]*?)<\/td>/);
  return m ? strip(m[1]) : "";
}

// 지역 관련성 점수. 0이면 우리 지역 기사로 보기 어렵다.
export function scoreItem(text) {
  let score = 0;
  let scope = null;
  for (const p of PRIORITY) {
    if (p.words.some((w) => text.includes(w))) {
      if (p.score > score) {
        score = p.score;
        scope = p.scope;
      }
    }
  }
  // 지역명이 없어도 순천시 전체 사안 중 생활에 닿는 것은 후보로 남긴다.
  const topics = TOPIC_BONUS.filter((t) => text.includes(t)).length;
  if (score === 0 && topics > 0) {
    score = 20 + Math.min(topics, 3) * 5;
    scope = "순천시";
  } else {
    score += Math.min(topics, 3) * 3;
  }
  return { score, scope };
}

// 각 게시판에서 최근 글을 읽어 관련도 순으로 정렬해 돌려준다.
export async function collect({ perSource = 10 } = {}) {
  const collected = [];
  const failures = [];

  for (const src of SOURCES) {
    try {
      const listHtml = await get(src.list);
      const items = parseList(listHtml, src.list).slice(0, perSource);
      if (items.length === 0) {
        failures.push(`${src.name}: 목록을 읽지 못했습니다(사이트 구조 변경 가능)`);
        continue;
      }

      for (const it of items) {
        const url = it.url;
        try {
          const body = parseDetail(await get(url));
          if (body.length < 100) continue; // 본문이 없으면 기사화 불가
          const { score, scope } = scoreItem(`${it.title} ${body}`);
          if (score === 0) continue;
          collected.push({
            sourceName: src.name,
            sourceUrl: url,
            title: it.title,
            body: body.slice(0, 4000),
            score,
            scope,
          });
        } catch (e) {
          // 개별 글 실패는 전체를 막지 않는다
          failures.push(`${src.name} "${it.title.slice(0, 20)}": ${e.message}`);
        }
      }
    } catch (e) {
      failures.push(`${src.name}: ${e.message}`);
    }
  }

  collected.sort((a, b) => b.score - a.score);
  return { collected, failures };
}
