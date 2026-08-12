// 기사 초안 자동 생성 — GitHub Actions에서 하루 한 번 실행.
//
//   수집(collect.mjs·news.mjs) → 중복 제거 → 집필(Claude) → news_drafts 적재
//   → 텔레그램으로 승인 요청
//
// 하루치 구성은 아래 PLAN 하나로 정해진다:
//   순천시청 1건(없으면 거른다) · 1차 해룡면 사건사고 · 2차 순천시 사건사고
//   · 3차 전국 이슈
// 어느 칸이든 쓸 자료가 없으면 비워 두고 보고에 적는다. 지어내지 않는다.
//
// 자동으로 게재되는 것은 한 건도 없다. 발행인이 [✅ 발행]을 눌러야 기사가 된다.
// 대표 이미지도 자동 생성하지 않는다 — 초안에 프롬프트만 담고, 발행 후
// 발행인이 직접 올린다.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { collect } from "./collect.mjs";
import { collectNews, fetchBody, sameEvent } from "./news.mjs";
import { sendDraft, sendRunReport } from "./telegram.mjs";

const MODEL = "claude-opus-5";

// 하루 구성. 칸마다 최대 몇 건까지 쓸지. 승인은 사람이 하므로 많을수록
// 좋은 게 아니다 — 아침에 읽고 판단할 수 있는 양이어야 한다.
const PLAN = [
  { key: "city", label: "순천시청", count: num("DRAFT_CITY", 1) },
  { key: "tier1", label: "1차 해룡면 사건사고", count: num("DRAFT_TIER1", 1) },
  { key: "tier2", label: "2차 순천시 사건사고", count: num("DRAFT_TIER2", 1) },
  { key: "tier3", label: "3차 전국 이슈", count: num("DRAFT_TIER3", 1) },
];

function num(name, fallback) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`환경변수 ${name} 이(가) 없습니다.`);
    process.exit(1);
  }
  return v;
}

