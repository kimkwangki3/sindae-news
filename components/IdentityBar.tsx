import Link from "next/link";
import type { CurrentUser } from "@/lib/types";

// 아이덴티티 바: 닉네임 + 소속 배지(🏪업체 / 🏛단체), 비로그인 시 로그인 유도.
//
// 소속이 여러 개일 수 있어(업체 2곳, 단체 여러 곳) 배지 줄은 가로 스크롤한다.
// 좁은 화면에서 줄바꿈이 생기면 상단바 높이가 들쭉날쭉해지므로 절대 감싸지 않는다.
// 각 배지는 해당 페이지로 이동하는 링크이고, 승인 대기 중인 소속은 흐리게 표시해
// "등록했는데 왜 안 보이지?"를 바로 알 수 있게 한다.
export default function IdentityBar({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <div className="flex items-center justify-between border-b border-line bg-white px-[18px] py-2.5">
        <span className="text-[13px] text-muted">
          해룡면 이웃들의 소식 · 해룡신문
        </span>
        <Link href="/login" className="text-xs font-bold text-rose-deep">
          로그인 ›
        </Link>
      </div>
    );
  }

  const badges = [
    ...user.businesses.map((b) => ({
      key: `biz-${b.id}`,
      href: b.status === "approved" ? `/district/${b.id}` : "/me",
      icon: "🏪",
      name: b.name,
      pending: b.status !== "approved",
      tone: "bg-tag-biz-bg text-tag-biz-fg",
    })),
    ...user.orgs
      .filter((o) => o.status !== "rejected")
      .map((o) => ({
        key: `org-${o.org_id}`,
        href: o.status === "approved" ? `/orgs/${o.org_id}` : "/me",
        icon: "🏛",
        name: o.name,
        pending: o.status !== "approved",
        tone: "bg-tag-org-bg text-tag-org-fg",
      })),
  ];

  return (
    <div className="flex items-center gap-2.5 border-b border-line bg-white px-[18px] py-2.5">
      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-rose">
        {user.avatar_url ? (
          // 외부 아바타는 next/image 도메인 설정 전이라 일반 img + lazy
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <span className="flex-shrink-0 text-[13px] font-bold">
        {user.nickname} 님
      </span>

      {badges.length > 0 && (
        // 배지가 넘칠 때 오른쪽 끝을 흐리게 처리해 더 있다는 걸 알린다.
        <div className="relative min-w-0 flex-1">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {badges.map((b) => (
              <Link
                key={b.key}
                href={b.href}
                title={b.pending ? `${b.name} · 승인 대기` : b.name}
                className={`flex min-h-[24px] max-w-[140px] flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  b.pending ? "bg-line text-muted" : b.tone
                }`}
              >
                <span aria-hidden>{b.icon}</span>
                <span className="truncate">{b.name}</span>
                {b.pending && <span className="flex-shrink-0">·대기</span>}
              </Link>
            ))}
          </div>
          <span
            className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-white to-transparent"
            aria-hidden
          />
        </div>
      )}

      <Link href="/me" className="ml-auto flex-shrink-0 text-xs text-muted">
        내정보 ›
      </Link>
    </div>
  );
}
