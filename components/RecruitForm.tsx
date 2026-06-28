"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  submitReporterApplication,
  type RecruitState,
} from "@/lib/recruit-actions";

const INITIAL: RecruitState = {};
const NEIGHBORHOODS = ["신대동", "중앙동", "덕암동", "기타"];
const INTERESTS = ["지역소식", "행정", "인물", "생활"];
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
      {pending ? "신청 중…" : "기자 신청 (승인 대기)"}
    </button>
  );
}

export default function RecruitForm() {
  const [state, action] = useFormState(submitReporterApplication, INITIAL);

  if (state.ok) {
    return (
      <div className="mt-8 rounded-card border border-line bg-white p-6 text-center">
        <p className="text-2xl">✍️</p>
        <p className="mt-2 text-sm font-bold text-rose-deep">
          기자 신청이 접수되었어요!
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          관리자 승인 후 기사 작성 권한이 부여됩니다.
          <br />
          결과는 알림으로 안내드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field label="이름">
        <input name="name" required placeholder="실명" className={INPUT} />
      </Field>
      <Field label="연락처">
        <input name="phone" placeholder="휴대폰 번호" className={INPUT} />
      </Field>
      <Field label="이메일">
        <input name="email" type="email" placeholder="email@" className={INPUT} />
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

      <fieldset>
        <legend className="mb-2 text-[13px] font-bold">관심 분야</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((it) => (
            <label
              key={it}
              className="min-h-[40px] cursor-pointer rounded-full border border-line bg-white px-3.5 text-sm leading-[38px] has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="interests"
                value={it}
                className="sr-only"
              />
              {it}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="지원 동기 / 활동 경험">
        <textarea
          name="motivation"
          rows={4}
          placeholder="간단히 적어주세요"
          className={`${INPUT} resize-y`}
        />
      </Field>

      {/* 책임 서약 (법적 증빙) */}
      <div className="rounded-card border border-rose-soft bg-rose-soft/50 p-4">
        <h4 className="text-[13px] font-bold text-rose-deep">
          ⚖ 기자 책임 서약 (필수)
        </h4>
        <div className="mt-2 flex flex-col gap-2 text-[12px] leading-relaxed text-ink">
          <p>
            본인은 작성·게재하는 모든 기사에 대해{" "}
            <b>법적·윤리적 책임이 작성 기자 본인에게 있음</b>을 인지합니다.
          </p>
          <p>
            명예훼손, 허위사실 유포, 저작권·개인정보 침해 등으로 발생하는{" "}
            <b>민·형사상 모든 책임은 작성 기자가 부담</b>하며, 신대신문(운영사
            DSBH)은 이에 대한 책임을 지지 않습니다.
          </p>
          <p>취재·보도 시 언론윤리강령과 관련 법령을 준수할 것을 서약합니다.</p>
        </div>
        <label className="mt-3 flex items-start gap-2 text-[13px] font-bold">
          <input
            type="checkbox"
            name="pledge"
            className="mt-0.5 h-auto w-auto"
          />
          위 내용을 모두 읽고 동의하며 서약합니다
        </label>
      </div>

      <Field label="서명 (성명 입력)">
        <input
          name="signed_name"
          required
          placeholder="서약자 성명 (이름과 동일하게)"
          className={INPUT}
        />
      </Field>

      {state.error && <p className="text-xs text-rose">{state.error}</p>}

      <SubmitButton />
      <p className="text-center text-[11px] text-muted">
        관리자 승인 후 기사 작성 권한이 부여됩니다.
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
