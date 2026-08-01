import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReportSheet from "@/components/ReportSheet";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getOrg, ORG_CAT_NAME } from "@/lib/mock/orgs";
import { getOrgBoardPosts } from "@/lib/mock/community";
import ShareButton from "@/components/ShareButton";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const o = await getOrg(params.id);
  return { title: o ? `${o.name} · 지역단체` : "지역단체 · 해룡신문" };
}

export default async function OrgDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { p?: string };
}) {
  const org = await getOrg(params.id);
  if (!org) notFound();

  // 단체 소식 = 게시판 글 중 이 단체 것. 5개씩 페이지로 넘긴다.
  const page = Math.max(1, Number(searchParams.p ?? 1) || 1);
  const [user, news] = await Promise.all([
    getCurrentUser(),
    getOrgBoardPosts(org.id, page, 5),
  ]);
  const isStaff = can(user, "write_org_post", { orgId: org.id });
  // 이 단체와의 관계. 이미 회원이거나 신청 대기 중이면 가입 버튼을 띄우지 않는다.
  const membership = user?.orgs.find((o) => o.org_id === org.id) ?? null;

  return (
    <div className="px-[18px] pb-28">
      <div className="flex items-center justify-between py-3">
        <Link href="/orgs" className="text-sm text-muted">
          ‹ 지역단체
        </Link>
      </div>

      {org.photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {org.photos.map((u) => (
            <div
              key={u}
              className="relative h-[150px] w-[220px] flex-shrink-0 overflow-hidden rounded-card bg-ivory-2"
            >
              <Image src={u} alt={org.name} fill sizes="220px" className="object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[140px] w-full rounded-card bg-gradient-to-br from-[#CFE7D7] to-[#7FB894]" />
      )}

      <div className="mt-3">
        <span className="rounded-full bg-tag-org-bg px-2.5 py-1 text-[16px] font-bold text-tag-org-fg">
          {ORG_CAT_NAME[org.category]}
        </span>
      </div>
      <h1 className="mt-2 text-[27px] font-extrabold">{org.name}</h1>
      <p className="mt-1 text-[18px] text-muted">
        회원 {org.memberCount}명 · {org.neighborhood} · {org.since}~
      </p>

      {/* 운영진 메뉴 */}
      {isStaff && (
        <div className="mt-3 flex gap-2">
          <Link
            href={`/orgs/${org.id}/manage`}
            className="flex-1 rounded-element bg-rose-soft py-2.5 text-center text-xs font-bold text-rose-deep"
          >
            가입 관리
            {org.pending.length > 0 && ` (${org.pending.length})`}
          </Link>
          <Link
            href={`/orgs/${org.id}/write`}
            className="flex-1 rounded-element bg-rose-soft py-2.5 text-center text-xs font-bold text-rose-deep"
          >
            소식 글쓰기
          </Link>
        </div>
      )}

      <dl className="mt-4 flex flex-col gap-2.5 border-y border-line py-4 text-sm">
        <InfoRow k="활동지역" v={org.region} />
        <InfoRow k="대표" v={org.leader} />
        <InfoRow k="문의" v={org.contact} />
      </dl>

      <section className="mt-6">
        <h2 className="mb-2 text-base text-rose-deep">단체 소개</h2>
        <p className="whitespace-pre-line text-[20px] leading-[1.85]">
          {org.intro}
        </p>
      </section>

      {/* 단체 소식 — 게시판에 올라간 이 단체 글의 제목만. 5개씩. */}
      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base text-rose-deep">단체 소식</h2>
          {news.total > 0 && (
            <span className="text-[16px] text-muted">전체 {news.total}건</span>
          )}
        </div>

        {news.items.length === 0 ? (
          <p className="rounded-card border border-line bg-white p-5 text-center text-[18px] text-muted">
            아직 올라온 소식이 없습니다
          </p>
        ) : (
          <ul className="overflow-hidden rounded-card border border-line bg-white">
            {news.items.map((n) => (
              <li key={n.id} className="border-t border-line first:border-t-0">
                <Link
                  href={`/board/${n.id}`}
                  className="flex min-h-[52px] items-center gap-2 px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-[19px]">
                    {n.title}
                  </span>
                  {n.commentCount > 0 && (
                    <span className="text-[16px] text-rose">
                      💬 {n.commentCount}
                    </span>
                  )}
                  <span className="text-[16px] text-muted">{n.createdAt}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {news.totalPages > 1 && (
          <nav className="mt-3 flex justify-center gap-1.5">
            {Array.from({ length: news.totalPages }, (_, i) => i + 1).map(
              (n) => (
                <Link
                  key={n}
                  href={`/orgs/${org.id}?p=${n}`}
                  aria-current={n === news.page ? "page" : undefined}
                  className={`flex h-9 min-w-9 items-center justify-center rounded-element border px-2 text-xs ${
                    n === news.page
                      ? "border-rose bg-rose-soft font-bold text-rose-deep"
                      : "border-line text-muted"
                  }`}
                >
                  {n}
                </Link>
              ),
            )}
          </nav>
        )}
      </section>

      <div className="mt-6 flex items-center justify-between gap-2">
        <ShareButton title={org.name} text={org.intro} label="단체 공유" />
        <ReportSheet
          targetType="organization"
          targetId={org.id}
          targetLabel={org.name}
          triggerClassName="text-xs text-muted underline"
          triggerLabel="🚩 이 단체 신고하기"
        />
      </div>

      {/* 하단 액션 바 — fixed로 두면 하단 탭바와 푸터를 덮는다.
          sticky + 탭바 높이만큼 띄워서 겹치지 않게 한다. */}
      <div className="sticky bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] z-20 -mx-[18px] mt-6 flex gap-2 border-t border-line bg-white p-3">
        {org.kakaoChannel && (
          <a
            href={org.kakaoChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-element bg-[#FEE500] text-sm font-bold text-[#3C1E1E]"
          >
            💬 카톡 문의
          </a>
        )}
        {/* 이미 회원이면 가입 버튼 대신 상태만 알린다. 반려된 경우는 다시 신청할 수 있게 둔다. */}
        {membership?.status === "approved" ? (
          <span className="flex min-h-[48px] flex-1 items-center justify-center rounded-element border border-line text-sm text-muted">
            ✅ 가입된 단체
            {membership.role !== "member" && " · 운영진"}
          </span>
        ) : membership?.status === "pending" ? (
          <span className="flex min-h-[48px] flex-1 items-center justify-center rounded-element border border-line text-sm text-muted">
            ⏳ 가입 승인 대기 중
          </span>
        ) : org.acceptJoin ? (
          <Link
            href={`/orgs/${org.id}/join`}
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-element bg-rose-deep text-sm font-bold text-white"
          >
            ✋ 가입 신청
          </Link>
        ) : (
          <span className="flex min-h-[48px] flex-1 items-center justify-center rounded-element border border-line text-sm text-muted">
            가입 신청 받지 않음
          </span>
        )}
      </div>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 flex-shrink-0 text-muted">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}
