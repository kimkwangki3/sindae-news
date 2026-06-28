import { getLegalPages } from "@/lib/mock/admin";
import { LEGAL_LINKS } from "@/lib/legal";
import { saveLegalPage } from "@/lib/admin-content-actions";
import { PageHead } from "@/components/admin/ui";

export const metadata = { title: "법적 페이지 · 관리자" };

// 법적 페이지 DB 편집. 알려진 5개 슬롯 + DB 본문을 병합해 폼으로 노출.
export default async function AdminLegalPage() {
  const db = await getLegalPages();
  const bySlug = new Map(db.map((d) => [d.slug, d]));

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="법적 페이지"
        sub="발행인·연락처 등 사실 정보를 입력·수정하세요"
      />
      <p className="mb-4 rounded-card border border-line bg-white p-3 text-[12px] leading-relaxed text-muted">
        본문은 빈 줄로 문단을 구분합니다. 저장하면 공개 페이지(/legal/…)에 즉시
        반영됩니다. (legal_pages 마이그레이션 실행 필요)
      </p>

      <div className="flex flex-col gap-6">
        {LEGAL_LINKS.map((p) => {
          const cur = bySlug.get(p.slug);
          return (
            <form
              key={p.slug}
              action={saveLegalPage}
              className="rounded-card border border-line bg-white p-4"
            >
              <input type="hidden" name="slug" value={p.slug} />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-rose-deep">{p.title}</h2>
                {cur?.updatedAt && (
                  <span className="text-[11px] text-muted">
                    수정 {cur.updatedAt}
                  </span>
                )}
              </div>
              <input
                name="title"
                defaultValue={cur?.title ?? p.title}
                className="mb-2 min-h-[44px] w-full rounded-element border border-line px-3 text-sm outline-none focus:border-rose"
              />
              <textarea
                name="body"
                rows={8}
                defaultValue={cur?.body ?? ""}
                placeholder={`${p.title} 본문을 입력하세요`}
                className="w-full resize-y rounded-element border border-line p-3 text-sm leading-relaxed outline-none focus:border-rose"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  className="min-h-[40px] rounded-element bg-rose-deep px-4 text-xs font-bold text-white"
                >
                  저장
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