const supabase = createClient(
  required("SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

const anthropic = new Anthropic({ apiKey: required("ANTHROPIC_API_KEY") });

const VOICE = `너는 전남 순천시 해룡면 지역신문 '해룡신문'의 기자다.
독자는 신대지구·복성지구·선월지구·해룡면에 사는 주민이다.

공통 원칙:
- 사실은 제공된 자료에 있는 것만 쓴다. 없는 숫자·날짜·인용·기관명을 지어내지 않는다.
- 홍보성 수식어("획기적", "야심차게", "적극 추진")를 쓰지 않는다.
- 문장은 짧게, 능동태로. 첫 문단에 핵심(무엇이·언제·어디서·누구에게)을 담는다.
- 확인 없이 쓰면 위험한 부분은 본문에 억지로 쓰지 말고 needs_check에 적는다.`;

const SYSTEM_CITY = `${VOICE}

이번 자료는 순천시청이 낸 1차 자료(보도자료·새소식)다.
- 보도자료를 그대로 옮기지 않는다. "우리 동네에 무엇이 달라지는가"를
  주민의 관점에서 다시 쓴다.
- 보도자료 말투를 기사 말투로 바꾼다.
- 신청·문의가 있는 사안은 마지막 문단에 방법과 기한을 정리한다.`;

// 남의 기사를 단서로 쓸 때의 규칙. 이게 이 자동화에서 가장 중요한 부분이다 —
// 사실에는 저작권이 없지만 남이 쓴 문장에는 있고, 출처를 감추면 그냥 표절이다.
const SYSTEM_NEWS = `${VOICE}

이번 자료는 다른 언론사·방송사의 보도다. 지켜야 할 것:
- 원문 문장을 옮기지 않는다. 사실만 가져와 처음부터 우리 문장으로 쓴다.
  원문과 같은 문장이 한 줄이라도 남으면 안 된다.
- 어느 매체 보도인지 본문에 반드시 밝힌다. "연합뉴스에 따르면", "KBS는
  ...라고 보도했다"처럼 첫 문단이나 해당 사실 옆에 적는다.
- 우리가 직접 취재하지 않은 것을 직접 확인한 것처럼 쓰지 않는다.
- 여러 매체가 함께 보도한 사안이면 공통되는 사실만 단정하고, 한 곳만
  보도한 내용은 그 매체를 밝혀 적는다.

사건사고를 쓸 때:
- 피해자·피의자의 실명, 나이·직업·주소 등 신원을 짐작하게 하는 것은 쓰지 않는다.
  자료에 있더라도 "70대 남성" 수준까지만 쓴다.
- 원인은 단정하지 않는다. "경찰은 ...로 보고 조사 중이다"처럼 발표 주체를 밝힌다.
- 자극적인 묘사와 추측을 쓰지 않는다. 주민이 알아야 할 것(어디서, 지금은
  안전한지, 통제·우회 여부, 주의할 점)에 무게를 둔다.

전국 이슈를 쓸 때:
- 전국 뉴스를 그대로 요약하지 않는다. 해룡면 주민에게 무슨 뜻인지,
  무엇이 달라지는지를 마지막 문단에 반드시 짚는다.
- 지역과 연결되는 고리가 억지스러우면 억지로 만들지 말고 skip_reason에 적는다.`;

const SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "기사 제목. 35자 이내. 원문 제목을 그대로 쓰지 않는다.",
    },
    subtitle: {
      type: "string",
      description: "부제 한 줄. 제목이 담지 못한 핵심(기한·대상·장소 등). 60자 이내.",
    },
    body: {
      type: "string",
      description:
        "기사 본문. 800~1200자. 자료가 얇으면 400자라도 좋으니 아는 것만 쓴다. " +
        "문단은 빈 줄로 구분한다. 소제목·마크다운·불릿 금지, 평문만.",
    },
    category_slug: {
      type: "string",
      enum: ["local", "admin", "people", "life"],
      description:
        "local=해룡소식(동네 사건·사업·변화), admin=행정(시·면의 정책과 집행), " +
        "people=해룡인물(사람 이야기), life=생활(모집·행사·복지 등 생활정보)",
    },
    scope: {
      type: "string",
      description: "해당 지역. 신대지구/복성지구/선월지구/해룡면/순천시/전국 중 하나.",
    },
    needs_check: {
      type: "string",
      description:
        "게재 전 확인이 필요한 사실관계. 없으면 빈 문자열. 있으면 한 줄씩 구체적으로.",
    },
    image_prompt: {
      type: "string",
      description:
        "대표 이미지를 사람이 만들 때 쓸 한글 프롬프트 한 문장. 실존 인물·로고·상표를 " +
        "묘사하지 않는다. 사건사고는 현장 재현 대신 상징적인 장면으로 한다.",
    },
    skip_reason: {
      type: "string",
      description:
        "해룡면 주민에게 기사 가치가 없거나 자료가 너무 얇아 초안을 만들지 않는 게 " +
        "맞다면 그 이유. 아니면 빈 문자열.",
    },
  },
  required: [
    "title",
    "subtitle",
    "body",
    "category_slug",
    "scope",
    "needs_check",
    "image_prompt",
    "skip_reason",
  ],
};

async function write(system, prompt) {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    tools: [
      { name: "save_draft", description: "작성한 기사 초안을 저장한다.", input_schema: SCHEMA },
    ],
    tool_choice: { type: "tool", name: "save_draft" },
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  return block ? block.input : null;
}

function cityPrompt(item) {
  return (
    `다음은 ${item.sourceName}의 원문이다. 이걸 바탕으로 해룡신문 기사 초안을 써라.\n` +
    `우리가 판단한 관련 지역: ${item.scope}\n\n` +
    `제목: ${item.title}\n\n본문:\n${item.body}`
  );
}

function newsPrompt(item) {
  const others = item.outlets.filter((o) => o !== item.outlet);
  return (
    `다음은 ${item.outlet} 보도다. 이걸 단서로 해룡신문 기사 초안을 써라.\n` +
    `분류: ${item.tier === 1 ? "해룡면 사건사고" : item.tier === 2 ? "순천시 사건사고" : "전국 이슈"}\n` +
    `우리가 판단한 관련 지역: ${item.scope}\n` +
    (others.length > 0
      ? `같은 사안을 함께 보도한 곳: ${others.join(", ")} (교차 확인됨)\n`
      : "이 사안을 보도한 곳은 이 매체 하나다. 단정에 특히 조심하라.\n") +
    `원문 링크: ${item.url}\n\n` +
    `제목: ${item.title}\n\n` +
    (item.summary ? `요약: ${item.summary}\n\n` : "") +
    `본문:\n${item.body ?? "(본문을 읽지 못했다. 제목과 요약만으로 판단하라. " +
      "기사로 쓰기에 사실이 부족하면 skip_reason에 적어라.)"}`
  );
}

