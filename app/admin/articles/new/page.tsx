import Link from "next/link";
import { saveArticle } from "@/lib/admin-actions";
import { PageHead } from "@/components/admin/ui";
import ImageUpload from "@/components/ImageUpload";
import BlockEditor from "@/components/BlockEditor";
import ArticleAiFields from "@/components/ArticleAiFields";
import { ARTICLE_PALETTE, textToBlocks } from "@/lib/blocks";
import { CATEGORY_NAME, type CategorySlug } from "@/lib/mock/articles";
import { MAX_TAGS, tagsToInput } from "@/lib/tags";
import { getArticleForEdit } from "@/lib/mock/admin";
import { notFound } from "next/navigation";

export const metadata = { title: "기사 작성 · 관리자" };

const CATEGORIES = Object.entries(CATEGORY_NAME) as [CategorySlug, string][];

// 기사 작성/편집.
//  · ?slug=  → 기존 기사 편집(전 항목 프리필, original_slug로 대상 고정)
//  · ?title=&body= → 제보 기사화 프리필
export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: { title?: string; body?: string; slug?: string };
}) {
  const editing = searchParams.slug
    ? await getArticleForEdit(searchParams.slug)
    : null;
  if (searchParams.slug && !editing) notFound();

  const preTitle = editing?.title ?? searchParams.title ?? "";
  const preBody = editing?.body ?? searchParams.body ?? "";
  return (
    <div className="px-[18px] py-5">
      <PageHead
        title={editing ? "기사 수정" : "기사 작성"}
        sub={
          editing
            ? "수정 후 발행하면 게재일자는 그대로 유지됩니다"
            : "제목·본문을 작성하고 발행 또는 임시저장하세요"
        }
        action={
          <Link href="/admin/articles" className="text-xs text-muted">
            ‹ 목록
          </Link>
        }
      />

      <form action={saveArticle} className="flex flex-col gap-4">
        {/* 편집 대상 고정 — 슬러그를 바꿔도 새 글이 아니라 이 글이 수정된다 */}
        {editing && (
          <input type="hidden" name="original_slug" value={editing.slug} />
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-[18px] font-bold">
            제목
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={preTitle}
            placeholder="기사 제목을 입력하세요"
            className="min-h-[48px] rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="subtitle" className="text-[18px] font-bold">
            부제 (선택)
          </label>
          <input
            id="subtitle"
            name="subtitle"
            defaultValue={editing?.subtitle ?? ""}
            placeholder="주제목을 보완하는 한 줄. 상세 화면에만 표시됩니다"
            className="min-h-[48px] rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-[18px] font-bold">
              분류
            </label>
            <select
              id="category"
              name="category"
              defaultValue={editing?.categorySlug}
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
            <label htmlFor="slug" className="text-[18px] font-bold">
              슬러그(URL){" "}
              <span className="font-normal text-muted">— 비우면 자동 생성</span>
            </label>
            <input
              id="slug"
              name="slug"
              defaultValue={editing?.slug ?? ""}
              placeholder="village-garden-2026"
              className="min-h-[48px] rounded-element border border-line bg-white px-3.5 text-xs outline-none focus:border-rose"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tags" className="text-[18px] font-bold">
            태그 (선택){" "}
            <span className="font-normal text-muted">
              — 쉼표로 구분, 최대 {MAX_TAGS}개
            </span>
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={tagsToInput(editing?.tags)}
            placeholder="선암사, 청년, 소개팅 프로그램"
            className="min-h-[48px] rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
          />
          <p className="text-[16px] text-muted">
            # 없이 적으세요. 기사 아래에 #태그로 표시되고, 누르면 같은 태그
            기사들이 모입니다.
          </p>
        </div>

        {/* 본문 — 문단·사진·소제목·인용·구분선을 순서대로 쌓는다.
            예전에 text로 저장된 기사는 열 때 문단 블록으로 바꿔 채운다. */}
        <BlockEditor
          name="body_blocks"
          textName="body"
          bucket="articles"
          palette={ARTICLE_PALETTE}
          defaultBlocks={editing?.bodyBlocks ?? textToBlocks(preBody)}
          label="본문"
          hint="칸을 누르면 색·소제목·순서 바꾸기가 나옵니다. 사진은 원하는 문단 아래에 넣을 수 있어요."
        />

        <ImageUpload
          name="thumbnail_url"
          bucket="articles"
          label="대표 이미지"
          hint="목록·상세 상단 썸네일. 비워두면 본문 첫 사진을 씁니다. 6MB 이하 권장."
          defaultUrls={editing?.thumbnailUrl ? [editing.thumbnailUrl] : []}
        />

        <ArticleAiFields
          defaultText={editing?.aiText}
          defaultImage={editing?.aiImage}
          defaultSourceName={editing?.sourceName}
          defaultSourceUrl={editing?.sourceUrl}
        />

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
