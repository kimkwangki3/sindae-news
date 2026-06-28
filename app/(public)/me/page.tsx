import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";
import { canWriteArticle, REPORTER_LEVEL_LABEL } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

export const metadata = { title: "마이페이지 · 신대신문" };

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

  const approvedOrgs = user.orgs.filter((o) => o.status === "approved");
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
            <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[11px] font-bold text-rose">
              {ROLE_LABEL[user.role]}
            </span>
            {user.role === "reporter" && user.reporter_level && (
              <span className="rounded-full bg-line px-2 py-0.5 text-[11px] font-bold text-muted">
                {REPORTER_LEVEL_LABEL[user.reporter_level]}
              </span>
            )}
            {user.neighborhood && (
              <span className="text-[11px] text-muted">
                📍 {user.neighborhood}
              </span>
            )}
            {user.is_suspended && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-white">
                정지됨
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 소속(업체·단체) */}
      {(user.business?.status === "approved" || approvedOrgs.length > 0) && (
        <section className="mt-4">
          <h2 className="mb-2 text-[13px] font-bold text-muted">내 소속</h2>
          <div className="flex flex-wrap gap-2">
            {user.business?.status === "approved" && (
              <span className="rounded-full bg-tag-biz-bg px-3 py-1.5 text-xs font-bold text-tag-biz-fg">
                🏪 {user.business.name}
              </span>
            )}
            {approvedOrgs.map((o) => (
              <span
                key={o.org_id}
                className="rounded-full bg-tag-org-bg px-3 py-1.5 text-xs font-bold text-tag-org-fg"
              >
                🏛 {o.name}
                {o.role !== "member" && (
                  <span className="ml-1 opacity-70">· 운영진</span>
                )}
              </span>
            ))}
          </div>
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
        <MeLink href="/market" label="내 나눔글" icon="🤝" />
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
