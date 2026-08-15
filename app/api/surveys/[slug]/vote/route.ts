import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AGE_BANDS, SURVEY_DISTRICTS } from "@/lib/surveys";

// 투표 접수.
//
// 서버 액션이 아니라 Route Handler 인 이유 — 투표는 화면을 새로 그리는 일이
// 아니라 "받았다/안 받았다"를 즉시 돌려줘야 하는 일이다. 결과 코드를 그대로
// 받아 화면에서 문구를 고르는 편이 오류 처리가 정직해진다.
//
// 여기서 하는 일은 '넘기기 전 정리'뿐이고, 진짜 판정은 전부 DB의
// cast_survey_vote() 안에서 한 트랜잭션으로 이뤄진다. 이 파일이 통째로
// 뚫려도 남의 설문 보기로 투표하거나 두 번 투표할 수는 없다.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(code: string, status: number) {
  return NextResponse.json({ ok: false, code }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const supabase = createClient();

  // 사용자는 세션에서만 가져온다. 본문에 담겨 온 user id는 쳐다보지 않는다.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("BAD_REQUEST", 400);
  }
  const { optionId, district, ageBand } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof optionId !== "string" || !UUID_RE.test(optionId)) {
    return fail("INVALID_OPTION", 400);
  }
  // 선택 항목은 허용 목록에 있는 글자만 통과시킨다. DB에서 한 번 더 본다.
  if (
    district != null &&
    !(SURVEY_DISTRICTS as readonly string[]).includes(String(district))
  ) {
    return fail("INVALID_DISTRICT", 400);
  }
  if (
    ageBand != null &&
    !(AGE_BANDS as readonly string[]).includes(String(ageBand))
  ) {
    return fail("INVALID_AGE_BAND", 400);
  }

  // 설문 id는 주소의 slug 로 서버에서 다시 찾는다. 브라우저가 보낸 id를 쓰면
  // 화면에 열어둔 설문과 다른 설문에 표를 넣을 수 있다.
  const { data: survey } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", params.slug)
    .eq("status", "open")
    .maybeSingle();
  if (!survey) return fail("SURVEY_NOT_OPEN", 404);

  // IP는 원본을 남기지 않는다. 같은 회선에서 계정을 여러 개 만들어 몰표를
  // 넣는지 보려면 '같은 값인지'만 알면 되고, 그건 해시로 충분하다.
  // 소금(salt)이 없으면 IP 목록을 만들어 해시를 맞춰볼 수 있으므로 필수다.
  const salt = process.env.VOTE_IP_SALT;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash =
    salt && ip ? createHash("sha256").update(salt + ip).digest("hex") : null;

  const { data, error } = await supabase.rpc("cast_survey_vote", {
    p_survey_id: survey.id,
    p_option_id: optionId,
    p_district: district ?? null,
    p_age_band: ageBand ?? null,
    p_ip_hash: ipHash,
  });

  if (error) {
    // 오류 원문에는 테이블·컬럼 이름이 들어 있다. 로그에만 남긴다.
    console.error("[survey vote]", error);
    return fail("SERVER_ERROR", 500);
  }

  const result = data as { ok: boolean; code: string };
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
