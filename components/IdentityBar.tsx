import Link from "next/link";
import type { CurrentUser } from "@/lib/types";

// 아이덴티티 바: 로그인 시 닉네임 + 역할 태그(🏪업체 / 🏛단체), 비로그인 시 로그인 유도.
export default function IdentityBar({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <div className="flex items-center justify-between border-b border-line bg-white px-[18px] py-2.5">
        <span className="text-[13px] text-muted">
          신대지구 이웃들의 소식 · 신대신문
        </span>
        <Link href="/login" className="text-xs font-bold text-rose-deep">
          로그인 ›
        </Link>
      </div>
    );
  }

  const approvedOrgs = user.orgs.filter((o) => o.status === "approved");

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
      <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
        {user.business?.status === "approved" && (
          <span className="whitespace-nowrap rounded-full bg-tag-biz-bg px-2.5 py-1 text-[10px] font-bold text-tag-biz-fg">
            🏪 {user.business.name}
          </span>
        )}
        {approvedOrgs.map((o) => (
          <span
            key={o.org_id}
            className="whitespace-nowrap rounded-full bg-tag-org-bg px-2.5 py-1 text-[10px] font-bold text-tag-org-fg"
          >
            🏛 {o.name}
          </span>
        ))}
      </div>
      <Link
        href="/me"
        className="ml-auto flex-shrink-0 text-xs text-muted"
      >
        내정보 ›
      </Link>
    </div>
  );
}
