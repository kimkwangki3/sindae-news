"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitTip, type TipState } from "@/lib/community-actions";

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

      <Field label="사진 첨부 (선택)">
        <div className="flex h-24 items-center justify-center rounded-element border border-dashed border-line bg-white text-sm text-muted">
          📷 사진을 첨부하려면 눌러주세요 (후속 연동)
        </div>
      </Field>

      <Field label="연락처 (선택)">
        <input
          name="contact"
          placeholder="회신받을 휴대폰 또는 이메일"
          className="min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
        />
      </Field>

      {state.error && <p className="text-xs text-rose">{state.error}</p>}

      <SubmitButton />
      <p className="text-center text-[11px] text-muted">
        제보는 로그인 없이도 보낼 수 있어요.
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
