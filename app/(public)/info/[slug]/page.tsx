import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getInfoPage, fmtUpdated } from "@/lib/info";
import ShareButton from "@/components/ShareButton";
import AdSlot from "@/components/AdSlot";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const page = await getInfoPage(params.slug);
  if (!page) return { title: "생활정보 · 해룡신문" };
  return {
    title: `${page.title} · 해룡신문`,
    description: page.summary ?? undefined,
  };
}

export default async function InfoDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = await getInfoPage(params.slug);
  if (!page) notFound();

  const paras = (page.body ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="px-[18px] py-6">
      <Link href="/info" className="text-[12px] text-muted">
        ← 생활정보
      </Link>

      <h1 className="mt-2 text-xl text-rose-deep">
        {page.icon && <span aria-hidden>{page.icon} </span>}
        {page.title}
      </h1>
      {page.summary && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {page.summary}
        </p>
      )}

      {/* 요일표처럼 한 장으로 정리된 그림은 글보다 훨씬 잘 퍼진다.
          본문보다 먼저 보이게 맨 위에 둔다.
          object-contain 인 이유: 표를 잘라내면 안 된다. 공용 Thumb 은
          object-cover 라 가장자리가 잘려 여기에는 쓸 수 없다. */}
      {page.imageUrl && (
        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-card border border-line bg-ivory-2">
          <Image
            src={page.imageUrl}
            alt={`${page.title} 안내 이미지`}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain"
          />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {paras.map((p, i) => (
          <p
            key={i}
            className="whitespace-pre-line text-[14px] leading-[1.85] text-ink"
          >
            {p}
          </p>
        ))}
      </div>

      {/* 언제 기준인지, 어디서 온 자료인지, 그리고 최종 확인은 어떻게 하는지.
          신문사가 낸 정보라 틀렸을 때의 책임이 크다. 셋을 늘 함께 둔다. */}
      <div className="mt-8 rounded-card border border-line bg-ivory-2 p-4 text-[12px] leading-relaxed text-muted">
        <p>
          <b className="text-ink">{fmtUpdated(page.updatedAt)}</b> 기준 정보입니다.
          {page.autoUpdated && " 자동으로 갱신됩니다."}
        </p>
        {page.sourceName && (
          <p className="mt-1">
            출처:{" "}
            {page.sourceUrl ? (
              <a
                href={page.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {page.sourceName}
              </a>
            ) : (
              page.sourceName
            )}
          </p>
        )}
        <p className="mt-1">
          사정에 따라 달라질 수 있으니 방문 전 전화로 확인하시기 바랍니다.
          잘못된 내용은{" "}
          <Link href="/tips" className="underline">
            제보
          </Link>
          로 알려주시면 바로잡겠습니다.
        </p>
      </div>

      <AdSlot slot="info-bottom" />

      <div className="mt-4">
        <ShareButton title={page.title} text={page.summary ?? undefined} label="공유하기" />
      </div>
    </div>
  );
}
