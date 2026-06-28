import Link from "next/link";
import { getAd, SLOT_LABEL, type AdSlotKey } from "@/lib/mock/ads";

// 광고 슬롯: 활성 배너가 있으면 배너 렌더, 없으면 '광고 문의' 자리표시.
// variant="infeed"는 나눔마켓 목록 사이에 끼우는 가로형 카드.
export default async function AdSlot({
  slot,
  variant = "banner",
}: {
  slot: AdSlotKey;
  variant?: "banner" | "infeed";
}) {
  const ad = await getAd(slot);

  if (!ad) {
    // 미판매 슬롯 — 광고 신청 유도 자리표시
    return (
      <Link
        href="/ads/apply"
        className="my-5 flex h-[90px] items-center justify-center rounded-card border border-dashed border-rose bg-ivory-2 text-xs text-muted"
      >
        {SLOT_LABEL[slot]} · 광고 문의 ›
      </Link>
    );
  }

  if (variant === "infeed") {
    return (
      <Link
        href={ad.href}
        className="my-3 flex items-center gap-3 rounded-card border border-line bg-white p-3"
      >
        <div className="flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center rounded-thumb bg-gradient-to-br from-[#EFD9DE] to-[#D69AA8] text-[10px] text-white/70">
          AD
        </div>
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-rose-soft px-1.5 py-0.5 text-[9px] font-bold text-rose">
            광고
          </span>
          <p className="mt-1 line-clamp-1 text-sm font-bold">
            {ad.advertiser}
          </p>
          <p className="line-clamp-1 text-[11px] text-muted">{ad.text}</p>
        </div>
        <span className="flex-shrink-0 text-[10px] text-muted">스폰서</span>
      </Link>
    );
  }

  return (
    <Link
      href={ad.href}
      className="my-5 flex items-center gap-3 rounded-card bg-gradient-to-r from-rose-soft to-ivory-2 px-4 py-4"
    >
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-rose">
        광고
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-rose-deep">{ad.advertiser}</p>
        <p className="line-clamp-1 text-xs text-ink">{ad.text}</p>
      </div>
      <span aria-hidden className="text-muted">
        ›
      </span>
    </Link>
  );
}
