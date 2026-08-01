"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setNickname, type NicknameState } from "@/lib/auth-actions";
import { REGIONS } from "@/lib/region";

const INITIAL: NicknameState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 min-h-[52px] w-full rounded-element bg-rose-deep text-[18px] font-bold text-white disabled:opacity-50"
    >
      {pending ? "저장 중…" : "시작하기"}
    </button>
  );
}

export default function OnboardingForm({
  defaultNickname = "",
}: {
  defaultNickname?: string;
}) {
  const [state, action] = useFormState(setNickname, INITIAL);

  return (
    <form action={action} className="mt-7 flex flex-col">
      <label htmlFor="nickname" className="text-[16px] font-bold text-ink">
        닉네임 <span className="text-rose">*</span>
      </label>
      <input
        id="nickname"
        name="nickname"
        required
        minLength={2}
        maxLength={12}
        defaultValue={defaultNickname}
        autoComplete="off"
        placeholder="2~12자, 한글·영문·숫자"
        className="mt-2 min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
      />

      {/* 거주 지역은 필수 — 보급 대상 지역 파악과 동네 소식 전달의 기준이다.
          자유 입력이면 표기가 제각각이라 집계가 안 돼 선택지로 받는다. */}
      <fieldset className="mt-6">
        <legend className="text-[16px] font-bold text-ink">
          어디에 사시나요? <span className="text-rose">*</span>
        </legend>
        <p className="mt-1 text-[15px] leading-relaxed text-muted">
          우리 동네 소식을 골라 전해드리는 데 씁니다. 다른 이웃에게는 공개되지
          않습니다.
        </p>
        <div className="mt-2.5 flex flex-col gap-2">
          {REGIONS.map((r) => (
            <label
              key={r}
              className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-element border border-line bg-white px-4 text-sm has-[:checked]:border-rose has-[:checked]:bg-rose-soft has-[:checked]:font-bold"
            >
              <input
                type="radio"
                name="neighborhood"
                value={r}
                required
                className="h-[18px] w-[18px] accent-rose-deep"
              />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p className="mt-3 text-xs text-rose">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
