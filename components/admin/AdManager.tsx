"use client";

import { useState, useTransition } from "react";
import { PageHead, Pill } from "@/components/admin/ui";
import ImageUpload from "@/components/ImageUpload";
import {
  setAdRequestStatus,
  createAd,
  toggleAd,
  deleteAd,
} from "@/lib/admin-actions";
import type {
  AdRequestRow,
  AdRow,
  AdSlotOption,
} from "@/lib/mock/admin-types";

// 광고 관리 — ① 신청 검토(승인/보류) ② 배너 게재(등록·활성토글·삭제)
export default function AdManager({
  requests,
  ads,
  slots,
}: {
  requests: AdRequestRow[];
  ads: AdRow[];
  slots: AdSlotOption[];
}) {
  const [reqs, setReqs] = useState(requests);
  const [adList, setAdList] = useState(ads);
  const [, startTransition] = useTransition();

  const pending = reqs.filter((r) => r.status === "pending").length;

  function decide(id: string, status: "resolved" | "ignored") {
    setReqs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    startTransition(() => setAdRequestStatus(id, status));
  }

  function toggle(id: string, next: boolean) {
    setAdList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: next } : a)),
    );
    startTransition(() => toggleAd(id, next));
  }

  function remove(id: string) {
    if (!confirm("이 배너를 삭제할까요?")) return;
    setAdList((prev) => prev.filter((a) => a.id !== id));
    startTransition(() => deleteAd(id));
  }

  return (
    <div className="px-[18px] py-5">
      <PageHead title="광고 관리" sub={`신청 미처리 ${pending}건`} />

      {/* ① 광고 신청 */}
      <h2 className="mb-2 text-sm font-bold text-rose-deep">광고 신청</h2>
      <ul className="mb-8 flex flex-col gap-2.5">
        {reqs.map((r) => (
          <li
            key={r.id}
            className="rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">{r.advertiser}</span>
              {r.status === "pending" ? (
                <Pill tone="warn">미처리</Pill>
              ) : r.status === "resolved" ? (
                <Pill tone="ok">승인</Pill>
              ) : (
                <Pill tone="muted">보류</Pill>
              )}
            </div>
            <p className="mt-1.5 text-[12px] text-muted">
              {r.slotLabel} · 기간 {r.duration} · 연락처 {r.contact}
            </p>
            {r.linkUrl && (
              <p className="mt-0.5 truncate text-[11px] text-muted">
                링크: {r.linkUrl}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-muted">{r.createdAt}</p>
            {r.status === "pending" && (
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => decide(r.id, "ignored")}
                  className="min-h-[40px] rounded-element border border-line px-3 text-xs"
                >
                  보류
                </button>
                <button
                  type="button"
                  onClick={() => decide(r.id, "resolved")}
                  className="min-h-[40px] rounded-element bg-rose-deep px-4 text-xs font-bold text-white"
                >
                  승인 처리
                </button>
              </div>
            )}
          </li>
        ))}
        {reqs.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            아직 광고 신청이 없습니다
          </li>
        )}
      </ul>

      {/* ② 배너 게재 등록 */}
      <h2 className="mb-2 text-sm font-bold text-rose-deep">배너 게재</h2>
      <form
        action={createAd}
        className="mb-4 flex flex-col gap-2 rounded-card border border-line bg-white p-4"
      >
        <select
          name="slot_id"
          required
          className="min-h-[44px] rounded-element border border-line px-3 text-sm"
        >
          <option value="">게재 위치(슬롯) 선택</option>
          {slots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          name="advertiser"
          required
          placeholder="광고주명 (예: 봄날카페)"
          className="min-h-[44px] rounded-element border border-line px-3 text-sm"
        />
        <input
          name="link_url"
          placeholder="연결 링크 (https:// 또는 /district/..)"
          className="min-h-[44px] rounded-element border border-line px-3 text-sm"
        />
        <ImageUpload
          name="image_url"
          bucket="ads"
          label="배너 이미지(선택)"
          hint="권장 가로형. 없으면 광고주명 텍스트 배너로 표시됩니다."
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked />
          바로 게재(활성)
        </label>
        <button
          type="submit"
          className="min-h-[44px] self-end rounded-element bg-rose-deep px-4 text-xs font-bold text-white"
        >
          배너 등록
        </button>
      </form>

      <ul className="flex flex-col gap-2.5">
        {adList.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-card border border-line bg-white p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold">{a.advertiser}</span>
                {a.isActive ? (
                  <Pill tone="ok">게재중</Pill>
                ) : (
                  <Pill tone="muted">중지</Pill>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {a.slotLabel} · {a.createdAt}
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                type="button"
                onClick={() => toggle(a.id, !a.isActive)}
                className="min-h-[40px] rounded-element border border-line px-3 text-xs"
              >
                {a.isActive ? "중지" : "게재"}
              </button>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="min-h-[40px] rounded-element border border-line px-3 text-xs text-rose-deep"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
        {adList.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            게재 중인 배너가 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
