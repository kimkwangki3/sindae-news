import Link from "next/link";
import { MEDIA } from "@/lib/media";

export const metadata = {
  title: "광고 문의 · 해룡신문",
  description:
    "해룡신문 배너 광고 문의. 순천시 해룡면 신대·복성·선월지구 주민에게 노출됩니다. 카카오톡 채널로 문의하세요.",
};

// 예전에는 로그인 + 업체 등록을 마친 회원만 온라인으로 신청할 수 있었다.
// 동네 가게 사장님에게 네 단계는 너무 높은 문턱이라, 카카오톡 채널로
// 바로 문의받는 방식으로 바꿨다(2026-08-01 발행인 결정).
export default function AdsPage() {
  return (
    <div className="px-[18px] py-6">
      <h1 className="text-xl text-rose-deep">광고 문의</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        해룡면 신대·복성·선월지구 주민이 보는 자리에 가게를 알리실 수 있습니다.
      </p>

      <section className="mt-6 rounded-card border border-line bg-ivory-2 p-5">
        <p className="text-[18px] font-bold text-ink">
          카카오톡으로 문의해 주세요
        </p>
        <p className="mt-2 text-[16px] leading-relaxed text-muted">
          채널로 말씀 주시면 게재 위치와 비용을 안내해 드립니다. 가입이나
          업체 등록 없이 바로 문의하실 수 있습니다.
        </p>
        <a
          href={MEDIA.kakaoChannel}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-[52px] items-center justify-center rounded-element bg-[#FEE500] text-[18px] font-bold text-[#191600]"
        >
          카카오톡 채널로 문의하기
        </a>
        <a
          href={`mailto:${MEDIA.email}?subject=${encodeURIComponent("해룡신문 광고 문의")}`}
          className="mt-2 flex min-h-[48px] items-center justify-center rounded-element border border-line bg-white text-sm text-ink"
        >
          이메일로 문의 ({MEDIA.email})
        </a>
      </section>

      <section className="mt-7">
        <h2 className="text-[18px] font-bold text-ink">광고가 나가는 자리</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-[16px] leading-relaxed text-muted">
          <li>· 홈 상단 — 첫 화면에서 가장 먼저 보이는 자리</li>
          <li>· 기사 중간 — 기사를 읽는 동안 노출</li>
          <li>· 상권 상단 — 동네 가게를 찾아보는 사람에게 노출</li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          자리마다 노출량과 비용이 다릅니다. 문의 주시면 현재 상황에 맞춰
          안내해 드리겠습니다.
        </p>
      </section>

      <section className="mt-7 rounded-card border border-line bg-white p-4">
        <h2 className="text-[17px] font-bold text-ink">알려드립니다</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {MEDIA.name}은 기사와 광고를 명확히 구분해 표시합니다. 광고를
          하셨다고 해서 기사로 다뤄 드리거나, 하지 않으셨다고 해서 불리하게
          쓰는 일은 없습니다.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          자세한 내용은{" "}
          <Link href="/legal/ethics" className="underline">
            윤리강령
          </Link>
          을 참고해 주십시오.
        </p>
      </section>
    </div>
  );
}
