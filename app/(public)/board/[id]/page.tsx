import { notFound } from "next/navigation";
import Link from "next/link";
import PhotoGallery from "@/components/PhotoGallery";
import PostBody from "@/components/PostBody";
import ReportSheet from "@/components/ReportSheet";
import PostComments from "@/components/community/PostComments";
import PostOwnerControls from "@/components/community/PostOwnerControls";
import BoardLike from "@/components/community/BoardLike";
import BoardViewTracker from "@/components/community/BoardViewTracker";
import { getCurrentUser } from "@/lib/auth";
import { deleteBoardPost } from "@/lib/community-actions";
import ShareButton from "@/components/ShareButton";
import {
  getBoardPost,
  getBoardComments,
  BOARD_CAT_NAME,
} from "@/lib/mock/community";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const p = await getBoardPost(params.id);
  if (!p) return { title: "자유게시판 · 해룡신문" };
  return {
    title: `${p.title} · 자유게시판`,
    alternates: { canonical: `/board/${params.id}` },
  };
}

export default async function BoardDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await getBoardPost(params.id);
  if (!post) notFound();

  const [user, comments] = await Promise.all([
    getCurrentUser(),
    getBoardComments(post.id),
  ]);

  return (
    <div className="px-[18px] pb-10">
      <BoardViewTracker postId={post.id} />
      <div className="flex items-center justify-between py-3">
        <Link href="/board" className="text-sm text-muted">
          ‹ 자유게시판
        </Link>
        {post.mine && (
          <PostOwnerControls
            editHref={`/board/write?id=${post.id}`}
            deleteAction={deleteBoardPost.bind(null, post.id)}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[16px] font-bold text-rose">
          {BOARD_CAT_NAME[post.category]}
        </span>
        {/* 단체 명의 글이면 해당 단체로 바로 갈 수 있게 */}
        {post.orgId && post.orgName && (
          <Link
            href={`/orgs/${post.orgId}`}
            className="inline-block rounded-full bg-tag-org-bg px-2.5 py-1 text-[16px] font-bold text-tag-org-fg"
          >
            🏛 {post.orgName}
          </Link>
        )}
      </div>
      <h1 className="mt-2.5 text-[26px] font-extrabold leading-snug">
        {post.title}
      </h1>
      <p className="mt-2 text-xs text-muted">
        {post.author} · {post.createdAt} · 👁 {post.viewCount.toLocaleString()}
      </p>

      {/* 본문 — 블록으로 쓴 글은 사진이 본문 안에 순서대로 들어 있다.
          그래서 아래 갤러리를 함께 띄우면 같은 사진이 두 번 나온다.
          예전 글(body_format='text')은 지금까지와 똑같이 본문 + 갤러리다. */}
      {post.bodyBlocks ? (
        <div className="mt-5 border-t border-line pt-5">
          <PostBody blocks={post.bodyBlocks} alt={post.title} />
        </div>
      ) : (
        <>
          <p className="mt-5 whitespace-pre-line border-t border-line pt-5 text-[20px] leading-[1.85]">
            {post.body}
          </p>

          {post.photos.length > 0 && (
            <div className="mt-4">
              <PhotoGallery photos={post.photos} alt={post.title} />
            </div>
          )}
        </>
      )}

      <div className="my-6 flex items-center justify-center gap-3">
        <BoardLike
        postId={post.id}
        initialCount={post.likeCount}
        isLoggedIn={user !== null}
      />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <ShareButton title={post.title} label="글 공유" />
        <ReportSheet
          targetType="board_post"
          targetId={post.id}
          targetLabel={post.title}
        />
      </div>

      <PostComments
        postType="board"
        postId={post.id}
        initial={comments}
        isLoggedIn={user !== null}
        commentReportType="board_comment"
      />
    </div>
  );
}
