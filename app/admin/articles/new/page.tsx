import Link from "next/link";
import { saveArticle } from "@/lib/admin-actions";
import { PageHead } from "@/components/admin/ui";
import { CATEGORY_NAME, type CategorySlug } from "@/lib/mock/articles";

export const metadata = { title: "기사 작성 · 관리자" };

const CATEGORIES = Object.entries(CATEGORY_NAME) as [CategorySlug, string][];

// 기사 작성/편집. 제목·본문 + 분류·슬러그·상태. 발행/임시저장 버튼이 status를 실어 보낸다.
export default function NewArticlePage() {
  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="기사 작성"
        sub="제목·본문을 작성하고 발행 또는 임시저장하세요"
        action={
          <Link href="/admin/articles" className="text-xs text-muted">
            ‹ 목록
          </Link>
        }
      />

      <form action={saveArticle} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-[13px] font-bold">
            제목
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="기사 제목을 입력하세요"
            className="min-h-[48px] rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-[13px] font-bold">
              분류
            </label>
            <select
              id="category"
              name="category"
              className="min-h-[48px] rounded-element border border-line bg-white px-3 text-sm outline-none focus:border-rose"
            >
              {CATEGORIES.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slug" className="text-[13px] font-bold">
              슬러그(URL)
            </label>
            <input
              id="slug"
              name="slug"
              placeholder="village-garden-2026"
              className="min-h-[48px] rounded-element border border-line bg-white px-3.5 text-xs outline-none focus:border-rose"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body" className="text-[13px] font-bold">
            본문
          </label>
          <textarea
            id="body"
            name="body"
            rows={12}
            placeholder="본문을 작성하세요"
            className="resize-y rounded-element border border-line bg-white p-3.5 text-sm leading-relaxed outline-none focus:border-rose"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold">대표 이미지</label>
          <div className="flex h-28 items-center justify-center rounded-element border border-dashed border-line bg-white text-sm text-muted">
            📷 썸네일 업로드 (후속 연동)
          </div>
        </div>

        {/* 발행 / 임시저장 — 같은 폼, status 값만 다름 */}
        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            name="status"
            value="published"
            className="min-h-[52px] flex-1 rounded-element bg-rose-deep text-sm font-bold text-white"
          >
            발행
          </button>
          <button
            type="submit"
            name="status"
            value="draft"
            className="min-h-[52px] flex-1 rounded-element border border-line bg-white text-sm font-bold text-muted"
          >
            임시저장
          </button>
        </div>
      </form>
    </div>
  );
}
