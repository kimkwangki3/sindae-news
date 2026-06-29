"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveReporterArticle, type WriteState } from "@/lib/reporter-actions";
import { CATEGORY_NAME } from "@/lib/mock/articles-meta";
import ImageUpload from "@/components/ImageUpload";

const INITIAL: WriteState = {};
const INPUT =
  "min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose";
const CATS = Object.entries(CATEGORY_NAME) as [string, string][];

function Buttons({
  pledged,
  publishLabel,
}: {
  pledged: boolean;
  publishLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={pending}
        className="min-h-[52px] flex-1 rounded-element border border-line bg-white text-sm font-bold text-muted disabled:opacity-50"
      >
        임시저장
      </button>
      <button
        type="submit"
        name="intent"
        value="submit"
        disabled={pending || !pledged}
        className="min-h-[52px] flex-[2] rounded-element bg-rose-deep text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "처리 중…" : publishLabel}
      </button>
    </div>
  );
}

export default function ReporterWriteForm({
  publishLabel,
}: {
  publishLabel: string; // "발행"(정기자/관리자) 또는 "승인 요청"(준기자)
}) {
  const [state, action] = useFormState(saveReporterArticle, INITIAL);
  const [pledged, setPledged] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="제목">
        <input name="title" required placeholder="기사 제목" className={INPUT} />
      </Field>

      <Field label="분류">
        <select name="category" className={INPUT}>
          {CATS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>

      <Field label="슬러그(주소)">
        <input
          name="slug"
          required
          placeholder="예: sindae-festival-2026 (영문/숫자/-)"
          className={INPUT}
        />
      </Field>

      <Field label="본문">
        <textarea
          name="body"
          rows={12}
          placeholder="기사 본문을 입력하세요. 빈 줄로 문단을 구분합니다."
          className="w-full resize-y rounded-element border border-line bg-white p-3.5 text-sm leading-relaxed outline-none focus:border-rose"
        />
      </Field>

      <ImageUpload
        name="thumbnail_url"
        bucket="articles"
        label="대표 이미지(선택)"
        hint="목록·상세 상단에 표시됩니다. 6MB 이하 권장."
      />

      {/* 책임 서약 */}
      <label className="flex items-start gap-2.5 rounded-card border border-rose bg-rose-soft p-4 text-[13px] leading-relaxed">
        <input
          type="checkbox"
          name="pledge_ack"
          checked={pledged}
          onChange={(e) => setPledged(e.target.checked)}
          className="mt-0.5 h-auto w-auto"
        />
        <span>
          <b className="text-rose-deep">⚖ 기사 책임 서약</b>
          <br />본 기사의 모든 법적·윤리적 책임은 회사(DSBH)가 아닌 작성 기자
          본인에게 있음에 동의합니다. (제출 시 동의 시각이 기록됩니다)
        </span>
      </label>

      {state.error && <p className="text-xs text-rose-deep">{state.error}</p>}

      <Buttons pledged={pledged} publishLabel={publishLabel} />
      <p className="text-center text-[11px] text-muted">
        ‘임시저장’은 서약 없이 보관됩니다. 발행/승인요청은 서약 동의가 필요합니다.
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
