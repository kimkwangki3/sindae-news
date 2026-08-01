"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitTip, type TipState } from "@/lib/community-actions";
import { TIP_DAILY_LIMIT } from "@/lib/tips";
import ImageUpload from "@/components/ImageUpload";

const INITIAL: TipState = {};
const CATEGORIES = ["지역소식", "행정", "인물", "생활", "기타"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 min-h-[52px] rounded-element bg-rose-deep text-sm font-bold text-white disabled:opacity-50"
    >
      {pending ? "보내는 중…" : "제보 보내기"}
    </button>
  );
}

export default function TipForm() {
  const [state, action] = useFormState(submitTip, INITIAL);

  if (state.ok) {
    return (
      <div className="mt-8 rounded-card border border-line bg-white p-6 text-center">
        <p className="text-2xl">📮</p>
        <p className="mt-2 text-sm font-bold text-rose-deep">
          제보가 접수되었어요!
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          소중한 제보 감사합니다. 확인 후 기사에 반영하거나
          <br />
          남겨주신 연락처로 회신드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field label="제목">
        <input
          name="title"
          required
          placeholder="예) 우리 동네 이런 일이 있어요"
          className="min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
        />
      </Field>

      <Field label="분류">
        <select
          name="category"
          className="min-h-[48px] w-full rounded-element border border-line bg-white px-3 text-sm outline-none focus:border-rose"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="내용">
        <textarea
          name="body"
          rows={6}
          placeholder="언제·어디서·무슨 일인지 적어주세요"
          className="w-full resize-y rounded-element border border-line bg-white p-3.5 text-sm leading-relaxed outline-none focus:border-rose"
        />
      </Field>

      <ImageUpload
        name="photo_urls"
        bucket="board"
        label="사진 첨부 (선택, 최대 3장)"
        max={3}
      />

      {/* 사실관계를 되물으려면 연락이 닿아야 한다. 확인 못 한 제보는 기사가
          되지 못하므로 필수로 받는다. */}
      <Field label="연락처">
        <input
          name="contact"
          required
          placeholder="회신받을 휴대폰 또는 이메일"
          className="min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
        />
      </Field>

      {state.error && <p className="text-xs text-rose">{state.error}</p>}

      <SubmitButton />
      {/* 제보 내용을 기사에 쓸 수 있다는 사실은 약관에만 묻어두지 않고
          보내는 자리에서 알린다. */}
      <p className="text-center text-[14px] leading-relaxed text-muted">
        확인을 위해 편집국에서 연락드릴 수 있습니다. 제보는 하루 {TIP_DAILY_LIMIT}
        건까지 보내실 수 있어요.
        <br />
        보내주신 내용과 사진은 기사에 쓰일 수 있습니다. 이름을 밝히길 원하지
        않으시면 내용에 적어 주세요.
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
      <label className="text-[16px] font-bold">{label}</label>
      {children}
    </div>
  );
}
