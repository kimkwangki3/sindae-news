import { notFound } from "next/navigation";
import { getLegalDoc, LEGAL_LINKS } from "@/lib/legal";

export function generateStaticParams() {
  return LEGAL_LINKS.map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const doc = getLegalDoc(params.slug);
  return { title: doc ? `${doc.title} · 신대신문` : "신대신문" };
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const doc = getLegalDoc(params.slug);
  if (!doc) notFound();

  return (
    <div className="px-[18px] py-6">
      <h1 className="text-xl text-rose-deep">{doc.title}</h1>
      <p className="mt-1 text-[11px] text-muted">최종 개정 {doc.updated}</p>

      <div className="mt-5 flex flex-col gap-5">
        {doc.sections.map((s, i) => (
          <section key={i}>
            {s.heading && (
              <h2 className="mb-1.5 text-[15px] font-bold">{s.heading}</h2>
            )}
            <div className="flex flex-col gap-1.5">
              {s.body.map((line, j) => (
                <p key={j} className="text-[14px] leading-[1.8] text-ink">
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
