import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { writePromo } from "@/lib/local-actions";
import LoginRequired from "@/components/community/LoginRequired";
import ImageUpload from "@/components/ImageUpload";

export const metadata = { title: "홍보 글쓰기 · 신대신문" };

const PROMO_CATS = ["이벤트", "신메뉴", "공지"];

export default async function PromoWritePage() {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="홍보 글쓰기는 로그인 후 가능합니다" />;

  // 승인된 본인 업체만(write_promo)
  if (!can(user, "write_promo")) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm leading-relaxed text-muted">
          홍보 글은 <b>승인된 업체</b>만 작성할 수 있어요.
          <br />
          먼저 업체를 등록하고 승인을 받아주세요.
        </p>
        <Link
          href="/district/business/register"
          className="flex min-h-[48px] items-center rounded-element bg-rose-deep px-6 text-sm font-bold text-white"
        >
          업체 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[18px] py-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">홍보 글쓰기</h1>
        <Link href="/district" className="text-xs text-muted">
          ‹ 상권
        </Link>
      </div>

      <div className="mb-4 rounded-element border border-tag-biz-bg bg-tag-biz-bg/40 p-3 text-[13px] text-tag-biz-fg">
        ⚠ 홍보 글은 게시 전 <b>관리자 승인</b>이 필요합니다.
      </div>

      <form action={writePromo} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">업체</span>
          <div className="min-h-[48px] rounded-element border border-line bg-ivory-2 px-3.5 text-sm leading-[48px]">
            🏪 {user.business?.name}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-[13px] font-bold">
            제목
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="예) 점심 특선 메뉴 출시"
            className="min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-bold">분류</legend>
          <div className="flex gap-2">
            {PROMO_CATS.map((c, idx) => (
              <label
                key={c}
                className="min-h-[40px] flex-1 cursor-pointer rounded-element border border-line bg-white text-center text-sm leading-[40px] has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  defaultChecked={idx === 0}
                  className="sr-only"
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body" className="text-[13px] font-bold">
            내용
          </label>
          <textarea
            id="body"
            name="body"
            rows={6}
            placeholder="홍보 내용을 적어주세요"
            className="w-full resize-y rounded-element border border-line bg-white p-3.5 text-sm leading-relaxed outline-none focus:border-rose"
          />
        </div>

        <ImageUpload
          name="photo_urls"
          bucket="business"
          label="사진 (최대 5장)"
          max={5}
        />

        <button
          type="submit"
          className="mt-1 min-h-[52px] rounded-element bg-rose-deep text-sm font-bold text-white"
        >
          승인 요청
        </button>
      </form>
    </div>
  );
}
