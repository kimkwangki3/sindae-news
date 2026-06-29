import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReportSheet from "@/components/ReportSheet";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getOrg, ORG_CAT_NAME } from "@/lib/mock/orgs";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const o = await getOrg(params.id);
  return { title: o ? `${o.name} · 지역단체` : "지역단체 · 신대신문" };
}

export default async function OrgDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const org = await getOrg(params.id);
  if (!org) notFound();

  const user = await getCurrentUser();
  const isStaff = can(user, "write_org_post", { orgId: org.id });

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
        <span className="rounded-full bg-tag-org-bg px-2.5 py-1 text-[11px] font-bold text-tag-org-fg">
          {ORG_CAT_NAME[org.category]}
        </span>
      </div>
      <h1 className="mt-2 text-[22px] font-extrabold">{org.name}</h1>
      <p className="mt-1 text-[13px] text-muted">
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
        <p className="whitespace-pre-line text-[15px] leading-[1.85]">
          {org.intro}
        </p>
      </section>

      {org.posts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-base text-rose-deep">단체 소식</h2>
          {org.posts.map((p) => (
            <div
              key={p.id}
              className="mb-2 rounded-card border border-line bg-white p-4"
            >
              <span className="rounded-full bg-tag-org-bg px-2 py-0.5 text-[10px] font-bold text-tag-org-fg">
                {p.category}
              </span>
              <h5 className="mt-1.5 text-sm font-bold">{p.title}</h5>
              <p className="mt-1 text-[13px] text-muted">{p.body}</p>
              {p.photoUrls.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {p.photoUrls.map((u) => (
                    <div
                      key={u}
                      className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-thumb bg-ivory-2"
                    >
                      <Image src={u} alt="" fill sizes="96px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted">{p.createdAt}</p>
            </div>
          ))}
        </section>
      )}

      <div className="mt-6 flex justify-center">
        <ReportSheet
          targetType="organization"
          targetId={org.id}
          targetLabel={org.name}
          triggerClassName="text-xs text-muted underline"
          triggerLabel="🚩 이 단체 신고하기"
        />
      </div>

      {/* 하단 액션 바 */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app gap-2 border-t border-line bg-white p-3">
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
        {org.acceptJoin ? (
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
