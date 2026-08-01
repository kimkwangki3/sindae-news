import { getAllInfoPages, fmtUpdated } from "@/lib/info";
import { saveInfoPage } from "@/lib/admin-content-actions";
import { PageHead } from "@/components/admin/ui";
import ImageUpload from "@/components/ImageUpload";

export const metadata = { title: "생활정보 · 관리자" };

const INPUT =
  "min-h-[44px] w-full rounded-element border border-line px-3 text-sm outline-none focus:border-rose";

// 생활정보 편집. 자동 갱신 대상은 2단계부터 스크립트가 본문을 덮어쓴다.
export default async function AdminInfoPage() {
  const pages = await getAllInfoPages();

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="생활정보"
        sub="계속 갱신되는 상시 정보. 내용을 채우고 공개를 켜세요"
      />
      <p className="mb-4 rounded-card border border-line bg-white p-3 text-[17px] leading-relaxed text-muted">
        본문은 빈 줄로 문단을 구분합니다. <b>공개</b>를 켜야 독자에게 보이고
        게시판 상단에도 뜹니다. 자동 갱신 표시가 붙은 항목은 나중에 자동으로
        내용이 채워지므로, 직접 쓰신 내용은 덮어쓰일 수 있습니다.
      </p>

      <div className="flex flex-col gap-6">
        {pages.map((p) => (
          <form
            key={p.slug}
            action={saveInfoPage}
            className="rounded-card border border-line bg-white p-4"
          >
            <input type="hidden" name="slug" value={p.slug} />

            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-rose-deep">
                {p.icon} {p.title}
              </h2>
              <span className="shrink-0 text-[16px] text-muted">
                {p.autoUpdated && "자동 갱신 · "}
                {fmtUpdated(p.updatedAt)}
              </span>
            </div>

            <input name="title" defaultValue={p.title} className={`${INPUT} mb-2`} />
            <input
              name="summary"
              defaultValue={p.summary ?? ""}
              placeholder="목록에 보일 한 줄 설명"
              className={`${INPUT} mb-2`}
            />
            <textarea
              name="body"
              rows={10}
              defaultValue={p.body ?? ""}
              placeholder={`${p.title} 내용을 입력하세요. 빈 줄로 문단을 나눕니다.`}
              className="w-full resize-y rounded-element border border-line p-3 text-sm leading-relaxed outline-none focus:border-rose"
            />

            {/* 요일표 같은 정리 이미지는 단톡방에서 계속 돌아다닌다.
                본문 맨 위에 표시되며 잘리지 않는다. */}
            <div className="mt-3">
              <ImageUpload
                name="image_url"
                bucket="board"
                label="대표 이미지 (선택)"
                hint="요일표처럼 한 장으로 정리된 그림을 넣으면 공유하기 좋습니다."
              />
              {p.imageUrl && (
                <p className="mt-1 text-[16px] text-muted">
                  현재 이미지가 등록돼 있습니다. 새로 올리면 교체됩니다.
                </p>
              )}
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                name="source_name"
                defaultValue={p.sourceName ?? ""}
                placeholder="출처 (예: 해룡면 행정복지센터)"
                className={INPUT}
              />
              <input
                name="source_url"
                defaultValue={p.sourceUrl ?? ""}
                placeholder="출처 링크 (선택)"
                className={INPUT}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[18px]">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={p.isPublished}
                  className="h-[18px] w-[18px] accent-rose-deep"
                />
                공개 {p.isPublished ? "" : "(현재 숨김)"}
              </label>
              <button
                type="submit"
                className="min-h-[40px] rounded-element bg-rose-deep px-4 text-xs font-bold text-white"
              >
                저장
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
