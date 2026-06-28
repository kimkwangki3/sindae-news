"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setNickname, type NicknameState } from "@/lib/auth-actions";

const INITIAL: NicknameState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 min-h-[52px] w-full rounded-element bg-rose-deep text-[15px] font-bold text-white disabled:opacity-50"
    >
      {pending ? "저장 중…" : "시작하기"}
    </button>
  );
}

export default function OnboardingForm() {
  const [state, action] = useFormState(setNickname, INITIAL);

  return (
    <form action={action} className="mt-7 flex flex-col">
      <label htmlFor="nickname" className="text-[13px] font-bold text-ink">
        닉네임 <span className="text-rose">*</span>
      </label>
      <input
        id="nickname"
        name="nickname"
        required
        minLength={2}
        maxLength={12}
        autoComplete="off"
        placeholder="2~12자, 한글·영문·숫자"
        className="mt-2 min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
      />

      <label
        htmlFor="neighborhood"
        className="mt-5 text-[13px] font-bold text-ink"
      >
        동네 <span className="text-[11px] font-normal text-muted">(선택)</span>
      </label>
      <input
        id="neighborhood"
        name="neighborhood"
        maxLength={20}
        autoComplete="off"
        placeholder="예: 신대동"
        className="mt-2 min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
      />

      {state.error && (
        <p className="mt-3 text-xs text-rose">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