// 전국 뉴스는 하루에 수백 건이다. 무엇이 우리 독자에게 값진지 먼저 고른다.
async function pickNational(items) {
  if (items.length <= 1) return items[0] ?? null;
  const list = items
    .map((it, i) => `${i}. [${it.outlet}] ${it.title}${it.summary ? ` — ${it.summary.slice(0, 100)}` : ""}`)
    .join("\n");
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system:
        "너는 전남 순천시 해룡면 지역신문의 편집자다. 전국 뉴스 목록에서 " +
        "해룡면 주민의 생활·안전·돈에 실제로 닿는 것 하나를 고른다. " +
        "정치 공방·연예·스포츠·단순 인사는 고르지 않는다.",
      tools: [
        {
          name: "pick",
          description: "가장 값진 기사 하나를 고른다.",
          input_schema: {
            type: "object",
            properties: {
              index: { type: "integer", description: "고른 기사의 번호" },
              reason: { type: "string", description: "해룡면 주민에게 왜 중요한지 한 줄" },
            },
            required: ["index", "reason"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "pick" },
      messages: [{ role: "user", content: `오늘의 전국 뉴스다.\n\n${list}` }],
    });
    const picked = res.content.find((b) => b.type === "tool_use")?.input;
    const chosen = items[picked?.index];
    if (chosen) {
      console.log(`전국 이슈 선정: ${chosen.title} — ${picked.reason}`);
      return chosen;
    }
  } catch (e) {
    console.error(`[전국 선정] ${e.message} — 첫 번째 기사로 진행한다`);
  }
  return items[0];
}

// 이미 초안으로 만들었거나 기사로 나간 원문은 다시 쓰지 않는다.
async function seenUrls(urls) {
  const seen = new Set();
  if (urls.length === 0) return seen;
  for (const table of ["news_drafts", "articles"]) {
    const { data, error } = await supabase.from(table).select("source_url").in("source_url", urls);
    if (error) {
      console.error(`[중복확인] ${table}: ${error.message}`);
      continue;
    }
    for (const r of data ?? []) if (r.source_url) seen.add(r.source_url);
  }
  return seen;
}

// 같은 사건을 어제는 연합뉴스로, 오늘은 KBS로 받으면 주소가 달라 위 확인을
// 통과한다. 그래서 최근 초안 제목과도 견줘 본다.
async function recentTitles(days = 21) {
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
  const { data, error } = await supabase
    .from("news_drafts")
    .select("title")
    .gte("created_at", since);
  if (error) {
    console.error(`[중복확인] 최근 제목: ${error.message}`);
    return [];
  }
  return (data ?? []).map((r) => r.title);
}

