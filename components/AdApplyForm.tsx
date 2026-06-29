"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitAdRequest, type AdRequestState } from "@/lib/ads-actions";
import ImageUpload from "@/components/ImageUpload";

const INITIAL: AdRequestState = {};
const POSITIONS = [
  "홈 상단 배너",
  "홈 중간 배너",
  "기사 상단 배너",
  "기사 중간 배너",
  "상권 상단 배너",
  "나눔마켓 인피드",
  "사이드 배너 (PC)",
];
const PERIODS = ["1주", "1개월", "3개월"];
const INPUT =
  "min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 min-h-[52px] rounded-element bg-rose-deep text-sm font-bold text-white disabled:opacity-50"
    >
      {pending ? "신청 중…" : "광고 신청하기"}
    </button>
  );
}

export default function AdApplyForm() {
  const [state, action] = useFormState(submitAdRequest, INITIAL);

  if (state.ok) {
    return (
      <div className="mt-8 rounded-card border border-line bg-white p-6 text-center">
        <p className="text-2xl">🖼</p>
        <p className="mt-2 text-sm font-bold text-rose-deep">
          광고 신청이 접수되었어요!
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          관리자 확인·승인을 거쳐 게재됩니다.
          <br />
          남겨주신 연락처로 안내드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field label="광고 위치">
        <select name="position" className={INPUT}>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <Field label="업체명 / 광고주">
        <input name="advertiser" required placeholder="예) 봄날카페" className={INPUT} />
      </Field>
      <ImageUpload
        name="image_url"
        bucket="ads"
        label="배너 이미지(선택)"
        hint="권장 1200×300. 없으면 업체명 텍스트 배너로 노출됩니다."
      />
      <Field label="연결 링크">
        <input name="link" placeholder="https://" className={INPUT} />
      </Field>

      <fieldset>
        <legend className="mb-2 text-[13px] font-bold">희망 게재 기간</legend>
        <div className="flex gap-2">
          {PERIODS.map((p, idx) => (
            <label
              key={p}
              className="min-h-[40px] flex-1 cursor-pointer rounded-element border border-line bg-white text-center text-sm leading-[40px] has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="period"
                value={p}
                defaultChecked={idx === 0}
                className="sr-only"
              />
              {p}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="연락처">
        <input name="contact" required placeholder="회신받을 연락처" className={INPUT} />
      </Field>

      {state.error && <p className="text-xs text-rose">{state.error}</p>}

      <SubmitButton />
      <p className="text-center text-[11px] text-muted">
        신청 후 관리자 확인·승인을 거쳐 게재됩니다.
      </p>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold">{label}</label>
      {children}
    </div>
  );
}
