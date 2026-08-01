import { notFound } from "next/navigation";
import Link from "next/link";
import { findStaffByHandle, STAFF } from "@/lib/staff";
import { MEDIA } from "@/lib/media";
import { createAnonClient } from "@/lib/supabase/server";
import ArticleListItem from "@/components/ArticleListItem";
import { CATEGORY_NAME, ID_TO_SLUG } from "@/lib/mock/articles-meta";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function generateStaticParams() {
  return STAFF.map((s) => ({ handle: s.handle }));
}

export function generateMetadata({ params }: { params: { handle: string } }) {
  const s = findStaffByHandle(params.handle);
  if (!s) return { title: `필자 · ${MEDIA.name}` };
  const title = `${s.name} ${s.title} · ${MEDIA.name}`;
  return {
    title,
    description: s.bio,
    // openGraph를 정의하면 상위 것을 대체하므로 이미지를 여기에도 넣는다.
    openGraph: {
      title,
      description: s.bio,
      type: "profile",
      images: ["/og-image.png"],
    },
  };
}

// 필자 프로필 — 누가 썼는지 추적 가능하게 한다(뉴스 매체 신뢰 신호).
export default async function ReporterProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const staff = findStaffByHandle(params.handle);
  if (!staff) notFound();

  // 이 필자가 쓴 기사 — 바이라인(profiles.nickname)이 이름과 같은 글을 모은다.
  const { data } = await createAnonClient()
    .from("articles")
    .select(
      "slug, title, thumbnail_url, category_id, published_at, author:profiles!author_id(nickname)",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);

  const rows = (data ?? []) as unknown as {
    slug: string;
    title: string;
    thumbnail_url: string | null;
    category_id: number | null;
    published_at: string | null;
    author?: { nickname?: string } | null;
  }[];

  const mine = rows.filter((r) => r.author?.nickname === staff.name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: staff.name,
    jobTitle: staff.title,
    email: staff.email,
    description: staff.bio,
    url: `${SITE_URL}/reporters/${staff.handle}`,
    worksFor: {
      "@type": "NewsMediaOrganization",
      name: MEDIA.name,
      url: SITE_URL,
    },
  };

  return (
    <div className="px-[18px] py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="flex items-center justify-between py-1">
        <Link href="/reporters" className="text-sm text-muted">
          ‹ 필자
        </Link>
      </div>

      <h1 className="mt-2 text-[22px] font-extrabold">{staff.name}</h1>
      <p className="mt-1 text-[13px] text-muted">
        {MEDIA.name} {staff.title}
      </p>

      <dl className="mt-4 flex flex-col gap-2.5 border-y border-line py-4 text-sm">
        <div className="flex gap-3">
          <dt className="w-20 flex-shrink-0 text-muted">담당 분야</dt>
          <dd className="flex-1">{staff.areas.join(" · ")}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-20 flex-shrink-0 text-muted">이메일</dt>
          <dd className="flex-1">
            <a href={`mailto:${staff.email}`} className="underline">
              {staff.email}
            </a>
          </dd>
        </div>
      </dl>

      <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.85]">
        {staff.bio}
      </p>

      <section className="mt-7">
        <h2 className="mb-1 text-base text-rose-deep">
          {staff.name} 기자의 기사
          {mine.length > 0 && (
            <span className="ml-1.5 text-[12px] font-normal text-muted">
              {mine.length}건
            </span>
          )}
        </h2>
        {mine.length === 0 ? (
          <p className="mt-2 rounded-card border border-line bg-white p-5 text-center text-[13px] text-muted">
            아직 등록된 기사가 없습니다
          </p>
        ) : (
          <ul>
            {mine.map((a) => {
              const slug = a.category_id ? ID_TO_SLUG[a.category_id] : "local";
              const name = CATEGORY_NAME[slug];
              return (
                <ArticleListItem
                  key={a.slug}
                  article={{
                    slug: a.slug,
                    category: name,
                    title: a.title,
                    meta: `${name} · ${(a.published_at ?? "").slice(0, 10).replace(/-/g, ".")}`,
                    thumbnailUrl: a.thumbnail_url,
                  }}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
