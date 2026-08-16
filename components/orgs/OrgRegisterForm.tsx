"use client";

import { useFormState, useFormStatus } from "react-dom";
import ImageUpload from "@/components/ImageUpload";
import { registerOrg, type OrgRegisterState } from "@/lib/local-actions";

// 단체 등록 폼.
//
// 클라이언트 컴포넌트인 이유는 오류를 화면에 띄우기 위해서다. 서버 액션이
// 던진 오류 메시지는 운영 환경에서 지워지므로(Next가 스키마 노출을 막는다),
// "이미 등록된 이름입니다" 같은 안내가 주민에게 닿으려면 상태로 받아야 한다.
//
// 분류 목록은 서버에서 받아 온다. lib/mock/orgs 를 여기서 import 하면 그 파일이
// 끌고 오는 서버 전용 모듈(next/headers)까지 브라우저 번들에 딸려와 빌드가 깨진다.

const INITIAL: OrgRegisterState = {};
const THIS_YEAR = new Date().getFullYear();
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
      {pending ? "등록 중…" : "등록 신청 (승인 대기)"}
    </button>
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
      <label className="text-[18px] font-bold">{label}</label>
      {children}
    </div>
  );
}

export default function OrgRegisterForm({
  cats,
}: {
  cats: [string, string][];
}) {
  const [state, action] = useFormState(registerOrg, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="단체명">
        <input
          name="name"
          required
          placeholder="예) 해룡면 주민자치회"
          className={INPUT}
        />
        <span className="text-[16px] text-muted">
          이미 등록된 단체와 같은 이름은 등록할 수 없어요. 우리 단체가 이미
          있다면 그 페이지에서 가입을 신청하세요.
        </span>
      </Field>
      <Field label="분류">
        <select name="category" className={INPUT}>
          {cats.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="대표자 / 직책">
        <input name="leader" placeholder="예) 홍길동 회장" className={INPUT} />
      </Field>
      <Field label="설립 연도 (선택)">
        {/* 등록일이 아니라 단체가 시작된 해다. 20년 된 자치회가 올해 생긴
            모임처럼 보이지 않게 하려고 따로 받는다. 모르면 비워 두면 되고,
            비워 두면 화면에 연도를 아예 적지 않는다. */}
        <input
          name="founded_year"
          type="number"
          inputMode="numeric"
          min={1900}
          max={THIS_YEAR}
          placeholder={`예) 2015 — 모르면 비워 두세요`}
          className={INPUT}
        />
      </Field>
      <Field label="활동지역">
        <input
          name="region"
          placeholder="예) 순천시 신대지구"
          className={INPUT}
        />
      </Field>
      <Field label="문의 연락처">
        <input name="contact" placeholder="전화번호" className={INPUT} />
      </Field>
      <Field label="카카오톡 채널 (1:1 문의용·선택)">
        <input
          name="kakao_channel"
          placeholder="http://pf.kakao.com/_xxxxx"
          className={INPUT}
        />
      </Field>
      <Field label="가입 신청 받기">
        <label className="flex items-center gap-2 text-[18px] text-muted">
          <input
            type="checkbox"
            name="accept_join"
            defaultChecked
            className="h-auto w-auto"
          />
          홈페이지에서 회원 가입 신청을 받습니다
        </label>
      </Field>
      <ImageUpload
        name="photos"
        bucket="org"
        label="대표 이미지 / 활동 사진 (최대 5장)"
        max={5}
      />
      <Field label="단체 소개">
        <textarea
          name="intro"
          rows={4}
          placeholder="단체 활동·목적 소개"
          className={`${INPUT} resize-y`}
        />
      </Field>

      {state.error && (
        <p
          aria-live="polite"
          className="rounded-element border border-rose bg-rose-soft px-3.5 py-3 text-[18px] leading-relaxed text-rose-deep"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
