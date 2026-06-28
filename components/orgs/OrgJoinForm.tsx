"use client";

import { useFormState, useFormStatus } from "react-dom";
import { joinOrg, type JoinState } from "@/lib/local-actions";

const INITIAL: JoinState = {};
const NEIGHBORHOODS = ["신대동", "중앙동", "덕암동", "기타"];
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
      {pending ? "신청 중…" : "가입 신청하기"}
    </button>
  );
}

export default function OrgJoinForm({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  // orgId를 선주입한 액션을 useFormState에 연결
  const [state, action] = useFormState(joinOrg.bind(null, orgId), INITIAL);

  if (state.ok) {
    return (
      <div className="mt-8 rounded-card border border-line bg-white p-6 text-center">
        <p className="text-2xl">✋</p>
        <p className="mt-2 text-sm font-bold text-rose-deep">
          가입 신청이 접수되었어요!
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          <b>{orgName}</b> 운영진의 승인 후 회원이 됩니다.
          <br />
          결과는 알림으로 안내드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="rounded-element border border-tag-org-bg bg-tag-org-bg/40 p-3 text-[13px] text-tag-org-fg">
        <b>{orgName}</b> 가입을 신청합니다.
        <br />
        단체 운영진 승인 후 회원이 됩니다.
      </div>

      <Field label="이름">
        <input name="name" required placeholder="실명" className={INPUT} />
      </Field>
      <Field label="연락처">
        <input name="phone" placeholder="휴대폰 번호" className={INPUT} />
      </Field>
      <Field label="거주 동네">
        <select name="neighborhood" className={INPUT}>
          {NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <Field label="가입 동기 (선택)">
        <textarea
          name="motivation"
          rows={3}
          placeholder="간단히 적어주세요"
          className={`${INPUT} resize-y`}
        />
      </Field>

      <label className="flex items-center gap-2 text-[13px] text-muted">
        <input type="checkbox" name="agree" className="h-auto w-auto" />
        개인정보를 단체 운영진에게 제공하는 데 동의합니다
      </label>

      {state.error && <p className="text-xs text-rose">{state.error}</p>}

      <SubmitButton />
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
