import Link from "next/link";
import {
  DAY_LABEL,
  hoursLabel,
  shortAddr,
  type LiveFailure,
  type Place,
} from "@/lib/localinfo";

export const INFO_H2 = "mt-8 text-xl text-rose-deep";

export function LiveFail({ fail }: { fail: LiveFailure }) {
  return (
    <p className="mt-4 rounded-card border border-line bg-ivory-2 p-4 text-[18px] leading-relaxed text-muted">
      {fail.reason}
    </p>
  );
}

export function CallButton({ tel, label = "전화" }: { tel: string; label?: string }) {
  if (!tel) return null;
  return (
    <a
      href={`tel:${tel.replace(/[^0-9]/g, "")}`}
      className="flex min-h-[44px] flex-shrink-0 items-center rounded-element border border-rose-deep px-3 text-[17px] text-rose-deep"
    >
      {label}
    </a>
  );
}

export function PlaceRow({
  place,
  day,
  open,
  openLabel = "등록 영업시간 안",
}: {
  place: Place;
  day: number;
  open: boolean;
  openLabel?: string;
}) {
  return (
    <li className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="text-[19px] font-bold leading-snug">
          {place.name}
          {open && (
            <span className="ml-2 text-[15px] font-normal text-body-green">
              {openLabel}
            </span>
          )}
        </p>
        <p className="text-[16px] leading-snug text-muted">
          {shortAddr(place.addr)}
        </p>
        <p className="text-[16px] leading-snug text-ink">
          {DAY_LABEL[day]}요일 {hoursLabel(place, day)}
        </p>
        {place.note && (
          <p className="text-[15px] leading-snug text-muted">
            기관 입력 비고: {place.note}
          </p>
        )}
      </div>
      <CallButton tel={place.tel} />
    </li>
  );
}

export function FaqBlock({ items }: { items: { q: string; a: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <h2 className={INFO_H2}>자주 묻는 것</h2>
      <div className="mt-3 flex flex-col gap-3">
        {items.map((f) => (
          <div key={f.q} className="rounded-card border border-line bg-white p-4">
            <h3 className="text-lg text-ink">{f.q}</h3>
            <p className="mt-2 text-[18px] leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// 출처와 정정 경로를 늘 함께 둔다(/info 상세와 같은 형식).
export function SourceNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-card border border-line bg-ivory-2 p-4 text-[17px] leading-relaxed text-muted">
      {children}
      <p className="mt-1.5">
        내용이 실제와 다르면{" "}
        <Link href="/tips" className="underline">
          제보
        </Link>
        로 알려 주세요. 기사 정정은{" "}
        <Link href="/legal/correction" className="underline">
          정정 안내
        </Link>
        를 봐 주세요.
      </p>
    </div>
  );
}
