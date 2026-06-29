import { notFound } from "next/navigation";
import Link from "next/link";
import PhotoGallery from "@/components/PhotoGallery";
import ReportSheet from "@/components/ReportSheet";
import PostComments from "@/components/community/PostComments";
import PostOwnerControls from "@/components/community/PostOwnerControls";
import BoardLike from "@/components/community/BoardLike";
import { getCurrentUser } from "@/lib/auth";
import { deleteBoardPost } from "@/lib/community-actions";
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
  return { title: p ? `${p.title} · 자유게시판` : "자유게시판 · 신대신문" };
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

      <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[11px] font-bold text-rose">
        {BOARD_CAT_NAME[post.category]}
      </span>
      <h1 className="mt-2.5 text-[21px] font-extrabold leading-snug">
        {post.title}
      </h1>
      <p className="mt-2 text-xs text-muted">
        {post.author} · {post.createdAt} · 👁 {post.viewCount.toLocaleString()}
      </p>

      <p className="mt-5 whitespace-pre-line border-t border-line pt-5 text-[15px] leading-[1.85]">
        {post.body}
      </p>

      {post.photos.length > 0 && (
        <div className="mt-4">
          <PhotoGallery photos={post.photos} alt={post.title} />
        </div>
      )}

      <div className="my-6 flex items-center justify-center gap-3">
        <BoardLike
        postId={post.id}
        initialCount={post.likeCount}
        isLoggedIn={user !== null}
      />
      </div>

      <div className="flex justify-end">
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
