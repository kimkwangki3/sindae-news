import { notFound } from "next/navigation";
import { getLegalDoc, LEGAL_LINKS } from "@/lib/legal";
import { createAnonClient } from "@/lib/supabase/server";
import { kstDate } from "@/lib/datetime";

// 관리자(/admin/legal)에서 편집한 DB 본문을 우선 반영. 즉시 반영 위해 동적.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LEGAL_LINKS.map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const doc = getLegalDoc(params.slug);
  if (!doc) return { title: "해룡신문" };
  return {
    title: `${doc.title} · 해룡신문`,
    alternates: { canonical: `/legal/${params.slug}` },
  };
}

export default async function LegalPage({
  params,
}: {
  params: { slug: string };
}) {
  const doc = getLegalDoc(params.slug);

  // DB 편집본 조회(있으면 우선)
  const { data } = await createAnonClient()
    .from("legal_pages")
    .select("title, body, updated_at")
    .eq("slug", params.slug)
    .maybeSingle();
  const db = data as
    | { title: string; body: string | null; updated_at: string }
    | null;

  // DB 본문이 채워져 있으면 그것으로, 아니면 정적 문서로 폴백
  if (db && db.body && db.body.trim()) {
    const paras = db.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return (
      <div className="px-[18px] py-6">
        <h1 className="text-xl text-rose-deep">{db.title}</h1>
        <p className="mt-1 text-[16px] text-muted">
          최종 개정 {kstDate(db.updated_at)}
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {paras.map((p, i) => (
            <p key={i} className="whitespace-pre-line text-[19px] leading-[1.8] text-ink">
              {p}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (!doc) notFound();
  return (
    <div className="px-[18px] py-6">
      <h1 className="text-xl text-rose-deep">{doc.title}</h1>
      <p className="mt-1 text-[16px] text-muted">최종 개정 {doc.updated}</p>

      <div className="mt-5 flex flex-col gap-5">
        {doc.sections.map((s, i) => (
          <section key={i}>
            {s.heading && (
              <h2 className="mb-1.5 text-[20px] font-bold">{s.heading}</h2>
            )}
            <div className="flex flex-col gap-1.5">
              {s.body.map((line, j) => (
                <p key={j} className="text-[19px] leading-[1.8] text-ink">
                  {line}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
