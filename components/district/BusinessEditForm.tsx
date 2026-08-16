"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import ImageUpload from "@/components/ImageUpload";
import { updateBusiness, type BizEditState } from "@/lib/local-actions";
import type { BusinessEditable } from "@/lib/mock/district";

// 업체 정보 수정 — 등록한 사장님 전용.
//
// 업체명은 입력칸을 두지 않는다. 신문이 확인해 실어 준 것은 '그 이름의 그
// 가게'라, 상호를 바꿔 달 수 있게 하면 목록 전체를 믿을 이유가 없어진다.
// 상호가 실제로 바뀌었다면 신문에 알려 고치는 편이 맞다.

const INITIAL: BizEditState = {};
const DAYS = ["월", "화", "수", "목", "금", "토", "일", "연중무휴"];
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

export default function BusinessEditForm({
  biz,
  cats,
}: {
  biz: BusinessEditable;
  cats: [string, string][];
}) {
  const [state, action] = useFormState(
    updateBusiness.bind(null, biz.id),
    INITIAL,
  );
  // 24시간을 켜면 여닫는 시각 칸을 감춘다. 남겨두면 "24시간 영업
  // 09:00~21:00" 처럼 말이 안 되는 줄을 저장하게 된다.
  const [is24h, setIs24h] = useState(biz.is24h);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="rounded-element border border-line bg-ivory-2 px-3.5 py-3">
        <p className="text-[16px] text-muted">업체명</p>
        <p className="mt-0.5 text-[19px] font-bold">{biz.name}</p>
        <p className="mt-1.5 text-[16px] leading-relaxed text-muted">
          업체명은 바꿀 수 없습니다. 해룡신문이 확인해 실어 드린 것이 이 이름의
          가게이기 때문입니다. 상호가 바뀌었다면 알려 주세요.
        </p>
      </div>

      <Field label="업종">
        <select name="category" defaultValue={biz.category} className={INPUT}>
          {cats.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="주소">
        <input
          name="address"
          defaultValue={biz.address}
          placeholder="순천시 해룡면 신대지구 …"
          className={INPUT}
        />
      </Field>
      <Field label="전화번호">
        <input
          name="phone"
          defaultValue={biz.phone}
          placeholder="061-…"
          className={INPUT}
        />
      </Field>
      <Field label="카카오톡 채널 (1:1 문의용·선택)">
        <input
          name="kakao_channel"
          defaultValue={biz.kakaoChannel}
          placeholder="http://pf.kakao.com/_xxxxx"
          className={INPUT}
        />
      </Field>

      <Field label="영업시간">
        <label className="flex items-center gap-2 text-[18px] text-muted">
          <input
            type="checkbox"
            name="is_24h"
            checked={is24h}
            onChange={(e) => setIs24h(e.target.checked)}
            className="h-auto w-auto"
          />
          24시간 영업
        </label>
        {!is24h && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="time"
              name="hours_open"
              defaultValue={biz.hoursOpen || "09:00"}
              className={INPUT}
            />
            <span className="text-muted">~</span>
            <input
              type="time"
              name="hours_close"
              defaultValue={biz.hoursClose || "21:00"}
              className={INPUT}
            />
          </div>
        )}
      </Field>

      <Field label="휴무일">
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <label
              key={d}
              className="flex min-h-[44px] items-center gap-1.5 rounded-element border border-line bg-white px-3 text-[18px]"
            >
              <input
                type="checkbox"
                name="closed_days"
                value={d}
                defaultChecked={biz.closedDays.includes(d)}
                className="h-auto w-auto"
              />
              {d}
            </label>
          ))}
        </div>
      </Field>

      <ImageUpload
        name="photos"
        bucket="business"
        label="대표 이미지 / 매장 사진 (최대 5장)"
        max={5}
        defaultUrls={biz.photos}
        hint="맨 앞 사진이 업체 대표 사진이 됩니다."
      />

      <Field label="업체 소개">
        <textarea
          name="intro"
          rows={6}
          defaultValue={biz.intro}
          placeholder="간단한 소개"
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
          <Link href={`/district/${biz.id}`} className="underline">
            업체 페이지에서 확인하기 ›
          </Link>
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
