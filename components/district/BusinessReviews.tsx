"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  saveBusinessReview,
  deleteBusinessReview,
  type ReviewState,
} from "@/lib/local-actions";
import type { BizReview } from "@/lib/mock/district";

const INITIAL: ReviewState = {};

// 별점 표시 — 채워진 별 n개 + 빈 별
function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`text-rose ${className}`} aria-label={`별점 ${value}점`}>
      {"★".repeat(Math.round(value))}
      <span className="text-line">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[48px] rounded-element bg-rose-deep px-4 text-sm font-bold text-white disabled:opacity-50"
    >
      {pending ? "저장 중…" : editing ? "리뷰 수정" : "리뷰 남기기"}
    </button>
  );
}

export default function BusinessReviews({
  businessId,
  reviews,
  mine,
  loggedIn,
}: {
  businessId: string;
  reviews: BizReview[];
  mine: BizReview | null;
  loggedIn: boolean;
}) {
  const action = saveBusinessReview.bind(null, businessId);
  const [state, formAction] = useFormState(action, INITIAL);

  const count = reviews.length;
  const average =
    count === 0
      ? 0
      : Math.round(
          (reviews.reduce((a, r) => a + r.rating, 0) / count) * 10,
        ) / 10;

  return (
    <section className="mt-6">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[16px] font-bold">리뷰</h2>
        {count > 0 && (
          <span className="text-[13px] text-muted">
            <Stars value={average} /> {average.toFixed(1)} · {count}개
          </span>
        )}
      </div>

      {/* 작성 폼 — 비로그인은 로그인 유도 */}
      {loggedIn ? (
        <form
          action={formAction}
          className="mt-3 rounded-card border border-line bg-white p-4"
        >
          <p className="text-[13px] font-bold">
            {mine ? "내 리뷰 수정" : "이 가게 어떠셨나요?"}
          </p>

          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="flex min-h-[44px] w-11 cursor-pointer items-center justify-center rounded-element border border-line text-lg has-[:checked]:border-rose has-[:checked]:bg-rose-soft"
              >
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  defaultChecked={(mine?.rating ?? 0) === n}
                  className="sr-only"
                />
                <span className="text-rose">{n}</span>
              </label>
            ))}
          </div>

          <textarea
            name="body"
            rows={3}
            defaultValue={mine?.body ?? ""}
            placeholder="다녀온 경험을 적어주세요 (선택)"
            className="mt-2 w-full resize-y rounded-element border border-line bg-white p-3 text-sm leading-relaxed outline-none focus:border-rose"
          />

          {state.error && (
            <p className="mt-1.5 text-xs text-rose">{state.error}</p>
          )}
          {state.ok && (
            <p className="mt-1.5 text-xs text-rose-deep">저장되었습니다.</p>
          )}

          <div className="mt-2 flex justify-end">
            <SubmitButton editing={Boolean(mine)} />
          </div>
        </form>
      ) : (
        <div className="mt-3 rounded-card border border-line bg-white p-4 text-center text-[13px] text-muted">
          <Link href="/login" className="font-bold text-rose-deep underline">
            로그인
          </Link>
          하시면 리뷰를 남길 수 있어요
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-2.5">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold">{r.author}</span>
              <span className="text-[11px] text-muted">{r.createdAt}</span>
            </div>
            <p className="mt-1 text-[13px]">
              <Stars value={r.rating} /> {r.rating}
            </p>
            {r.body && (
              <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed">
                {r.body}
              </p>
            )}
            {r.mine && (
              <form
                action={deleteBusinessReview.bind(null, businessId, r.id)}
                className="mt-2 flex justify-end"
              >
                <button
                  type="submit"
                  className="min-h-[36px] rounded-element border border-line px-3 text-xs text-muted"
                >
                  삭제
                </button>
              </form>
            )}
          </li>
        ))}
        {count === 0 && (
          <li className="py-6 text-center text-[13px] text-muted">
            아직 리뷰가 없습니다. 첫 리뷰를 남겨보세요.
          </li>
        )}
      </ul>
    </section>
  );
}
