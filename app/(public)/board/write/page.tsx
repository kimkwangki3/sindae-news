import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createBoardPost, updateBoardPost } from "@/lib/community-actions";
import LoginRequired from "@/components/community/LoginRequired";
import BlockEditor from "@/components/BlockEditor";
import { BOARD_PALETTE, textToBlocks } from "@/lib/blocks";
import {
  BOARD_WRITE_CATS,
  BOARD_CAT_NAME,
  getBoardPost,
} from "@/lib/mock/community";

export const metadata = { title: "게시판 글쓰기 · 해룡신문" };

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
          <legend className="mb-2 text-[18px] font-bold">분류</legend>
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
          <label htmlFor="title" className="text-[18px] font-bold">
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

        {/* 내용 — 사진을 글 중간에 넣을 수 있다. 사진 첨부칸을 따로 두지 않는
            이유는, 두 군데서 사진을 넣게 되면 어느 쪽에 넣은 사진이 어디에
            나오는지 알 수 없기 때문이다.

            예전에 쓴 글을 열 때는 본문을 문단으로 쪼개고, 아래에 붙어 있던
            사진들을 그 뒤에 이어 붙인다. 이렇게 하지 않으면 편집기에 사진이
            안 보이고, 그대로 저장하는 순간 원래 있던 사진이 전부 사라진다. */}
        <BlockEditor
          name="body_blocks"
          textName="body"
          bucket="board"
          palette={BOARD_PALETTE}
          defaultBlocks={
            post?.bodyBlocks ?? [
              ...textToBlocks(post?.body ?? ""),
              ...(post?.photos ?? []).map((url) => ({
                type: "image" as const,
                url,
              })),
            ]
          }
          label="내용"
          hint="칸을 누르면 글자색·소제목·순서 바꾸기가 나옵니다. 사진은 원하는 문단 아래에 넣을 수 있어요."
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
