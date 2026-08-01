import { MEDIA } from "@/lib/media";

// 기사를 다 읽은 자리에서 카카오톡 채널을 권한다.
//
// 카카오 JS SDK는 쓰지 않는다. '채널 추가' 화면으로 가는 링크 한 줄이면 되는데
// 외부 스크립트를 끌어오면 그만큼 느려지고 추적 스크립트가 따라붙는다.
//
// 문구 주의: 채널 '소식'은 친구에게 알림이 가지 않고 채널 홈에만 쌓인다.
// 알림 발송(메시지)은 유료라 아직 쓰지 않으므로 "받아보세요"라고 하지 않는다.
export default function KakaoChannelCta() {
  return (
    <section className="mt-8 rounded-card border border-line bg-ivory-2 p-4">
      <p className="text-sm font-bold text-ink">카카오톡 채널</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        채널을 추가하시면 {MEDIA.name} 소식을 카카오톡에서 보실 수 있습니다.
      </p>
      <a
        href={MEDIA.kakaoChannelAdd}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex min-h-[44px] items-center justify-center rounded-element bg-[#FEE500] text-sm font-bold text-[#191600]"
      >
        채널 추가하기
      </a>
    </section>
  );
}
