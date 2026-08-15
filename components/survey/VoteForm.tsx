"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AGE_BANDS,
  SURVEY_DISTRICTS,
  type SurveyOption,
} from "@/lib/surveys";

// 참여 폼.
//
// 서버가 돌려주는 것은 사람이 읽는 문장이 아니라 코드다(ALREADY_VOTED 같은).
// 문장은 여기서 고른다 — 오류 원문에는 테이블·컬럼 이름이 섞여 나올 수 있어
// 그대로 화면에 띄우면 DB 구조를 알려주는 셈이 된다.
const MESSAGE: Record<string, string> = {
  UNAUTHENTICATED: "로그인이 풀렸어요. 다시 로그인해 주세요.",
  ACCOUNT_NOT_ELIGIBLE:
    "닉네임·거주지역 설정을 마친 계정만 참여할 수 있어요. 내정보에서 설정해 주세요.",
  ALREADY_VOTED: "이미 참여하신 조사예요.",
  SURVEY_NOT_OPEN: "지금은 참여할 수 없는 조사예요.",
  NOT_STARTED: "아직 시작 전인 조사예요.",
  ALREADY_ENDED: "마감된 조사예요.",
  INVALID_OPTION: "보기를 다시 선택해 주세요.",
  INVALID_DISTRICT: "거주 지구를 다시 선택해 주세요.",
  INVALID_AGE_BAND: "연령대를 다시 선택해 주세요.",
  SERVER_ERROR: "잠시 문제가 생겼어요. 다시 시도해 주세요.",
};

const SELECT =
  "min-h-[44px] w-full rounded-element border border-line bg-white px-3 text-[18px] outline-none focus:border-rose";

export default function VoteForm({
  slug,
  options,
  collectDistrict,
  collectAgeBand,
}: {
  slug: string;
  options: SurveyOption[];
  collectDistrict: boolean;
  collectAgeBand: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState("");
  const [district, setDistrict] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!picked || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/surveys/${slug}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          optionId: picked,
          district: district || undefined,
          ageBand: ageBand || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        code?: string;
      } | null;

      if (data?.ok) {
        // 서버에서 다시 그린다 — 결과와 '내 선택' 표시가 함께 갱신된다.
        router.refresh();
        return;
      }
      setError(MESSAGE[data?.code ?? ""] ?? MESSAGE.SERVER_ERROR);
    } catch {
      setError("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">보기 선택</legend>
        {options.map((o) => (
          <label
            key={o.id}
            className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-element border bg-white px-3.5 py-2.5 text-[19px] ${
              picked === o.id
                ? "border-rose bg-rose-soft font-bold"
                : "border-line"
            }`}
          >
            <input
              type="radio"
              name="option"
              value={o.id}
              checked={picked === o.id}
              onChange={() => setPicked(o.id)}
              className="h-5 w-5 flex-shrink-0 accent-rose-deep"
            />
            <span className="min-w-0">{o.label}</span>
          </label>
        ))}
      </fieldset>

      {(collectDistrict || collectAgeBand) && (
        <div className="flex flex-col gap-2 rounded-element border border-line bg-white p-3">
          <p className="text-[16px] text-muted">
            아래는 선택입니다. 답하지 않아도 참여할 수 있어요.
          </p>
          {collectDistrict && (
            <label className="flex flex-col gap-1">
              <span className="text-[17px] font-bold">거주 지구</span>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={SELECT}
              >
                <option value="">선택 안 함</option>
                {SURVEY_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          {collectAgeBand && (
            <label className="flex flex-col gap-1">
              <span className="text-[17px] font-bold">연령대</span>
              <select
                value={ageBand}
                onChange={(e) => setAgeBand(e.target.value)}
                className={SELECT}
              >
                <option value="">선택 안 함</option>
                {AGE_BANDS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!picked || busy}
        className="min-h-[52px] rounded-element bg-rose-deep text-[19px] font-bold text-white disabled:opacity-40"
      >
        {busy ? "참여 중…" : "참여하기"}
      </button>

      {/* 한 번 참여하면 바꿀 수 없다는 것을 누르기 전에 알린다. */}
      <p className="text-[16px] text-muted">
        한 계정당 한 번만 참여할 수 있고, 참여 후에는 바꿀 수 없어요.
      </p>

      {error && <p className="text-[17px] text-rose-deep">{error}</p>}
    </div>
  );
}
