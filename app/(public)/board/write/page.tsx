import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createBoardPost, updateBoardPost } from "@/lib/community-actions";
import LoginRequired from "@/components/community/LoginRequired";
import ImageUpload from "@/components/ImageUpload";
import {
  BOARD_WRITE_CATS,
  BOARD_CAT_NAME,
  getBoardPost,
} from "@/lib/mock/community";

export const metadata = { title: "게시판 글쓰기 · 신대신문" };

export default async function BoardWritePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="글쓰기는 로그인 후 가능합니다" />;

  const editId = searchParams.id;
  const post = editId ? await getBoardPost(editId) : null;
  if (editId && (!post || !post.mine)) redirect("/board");

  const action =
    editId && post ? updateBoardPost.bind(null, editId) : createBoardPost;

  return (
    <div className="px-[18px] py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">
          {post ? "게시판 글 수정" : "게시판 글쓰기"}
        </h1>
        <Link href="/board" className="text-xs text-muted">
          ‹ 목록
        </Link>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-[13px] font-bold">분류</legend>
          <div className="flex gap-2">
            {BOARD_WRITE_CATS.map((c, idx) => (
              <label
                key={c}
                className="min-h-[40px] flex-1 cursor-pointer rounded-element border border-line bg-white text-center text-sm leading-[40px] has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  defaultChecked={post ? post.category === c : idx === 0}
                  className="sr-only"
                />
                {BOARD_CAT_NAME[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-[13px] font-bold">
            제목
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={post?.title ?? ""}
            placeholder="제목을 입력하세요"
            className="min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body" className="text-[13px] font-bold">
            내용
          </label>
          <textarea
            id="body"
            name="body"
            rows={8}
            defaultValue={post?.body ?? ""}
            placeholder="자유롭게 이야기해보세요"
            className="w-full resize-y rounded-element border border-line bg-white p-3.5 text-sm leading-relaxed outline-none focus:border-rose"
          />
        </div>

        <ImageUpload
          name="photos"
          bucket="board"
          label="사진 첨부 (최대 10장)"
          max={10}
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
