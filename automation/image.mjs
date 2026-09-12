// 대표 이미지 — 초안에 붙일 그림을 마련해 Storage에 올린다.
//
//   순천시청 자료 → 보도자료에 첨부된 사진. 자르거나 고치지 않고 원본 그대로
//                   올린다(공공누리 제4유형: 변경금지). 출처를 함께 적는다.
//   전국 이슈     → AI로 만든다. 현장 사진으로 오인되지 않게 일러스트로 그리고,
//                   그림 안에 "AI 생성 이미지"를 새긴다. 목록 썸네일과 카톡·
//                   페이스북 공유 카드에는 캡션이 따라가지 않기 때문이다.
//   사건사고      → 붙이지 않는다(draft.mjs가 거른다).
//
// 어느 경우든 발행인이 텔레그램에서 그림을 보고 [발행]을 눌러야 게재된다.

import sharp from "sharp";
import { downloadPhoto } from "./collect.mjs";

const BUCKET = "articles";

export const CITY_CREDIT = "사진: 순천시 제공(공공누리 제4유형)";
export const AI_CREDIT = "이미지: AI 생성";

// 파일 머리 몇 바이트로 형식을 가린다. 확장자는 믿지 않는다 — 오류 안내
// 페이지(HTML)가 .jpg 이름을 달고 올 수 있다.
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 4).toString("hex") === "89504e47") return "png";
  return null;
}

async function upload(supabase, draftId, buf, type) {
  const path = `drafts/${draftId}.${type === "jpeg" ? "jpg" : type}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: `image/${type}`, upsert: true });
  if (error) throw new Error(`업로드 실패: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// ── 순천시청 첨부사진 ────────────────────────────────────────────────────

// 첨부 가운데 무엇을 쓸까. 카드뉴스·포스터처럼 글자로 가득한 그림은 현장
// 사진보다 대표 이미지로 약하다 — 뒤로 미룬다. 나머지는 게시판에 올린 순서
// 그대로다(담당자가 대개 대표 사진을 1번으로 올린다).
const POSTERISH = /카드뉴스|포스터|홍보물|리플릿|리플렛|전단|웹자보|안내문|이미지\s*\d*\.(jpe?g|png)$/;

// Telegram이 주소로 사진을 받을 때 5MB가 한도다. 넘으면 텔레그램에서
// 그림이 안 보인다. 그보다 큰 첨부는 건너뛴다.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function cityPhoto(supabase, draftId, photos) {
  const ordered = [
    ...photos.filter((p) => !POSTERISH.test(p.name)),
    ...photos.filter((p) => POSTERISH.test(p.name)),
  ];
  let lastError = null;
  for (const photo of ordered.slice(0, 3)) {
    try {
      const buf = await downloadPhoto(photo);
      const type = sniff(buf);
      if (!type) throw new Error("이미지 파일이 아닙니다");
      if (buf.length > MAX_PHOTO_BYTES) throw new Error("5MB가 넘습니다");
      return { url: await upload(supabase, draftId, buf, type), credit: CITY_CREDIT, ai: false };
    } catch (e) {
      lastError = new Error(`${photo.name.slice(0, 24)}: ${e.message}`);
    }
  }
  throw lastError ?? new Error("쓸 수 있는 첨부사진이 없습니다");
}

// ── AI 생성 ─────────────────────────────────────────────────────────────

// 키가 있는 쪽을 쓴다. 둘 다 있으면 OpenAI. 모델은 IMAGE_MODEL로 바꿀 수 있다.
export function hasImageProvider() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

// 사진처럼 그리면 현장 사진으로 읽힌다. 기사 삽화 톤으로 못 박는다.
const STYLE =
  "뉴스 기사용 편집 일러스트. 사실적인 사진처럼 보이지 않는 평면 일러스트 화풍, " +
  "차분한 색감, 가로로 긴 구도. 그림 안에 글자·숫자·로고·상표·실존 인물을 넣지 않는다.";

async function openai(prompt) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium",
      n: 1,
    }),
    signal: AbortSignal.timeout(180000),
  });
  const json = await res.json().catch(() => ({}));
  const b64 = json.data?.[0]?.b64_json;
  if (!res.ok || !b64) throw new Error(`OpenAI ${res.status} ${json.error?.message ?? ""}`.trim());
  return Buffer.from(b64, "base64");
}

async function gemini(prompt) {
  const model = process.env.IMAGE_MODEL || "imagen-4.0-generate-001";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: "16:9" },
      }),
      signal: AbortSignal.timeout(180000),
    },
  );
  const json = await res.json().catch(() => ({}));
  const b64 = json.predictions?.[0]?.bytesBase64Encoded;
  if (!res.ok || !b64) throw new Error(`Gemini ${res.status} ${json.error?.message ?? ""}`.trim());
  return Buffer.from(b64, "base64");
}

// 그림 안에 "AI 생성 이미지"를 새긴다.
//
// 자리는 아래쪽 가운데, 바닥에서 높이의 16% 위. 목록 썸네일은 가운데를
// 정사각형으로 자르고(좌우가 잘림), 공유 카드는 1.91:1~2:1로 자른다(위아래가
// 11~13%씩 잘림). 둘 다에서 살아남는 곳이다.
//
// 글꼴은 러너에 설치한 나눔고딕(daily-drafts.yml). 없으면 네모로 깨진다.
export async function stampAiLabel(input) {
  const { data: base, info } = await sharp(input)
    .resize({ width: 1600, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const text = "AI 생성 이미지";
  const size = Math.round(w * 0.03);
  const padX = Math.round(size * 0.7);
  const boxH = Math.round(size * 1.7);
  // 한글 5자 + 영문 2자 + 공백 2개 ≈ 글자 크기의 6.9배
  const boxW = Math.round(size * 6.9 + padX * 2);
  const x = Math.round((w - boxW) / 2);
  const y = Math.round(h * 0.84 - boxH);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="${Math.round(boxH / 2)}" fill="#000" fill-opacity="0.62"/>
  <text x="${w / 2}" y="${y + boxH / 2 + size * 0.36}" text-anchor="middle"
    font-family="NanumGothic, 'Noto Sans CJK KR', 'Malgun Gothic', sans-serif"
    font-weight="700" font-size="${size}" fill="#fff">${text}</text>
</svg>`;

  return sharp(base)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

export async function aiImage(supabase, draftId, prompt) {
  const full = `${prompt}\n\n${STYLE}`;
  const raw = process.env.OPENAI_API_KEY ? await openai(full) : await gemini(full);
  const stamped = await stampAiLabel(raw);
  return { url: await upload(supabase, draftId, stamped, "jpeg"), credit: AI_CREDIT, ai: true };
}
