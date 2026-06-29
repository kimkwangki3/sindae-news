import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  createMarketPost,
  updateMarketPost,
} from "@/lib/community-actions";
import { getMarketPost } from "@/lib/mock/community";
import LoginRequired from "@/components/community/LoginRequired";
import ImageUpload from "@/components/ImageUpload";

export const metadata = { title: "나눔마켓 글쓰기 · 신대신문" };

const NEIGHBORHOODS = ["신대동", "중앙동", "덕암동", "기타"];

export default async function MarketWritePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="글쓰기는 로그인 후 가능합니다" />;

  // ?id= 가 있으면 수정 모드 — 본인 글만
  const editId = searchParams.id;
  const post = editId ? await getMarketPost(editId) : null;
  if (editId && (!post || !post.mine)) redirect("/market");

  const action =
    editId && post ? updateMarketPost.bind(null, editId) : createMarketPost;

  return (
    <div className="px-[18px] py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">
          {post ? "나눔마켓 글 수정" : "나눔마켓 글쓰기"}
        </h1>
        <Link href="/market" className="text-xs text-muted">
          ‹ 목록
        </Link>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-[13px] font-bold">분류</legend>
          <div className="flex gap-2">
            {[
              { v: "share", l: "나눔" },
              { v: "request", l: "요청" },
              { v: "done", l: "완료" },
            ].map((o, idx) => (
              <label
                key={o.v}
                className="min-h-[40px] flex-1 cursor-pointer rounded-element border border-line bg-white text-center text-sm leading-[40px] has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="category"
                  value={o.v}
                  defaultChecked={post ? post.category === o.v : idx === 0}
                  className="sr-only"
                />
                {o.l}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="제목">
          <input
            name="title"
            required
            defaultValue={post?.title ?? ""}
            placeholder="예) 아기 옷 나눔해요"
            className="min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
          />
        </Field>

        <Field label="동네">
          <select
            name="neighborhood"
            defaultValue={post?.neighborhood || NEIGHBORHOODS[0]}
            className="min-h-[48px] w-full rounded-element border border-line bg-white px-3 text-sm outline-none focus:border-rose"
          >
            {NEIGHBORHOODS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>

        <Field label="내용">
          <textarea
            name="body"
            rows={6}
            defaultValue={post?.body ?? ""}
            placeholder="물품 상태, 거래 방법 등을 적어주세요"
            className="w-full resize-y rounded-element border border-line bg-white p-3.5 text-sm leading-relaxed outline-none focus:border-rose"
          />
        </Field>

        <ImageUpload
          name="photos"
          bucket="market"
          label="사진 (최대 5장)"
          max={5}
          defaultUrls={post?.photos ?? []}
        />

        <button
          type="submit"
          className="mt-1 min-h-[52px] rounded-element bg-rose-deep text-sm font-bold text-white"
        >
          {post ? "수정 완료" : "등록하기"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold">{label}</label>
      {children}
    </div>
  );
}