async function main() {
  const failures = [];
  const notes = [];

  // ── 수집 ───────────────────────────────────────────────
  const city = await collect({ perSource: 10 }).catch((e) => {
    failures.push(`순천시청 수집: ${e.message}`);
    return { collected: [], failures: [] };
  });
  failures.push(...city.failures);

  const news = await collectNews({ windowHours: num("NEWS_WINDOW_HOURS", 30) }).catch((e) => {
    failures.push(`언론사 수집: ${e.message}`);
    return { tier1: [], tier2: [], tier3: [], headlinesOnly: [], failures: [] };
  });
  failures.push(...news.failures);

  console.log(
    `수집 — 시청 ${city.collected.length}건, 1차 ${news.tier1.length}건, ` +
      `2차 ${news.tier2.length}건, 3차 ${news.tier3.length}건`,
  );

  // ── 중복 제거 ──────────────────────────────────────────
  const pools = {
    city: city.collected.map((c) => ({ ...c, url: c.sourceUrl, outlet: c.sourceName })),
    tier1: news.tier1,
    tier2: news.tier2,
    tier3: news.tier3,
  };
  const seen = await seenUrls(
    Object.values(pools).flat().map((it) => it.url).filter(Boolean),
  );
  const priorTitles = await recentTitles();
  let skipped = 0;
  for (const key of Object.keys(pools)) {
    const before = pools[key].length;
    pools[key] = pools[key].filter(
      (it) => !seen.has(it.url) && !priorTitles.some((t) => sameEvent(t, it.title)),
    );
    skipped += before - pools[key].length;
  }

  // 제목만 있는 건은 기사로 쓸 수 없다. 남의 헤드라인 한 줄을 부풀려 기사를
  // 만드는 건 오보로 가는 지름길이다. 이런 건 보고에만 올려 발행인이 직접
  // 확인하게 한다(news.mjs 의 headlinesOnly).
  const writable = (it) => (it.body?.length ?? 0) >= 120 || (it.summary?.length ?? 0) >= 80;
  pools.tier1 = pools.tier1.filter(writable);
  pools.tier2 = pools.tier2.filter(writable);

  // 전국은 후보가 수백 건이다. 쓸 만한 하나를 먼저 고르고, 그것만 본문을
  // 받아 집필한다. 전부 미리 받으면 쓰지도 않을 기사를 수십 번 내려받게 된다.
  if (pools.tier3.length > 1) {
    const chosen = await pickNational(pools.tier3.slice(0, 25));
    if (chosen) {
      if (!chosen.body && chosen.url) {
        try {
          chosen.body = await fetchBody(chosen.url);
        } catch (e) {
          failures.push(`본문 ${chosen.outlet} "${chosen.title.slice(0, 18)}": ${e.message}`);
        }
      }
      pools.tier3 = [chosen, ...pools.tier3.filter((it) => it !== chosen)];
    }
  }
  pools.tier3 = pools.tier3.filter(writable);

  // ── 집필 ───────────────────────────────────────────────
  const slots = [];
  let drafted = 0;
  const total = PLAN.reduce((n, s) => n + Math.min(s.count, pools[s.key].length), 0);

  for (const slot of PLAN) {
    let made = 0;
    for (const item of pools[slot.key]) {
      if (made >= slot.count) break;

      const isCity = slot.key === "city";
      let written;
      try {
        written = await write(
          isCity ? SYSTEM_CITY : SYSTEM_NEWS,
          isCity ? cityPrompt(item) : newsPrompt(item),
        );
      } catch (e) {
        failures.push(`집필 실패 "${item.title.slice(0, 20)}": ${e.message}`);
        continue;
      }
      if (!written) {
        failures.push(`집필 실패 "${item.title.slice(0, 20)}": 응답 형식 오류`);
        continue;
      }
      // 모델이 스스로 "기사 가치 없음"이라고 판단하면 존중한다.
      if (written.skip_reason) {
        console.log(`건너뜀: ${item.title.slice(0, 30)} — ${written.skip_reason}`);
        continue;
      }

      // 출처는 여러 곳일 수 있다. 승인 화면에서 한눈에 보이도록 모두 적는다.
      const sourceName = isCity
        ? item.sourceName
        : (item.outlets ?? [item.outlet]).join("·");

      const { data, error } = await supabase
        .from("news_drafts")
        .insert({
          title: written.title,
          subtitle: written.subtitle || null,
          body: written.body,
          category_slug: written.category_slug,
          source_name: sourceName,
          source_url: item.url || null,
          scope: written.scope || item.scope,
          needs_check: written.needs_check || null,
          image_prompt: written.image_prompt || null,
        })
        .select(
          "id, title, subtitle, body, category_slug, source_name, source_url, scope, needs_check",
        )
        .single();

      if (error) {
        failures.push(`초안 저장 실패 "${written.title.slice(0, 20)}": ${error.message}`);
        continue;
      }

      made += 1;
      drafted += 1;
      const messageId = await sendDraft(data, `${drafted}/${total} · ${slot.label}`);
      if (messageId) {
        await supabase.from("news_drafts").update({ tg_message_id: messageId }).eq("id", data.id);
      }
      console.log(`초안 ${drafted} [${slot.label}]: ${written.title}`);
    }

    slots.push({ label: slot.label, made, candidates: pools[slot.key].length });
    if (made === 0) {
      notes.push(
        pools[slot.key].length === 0
          ? `${slot.label} — 오늘은 새로 나온 자료가 없습니다.`
          : `${slot.label} — 후보 ${pools[slot.key].length}건 모두 기사 가치가 없다고 판단했습니다.`,
      );
    }
  }

  await sendRunReport({
    drafted,
    skipped,
    failures,
    slots,
    notes,
    headlines: news.headlinesOnly ?? [],
  });
  for (const f of failures) console.error(`⚠ ${f}`);
  console.log(`완료 — 초안 ${drafted}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
