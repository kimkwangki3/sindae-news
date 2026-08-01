// 기사 초안 자동 생성 — GitHub Actions에서 하루 한 번 실행.
//
//   수집(collect.mjs) → 중복 제거 → 집필(Claude) → news_drafts 적재
//   → 텔레그램으로 승인 요청
//
// 자동으로 게재되는 것은 한 건도 없다. 발행인이 [✅ 발행]을 눌러야 기사가 된다.
// 대표 이미지도 자동 생성하지 않는다 — 초안에 프롬프트만 담고, 발행 후
// 발행인이 직접 올린다.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { collect } from "./collect.mjs";
import { sendDraft, sendRunReport } from "./telegram.mjs";

const MODEL = "claude-opus-5";

// 하루에 만들 초안 수. 승인은 사람이 하므로 많을수록 좋은 게 아니다.
const DRAFT_COUNT = Number(process.env.DRAFT_COUNT ?? 3);

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

const SYSTEM = `너는 전남 순천시 해룡면 지역신문 '해룡신문'의 기자다.
독자는 신대지구·복성지구·선월지구·해룡면에 사는 주민이다.

원칙:
- 관공서 보도자료를 그대로 옮기지 않는다. "우리 동네에 무엇이 달라지는가"를
  주민의 관점에서 다시 쓴다.
- 사실은 제공된 원문에 있는 것만 쓴다. 없는 숫자·날짜·인용·기관명을 지어내지 않는다.
- 홍보성 수식어("획기적", "야심차게", "적극 추진")를 쓰지 않는다.
- 보도자료 말투를 기사 말투로 바꾼다. 문장은 짧게, 능동태로.
- 첫 문단에 핵심(무엇이·언제·어디서·누구에게)을 담는다.
- 확인 없이 쓰면 위험한 부분(일정 변경 가능, 대상 조건 모호, 금액·인원 불명확 등)은
  본문에 억지로 쓰지 말고 needs_check에 따로 적는다.
- 신청·문의가 있는 사안은 마지막 문단에 방법과 기한을 정리한다.`;

const SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "기사 제목. 35자 이내. 지역명을 넣되 보도자료 제목을 그대로 쓰지 않는다.",
    },
    subtitle: {
      type: "string",
      description: "부제 한 줄. 제목이 담지 못한 핵심(기한·대상·장소 등). 60자 이내.",
    },
    body: {
      type: "string",
      description:
        "기사 본문. 800~1200자. 문단은 빈 줄로 구분한다. 소제목·마크다운·불릿 금지, 평문만.",
    },
    category_slug: {
      type: "string",
      enum: ["local", "admin", "people", "life"],
      description:
        "local=지역소식, admin=시·면 행정, people=인물, life=생활정보(모집·행사·복지)",
    },
    scope: {
      type: "string",
      description: "해당 지역. 신대지구/복성지구/선월지구/해룡면/순천시 중 하나.",
    },
    needs_check: {
      type: "string",
      description:
        "게재 전 확인이 필요한 사실관계. 없으면 빈 문자열. 있으면 한 줄씩 구체적으로.",
    },
    image_prompt: {
      type: "string",
      description:
        "대표 이미지를 사람이 만들 때 쓸 한글 프롬프트 한 문장. 실존 인물·로고·상표를 묘사하지 않는다.",
    },
    skip_reason: {
      type: "string",
      description:
        "해룡면 주민에게 기사 가치가 없어 초안을 만들지 않는 게 맞다면 그 이유. 아니면 빈 문자열.",
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

async function write(item) {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    tools: [
      {
        name: "save_draft",
        description: "작성한 기사 초안을 저장한다.",
        input_schema: SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_draft" },
    messages: [
      {
        role: "user",
        content:
          `다음은 ${item.sourceName}의 원문이다. 이걸 바탕으로 해룡신문 기사 초안을 써라.\n` +
          `우리가 판단한 관련 지역: ${item.scope}\n\n` +
          `제목: ${item.title}\n\n본문:\n${item.body}`,
      },
    ],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  return block ? block.input : null;
}

// 이미 초안으로 만들었거나 이미 기사로 나간 원문은 다시 쓰지 않는다.
async function seenUrls(urls) {
  const seen = new Set();
  for (const table of ["news_drafts", "articles"]) {
    const { data, error } = await supabase
      .from(table)
      .select("source_url")
      .in("source_url", urls);
    if (error) {
      console.error(`[중복확인] ${table}: ${error.message}`);
      continue;
    }
    for (const r of data ?? []) if (r.source_url) seen.add(r.source_url);
  }
  return seen;
}

async function main() {
  const { collected, failures } = await collect({ perSource: 10 });
  console.log(`수집 ${collected.length}건, 실패 ${failures.length}건`);

  const seen = collected.length > 0 ? await seenUrls(collected.map((c) => c.sourceUrl)) : new Set();
  const fresh = collected.filter((c) => !seen.has(c.sourceUrl));
  const skipped = collected.length - fresh.length;

  let drafted = 0;
  for (const item of fresh) {
    if (drafted >= DRAFT_COUNT) break;

    let written;
    try {
      written = await write(item);
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

    const { data, error } = await supabase
      .from("news_drafts")
      .insert({
        title: written.title,
        subtitle: written.subtitle || null,
        body: written.body,
        category_slug: written.category_slug,
        source_name: item.sourceName,
        source_url: item.sourceUrl,
        scope: written.scope || item.scope,
        needs_check: written.needs_check || null,
        image_prompt: written.image_prompt || null,
      })
      .select("id, title, subtitle, body, category_slug, source_name, source_url, scope, needs_check")
      .single();

    if (error) {
      failures.push(`초안 저장 실패 "${written.title.slice(0, 20)}": ${error.message}`);
      continue;
    }

    drafted += 1;
    const messageId = await sendDraft(data, `${drafted}/${Math.min(DRAFT_COUNT, fresh.length)}`);
    if (messageId) {
      await supabase.from("news_drafts").update({ tg_message_id: messageId }).eq("id", data.id);
    }
    console.log(`초안 ${drafted}: ${written.title}`);
  }

  await sendRunReport({ drafted, skipped, failures });
  for (const f of failures) console.error(`⚠ ${f}`);
  console.log(`완료 — 초안 ${drafted}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
