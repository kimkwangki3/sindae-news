"use client";

import { useMemo, useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import { saveFrontPage } from "@/lib/frontpage-actions";
import {
  pickFrontPage,
  shortTitleAfterTopChange,
  SLOT_DAYS,
  SUB_SLOTS,
  type FrontSlot,
} from "@/lib/frontpage";
import type { FrontArticle } from "@/lib/frontpage-data";

const SLOT_BTN = "min-h-[44px] min-w-[52px] border px-2.5 text-[16px]";

// 헤드라인 편성판. 고르면 오른쪽 미리보기가 바로 바뀌고, 저장해야 반영된다.
export default function FrontPageEditor({
  articles,
  slots,
}: {
  articles: FrontArticle[];
  slots: FrontSlot<FrontArticle>[];
}) {
  const [now] = useState(() => Date.now());
  const initial = useMemo(() => {
    const live = (s: FrontSlot<FrontArticle> | undefined) =>
      s?.article &&
      (s.pinned || !s.expiresAt || new Date(s.expiresAt).getTime() > now)
        ? s
        : undefined;
    const top = live(slots.find((s) => s.slot === "top"));
    return {
      top: top?.article?.id ?? null,
      subs: SUB_SLOTS.flatMap((key) => {
        const id = live(slots.find((s) => s.slot === key))?.article?.id;
        return id ? [id] : [];
      }),
      shortTitle: top?.shortTitle ?? "",
      pinned: slots.some((s) => s.pinned),
    };
  }, [slots, now]);

  const [top, setTop] = useState<string | null>(initial.top);
  const [subs, setSubs] = useState<string[]>(initial.subs);
  const [shortTitle, setShortTitle] = useState(initial.shortTitle);
  const [pinned, setPinned] = useState(initial.pinned);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = (id: string) => articles.find((a) => a.id === id) ?? null;

  const preview = useMemo(() => {
    const draft: FrontSlot<FrontArticle>[] = [
      ...(top
        ? [
            {
              slot: "top" as const,
              article: byId(top),
              shortTitle,
              pinned: true,
              expiresAt: null,
            },
          ]
        : []),
      ...subs.map((id, i) => ({
        slot: SUB_SLOTS[i],
        article: byId(id),
        shortTitle: null,
        pinned: true,
        expiresAt: null,
      })),
    ];
    return pickFrontPage(draft, articles, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top, subs, shortTitle, articles, now]);

  function chooseTop(id: string) {
    setMessage(null);
    setSubs((s) => s.filter((x) => x !== id));
    const next = top === id ? null : id;
    setShortTitle((v) => shortTitleAfterTopChange(top, next, v));
    setTop(next);
  }

  function chooseSub(id: string) {
    setMessage(null);
    if (top === id) {
      setTop(null);
      setShortTitle("");
    }
    setSubs((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : [...s, id].slice(-SUB_SLOTS.length),
    );
  }

  function save() {
    startTransition(async () => {
      const res = await saveFrontPage({ top, subs, shortTitle, pinned });
      setMessage(res.ok ? "첫 화면에 반영했습니다." : (res.reason ?? "저장하지 못했습니다."));
    });
  }

  function clear() {
    setTop(null);
    setSubs([]);
    setShortTitle("");
    setPinned(false);
    setMessage(null);
  }

  const leadPhotoMissing = preview.lead && !preview.lead.thumbnailUrl;

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="헤드라인 편성"
        sub={`톱 1건과 서브 3건을 고릅니다. 고르지 않은 칸은 최신 기사로 채웁니다.`}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ul className="overflow-hidden rounded-card border border-line bg-white">
          {articles.map((a) => {
            const isTop = top === a.id;
            const isSub = subs.includes(a.id);
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 border-t border-line px-4 py-2.5 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[17px] font-bold leading-snug">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-[15px] text-muted">
                    {a.meta}
                    {!a.thumbnailUrl && " · 사진 없음"}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    type="button"
                    aria-pressed={isTop}
                    onClick={() => chooseTop(a.id)}
                    className={`${SLOT_BTN} ${
                      isTop
                        ? "border-rose-deep bg-rose-deep text-white"
                        : "border-line bg-white"
                    }`}
                  >
                    톱
                  </button>
                  <button
                    type="button"
                    aria-pressed={isSub}
                    onClick={() => chooseSub(a.id)}
                    className={`${SLOT_BTN} ${
                      isSub
                        ? "border-rose-deep bg-rose-deep text-white"
                        : "border-line bg-white"
                    }`}
                  >
                    서브
                  </button>
                </div>
              </li>
            );
          })}
          {articles.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">
              발행된 기사가 없습니다
            </li>
          )}
        </ul>

        <div className="flex flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
          <h2 className="text-[18px] font-bold">첫 화면 미리보기</h2>
          {preview.lead && (
            <div className="rounded-element border-2 border-rose-deep bg-white p-3">
              <p className="flex items-center gap-2 text-[15px] font-bold text-rose-deep">
                톱 {!top && <Pill tone="muted">자동</Pill>}
              </p>
              <p className="mt-1 font-display text-[20px] font-bold leading-snug">
                {preview.leadTitle ?? preview.lead.title}
              </p>
              {preview.leadTitle && (
                <p className="mt-1 text-[15px] text-muted">
                  기사 제목: {preview.lead.title}
                </p>
              )}
            </div>
          )}
          {leadPhotoMissing && (
            <p className="text-[15px] text-body-red">
              톱 기사에 사진이 없어 제목만 크게 나옵니다.
            </p>
          )}
          {preview.subs.map((a, i) => (
            <div key={a.id} className="rounded-element border border-line bg-white p-3">
              <p className="flex items-center gap-2 text-[15px] font-bold text-muted">
                서브 {i + 1} {!subs.includes(a.id) && <Pill tone="muted">자동</Pill>}
              </p>
              <p className="mt-1 text-[17px] leading-snug">{a.title}</p>
            </div>
          ))}

          <label htmlFor="front-short" className="mt-2 text-[16px]">
            톱 전용 짧은 제목 (비우면 기사 제목)
          </label>
          <p className="text-[15px] leading-snug text-muted">
            기사 제목을 줄이는 데만 씁니다. 새로운 사실이나 평가를 넣지 마세요.
          </p>
          <input
            id="front-short"
            value={shortTitle}
            maxLength={80}
            onChange={(e) => setShortTitle(e.target.value)}
            className="min-h-[44px] rounded-element border border-line bg-white px-3 text-[17px] outline-none focus:border-rose"
          />
          <label className="flex min-h-[44px] items-center gap-2 text-[16px]">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-5 w-5"
            />
            계속 고정 (끄면 {SLOT_DAYS}일 뒤 자동으로 내려갑니다)
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="min-h-[44px] flex-1 rounded-element bg-rose-deep px-3 text-[17px] font-bold text-white disabled:opacity-50"
            >
              {pending ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              onClick={clear}
              className="min-h-[44px] rounded-element border border-line bg-white px-3 text-[16px]"
            >
              전부 자동
            </button>
          </div>
          {message && (
            <p role="status" className="text-[16px] text-ink">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
