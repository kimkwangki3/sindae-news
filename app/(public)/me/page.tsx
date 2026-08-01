import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";
import { canWriteArticle, REPORTER_LEVEL_LABEL } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";
import { FEATURES } from "@/lib/features";

export const metadata = { title: "마이페이지 · 해룡신문" };

const ROLE_LABEL: Record<UserRole, string> = {
  user: "일반회원",
  reporter: "시민기자",
  admin: "관리자",
  superadmin: "최고관리자",
};

// 마이페이지 — 신원(등급·소속·상태) 요약 + 바로가기 + 로그아웃.
export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 반려된 것만 빼고 보여준다(승인 대기도 본인은 알아야 한다).
  const myOrgs = user.orgs.filter((o) => o.status !== "rejected");
  const writeAllowed = canWriteArticle(user);
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  return (
    <div className="px-[18px] pb-10 pt-5">
      {/* 신원 카드 */}
      <section className="flex items-center gap-3.5 rounded-card border border-line bg-white p-4">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-rose">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold">{user.nickname} 님</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[14px] font-bold text-rose">
              {ROLE_LABEL[user.role]}
            </span>
            {user.role === "reporter" && user.reporter_level && (
              <span className="rounded-full bg-line px-2 py-0.5 text-[14px] font-bold text-muted">
                {REPORTER_LEVEL_LABEL[user.reporter_level]}
              </span>
            )}
            {user.neighborhood && (
              <span className="text-[14px] text-muted">
                📍 {user.neighborhood}
              </span>
            )}
            {user.is_suspended && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[14px] font-bold text-white">
                정지됨
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 소속(업체·단체) — 승인 대기분도 보여준다. 여러 개일 수 있어 목록으로. */}
      {(user.businesses.length > 0 || myOrgs.length > 0) && (
        <section className="mt-4">
          <h2 className="mb-2 text-[16px] font-bold text-muted">내 소속</h2>
          <ul className="flex flex-col gap-2">
            {user.businesses.map((b) => (
              <li key={b.id}>
                <Link
                  href={b.status === "approved" ? `/district/${b.id}` : "/me"}
                  className="flex min-h-[48px] items-center gap-2 rounded-card border border-line bg-white px-4"
                >
                  <span className="rounded-full bg-tag-biz-bg px-2.5 py-1 text-[14px] font-bold text-tag-biz-fg">
                    🏪 업체
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {b.name}
                  </span>
                  {b.status === "approved" ? (
                    <span className="text-[14px] text-muted">보기 ›</span>
                  ) : (
                    <span className="text-[14px] text-muted">승인 대기</span>
                  )}
                </Link>
              </li>
            ))}
            {myOrgs.map((o) => (
              <li key={o.org_id}>
                <Link
                  href={o.status === "approved" ? `/orgs/${o.org_id}` : "/me"}
                  className="flex min-h-[48px] items-center gap-2 rounded-card border border-line bg-white px-4"
                >
                  <span className="rounded-full bg-tag-org-bg px-2.5 py-1 text-[14px] font-bold text-tag-org-fg">
                    🏛 단체
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {o.name}
                    {o.role !== "member" && (
                      <span className="ml-1 text-[14px] font-normal text-muted">
                        · 운영진
                      </span>
                    )}
                  </span>
                  {o.status === "approved" ? (
                    <span className="text-[14px] text-muted">보기 ›</span>
                  ) : (
                    <span className="text-[14px] text-muted">승인 대기</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 관리자 진입 */}
      {isAdmin && (
        <Link
          href="/admin"
          className="mt-6 flex min-h-[52px] items-center gap-3 rounded-card bg-rose-deep px-4 text-sm font-bold text-white"
        >
          <span aria-hidden className="text-base">
            🛠
          </span>
          <span className="flex-1">관리자 페이지</span>
          <span aria-hidden>›</span>
        </Link>
      )}

      {/* 바로가기 */}
      <section className="mt-6 overflow-hidden rounded-card border border-line bg-white">
        {writeAllowed && (
          <MeLink href="/reporter" label="기자 공간" icon="✍️" />
        )}
        {FEATURES.market && (
          <MeLink href="/market" label="내 나눔글" icon="🤝" />
        )}
        <MeLink href="/board" label="내 게시글" icon="💬" />
        {!user.business && (
          <MeLink href="/district" label="업체 등록" icon="🏪" />
        )}
        <MeLink href="/orgs" label="지역단체" icon="🏛" />
      </section>

      {/* 로그아웃 */}
      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="min-h-[48px] w-full rounded-element border border-line bg-white text-sm font-bold text-muted"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}

function MeLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[52px] items-center gap-3 border-t border-line px-4 text-sm first:border-t-0"
    >
      <span aria-hidden className="text-base">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span aria-hidden className="text-muted">
        ›
      </span>
    </Link>
  );
}
