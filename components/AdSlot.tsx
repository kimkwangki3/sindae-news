import Link from "next/link";
import Image from "next/image";
import { getAd, type AdSlotKey } from "@/lib/mock/ads";

// 광고 슬롯: 활성 배너가 있으면 배너를 그리고, 없으면 아무것도 그리지 않는다.
//
// placeholder를 켠 자리에서만 '광고 문의' 점선 박스를 보여준다. 자리를 열 개
// 두고 전부 자리표시를 띄우면 빈 박스만 가득한 사이트가 된다 — 광고가 팔리기
// 전까지는 오히려 신뢰를 깎는다. 문의 유도는 눈에 잘 띄는 몇 곳이면 충분하다.
//
// variant="infeed"는 목록 사이에 끼우는 가로형 카드.
export default async function AdSlot({
  slot,
  variant = "banner",
  placeholder = false,
}: {
  slot: AdSlotKey;
  variant?: "banner" | "infeed";
  placeholder?: boolean;
}) {
  const ad = await getAd(slot);

  if (!ad) {
    if (!placeholder) return null;
    return (
      <Link
        href="/ads/apply"
        className="my-5 flex h-[90px] items-center justify-center rounded-card border border-dashed border-rose bg-ivory-2 text-xs text-muted"
      >
        이 자리에 우리 가게를 · 광고 문의 ›
      </Link>
    );
  }

  if (variant === "infeed") {
    return (
      <Link
        href={ad.href}
        className="my-3 flex items-center gap-3 rounded-card border border-line bg-white p-3"
      >
        {ad.imageUrl ? (
          <div className="relative h-[56px] w-[56px] flex-shrink-0 overflow-hidden rounded-thumb">
            <Image
              src={ad.imageUrl}
              alt={ad.advertiser}
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center rounded-thumb bg-gradient-to-br from-[#EFD9DE] to-[#D69AA8] text-[13px] text-white/70">
            AD
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-rose-soft px-1.5 py-0.5 text-[12px] font-bold text-rose">
            광고
          </span>
          <p className="mt-1 line-clamp-1 text-sm font-bold">
            {ad.advertiser}
          </p>
          <p className="line-clamp-1 text-[14px] text-muted">{ad.text}</p>
        </div>
        <span className="flex-shrink-0 text-[13px] text-muted">스폰서</span>
      </Link>
    );
  }

  // 이미지 배너 — 업로드된 배너가 있으면 이미지로 노출
  if (ad.imageUrl) {
    return (
      <Link
        href={ad.href}
        className="relative my-5 block overflow-hidden rounded-card"
      >
        <Image
          src={ad.imageUrl}
          alt={ad.advertiser}
          width={1200}
          height={300}
          sizes="(max-width: 480px) 100vw, 480px"
          className="h-auto w-full object-cover"
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[13px] font-bold text-white">
          광고
        </span>
      </Link>
    );
  }

  // 이미지 없는 텍스트 배너
  return (
    <Link
      href={ad.href}
      className="my-5 flex items-center gap-3 rounded-card bg-gradient-to-r from-rose-soft to-ivory-2 px-4 py-4"
    >
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[13px] font-bold text-rose">
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
