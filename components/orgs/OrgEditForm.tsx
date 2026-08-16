"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import ImageUpload from "@/components/ImageUpload";
import { updateOrg, type OrgEditState } from "@/lib/local-actions";

// 단체 소개 수정 — 운영진 전용.
//
// 단체명은 아예 입력칸을 두지 않는다. 잠겼다는 사실을 안내로만 적어두면
// "왜 안 바뀌지" 하고 여러 번 시도하게 된다. 바꿀 수 없는 것은 바꿀 자리를
// 만들지 않는 편이 친절하다.
//
// 분류 목록은 서버에서 받는다. lib/mock/orgs 를 여기서 import 하면 그 파일이
// 끌고 오는 서버 전용 모듈까지 브라우저 번들에 딸려와 빌드가 깨진다.

const INITIAL: OrgEditState = {};
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
      {pending ? "저장 중…" : "저장하기"}
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

export default function OrgEditForm({
  orgId,
  orgName,
  cats,
  initial,
}: {
  orgId: string;
  orgName: string;
  cats: [string, string][];
  initial: {
    category: string;
    leader: string;
    region: string;
    contact: string;
    kakaoChannel: string | null;
    acceptJoin: boolean;
    intro: string;
    photos: string[];
  };
}) {
  const [state, action] = useFormState(updateOrg.bind(null, orgId), INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="rounded-element border border-line bg-ivory-2 px-3.5 py-3">
        <p className="text-[16px] text-muted">단체명</p>
        <p className="mt-0.5 text-[19px] font-bold">{orgName}</p>
        <p className="mt-1.5 text-[16px] leading-relaxed text-muted">
          단체명은 바꿀 수 없습니다. 주민이 가입해 둔 단체의 이름이 달라지면
          어느 단체였는지 알 수 없게 되기 때문입니다. 오타가 있다면 해룡신문에
          알려 주세요.
        </p>
      </div>

      <Field label="분류">
        <select name="category" defaultValue={initial.category} className={INPUT}>
          {cats.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="대표자 / 직책">
        <input
          name="leader"
          defaultValue={initial.leader}
          placeholder="예) 홍길동 회장"
          className={INPUT}
        />
      </Field>
      <Field label="활동지역">
        <input
          name="region"
          defaultValue={initial.region}
          placeholder="예) 순천시 신대지구"
          className={INPUT}
        />
      </Field>
      <Field label="문의 연락처">
        <input
          name="contact"
          defaultValue={initial.contact}
          placeholder="전화번호"
          className={INPUT}
        />
      </Field>
      <Field label="카카오톡 채널 (1:1 문의용·선택)">
        <input
          name="kakao_channel"
          defaultValue={initial.kakaoChannel ?? ""}
          placeholder="http://pf.kakao.com/_xxxxx"
          className={INPUT}
        />
      </Field>
      <Field label="가입 신청 받기">
        <label className="flex items-center gap-2 text-[18px] text-muted">
          <input
            type="checkbox"
            name="accept_join"
            defaultChecked={initial.acceptJoin}
            className="h-auto w-auto"
          />
          홈페이지에서 회원 가입 신청을 받습니다
        </label>
      </Field>

      {/* 이미 올린 사진을 미리 채워 준다. 여기서 지운 사진은 저장할 때 함께
          사라지고, 남긴 순서가 그대로 단체 페이지의 순서가 된다. */}
      <ImageUpload
        name="photos"
        bucket="org"
        label="대표 이미지 / 활동 사진 (최대 5장)"
        max={5}
        defaultUrls={initial.photos}
        hint="맨 앞 사진이 단체 페이지 대표 사진이 됩니다."
      />

      <Field label="단체 소개">
        <textarea
          name="intro"
          rows={6}
          defaultValue={initial.intro}
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
      {state.ok && (
        <p
          aria-live="polite"
          className="rounded-element border border-line bg-white px-3.5 py-3 text-[18px] text-rose-deep"
        >
          저장했습니다.{" "}
          <Link href={`/orgs/${orgId}`} className="underline">
            단체 페이지에서 확인하기 ›
          </Link>
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
