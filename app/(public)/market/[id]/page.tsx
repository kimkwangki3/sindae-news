import { notFound } from "next/navigation";
import Link from "next/link";
import Thumb from "@/components/Thumb";
import PhotoGallery from "@/components/PhotoGallery";
import ReportSheet from "@/components/ReportSheet";
import PostComments from "@/components/community/PostComments";
import PostOwnerControls from "@/components/community/PostOwnerControls";
import { getCurrentUser } from "@/lib/auth";
import { deleteMarketPost } from "@/lib/community-actions";
import {
  getMarketPost,
  getMarketComments,
  MARKET_CAT_NAME,
} from "@/lib/mock/community";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const p = await getMarketPost(params.id);
  return { title: p ? `${p.title} · 나눔마켓` : "나눔마켓 · 신대신문" };
}

export default async function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await getMarketPost(params.id);
  if (!post) notFound();

  const [user, comments] = await Promise.all([
    getCurrentUser(),
    getMarketComments(post.id),
  ]);

  return (
    <div className="px-[18px] pb-10">
      <div className="flex items-center justify-between py-3">
        <Link href="/market" className="text-sm text-muted">
          ‹ 나눔마켓
        </Link>
        {post.mine && (
          <PostOwnerControls
            editHref={`/market/write?id=${post.id}`}
            deleteAction={deleteMarketPost.bind(null, post.id)}
          />
        )}
      </div>

      {post.photos.length > 0 ? (
        <PhotoGallery photos={post.photos} alt={post.title} />
      ) : (
        <Thumb
          className="h-[220px] w-full"
          rounded="rounded-card"
          alt={post.title}
        />
      )}

      <div className="mt-3 flex items-center gap-1.5">
        <span className="rounded-full bg-tag-org-bg px-2 py-0.5 text-[11px] font-bold text-tag-org-fg">
          {MARKET_CAT_NAME[post.category]}
        </span>
        {post.pinned && (
          <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[11px] font-bold text-rose">
            📌 고정
          </span>
        )}
      </div>

      <h1 className="mt-2 text-[21px] font-extrabold leading-snug">
        {post.title}
      </h1>

      <div className="mt-3 flex items-center gap-2.5 border-b border-line pb-4">
        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-rose" />
        <div className="text-[13px]">
          <p className="font-bold">{post.author}</p>
          <p className="text-[11px] text-muted">
            {post.neighborhood} · {post.createdAt}
          </p>
        </div>
        <span className="ml-auto text-[13px] text-muted">🤍 {post.likeCount}</span>
      </div>

      <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.85]">
        {post.body}
      </p>

      <div className="mt-5 flex justify-center">
        <ReportSheet
          targetType="market_post"
          targetId={post.id}
          targetLabel={post.title}
          triggerClassName="text-xs text-muted underline"
          triggerLabel="🚩 이 게시글 신고하기"
        />
      </div>

      <PostComments
        postType="market"
        postId={post.id}
        initial={comments}
        isLoggedIn={user !== null}
        commentReportType="market_post"
      />
    </div>
  );
}
