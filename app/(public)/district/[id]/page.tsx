import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Thumb from "@/components/Thumb";
import ReportSheet from "@/components/ReportSheet";
import { getCurrentUser } from "@/lib/auth";
import BusinessReviews from "@/components/district/BusinessReviews";
import ShareButton from "@/components/ShareButton";
import {
  getBusiness,
  getBusinessReviews,
  BIZ_CAT_NAME,
} from "@/lib/mock/district";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const b = await getBusiness(params.id);
  return { title: b ? `${b.name} · 해룡상권` : "해룡상권 · 해룡신문" };
}

export default async function StoreDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const store = await getBusiness(params.id);
  if (!store) notFound();

  const [user, reviews] = await Promise.all([
    getCurrentUser(),
    getBusinessReviews(params.id),
  ]);
  const myReview = reviews.find((r) => r.mine) ?? null;
  // 업체를 여러 개 소유할 수 있으므로 그중 이 가게가 있는지로 판단
  const isOwner = Boolean(
    user?.businesses.some((b) => b.status === "approved" && b.id === store.id),
  );

  return (
    <div className="px-[18px] pb-28">
      {/* 홍보 글쓰기 진입은 발행인 요청으로 숨김(2026-07-31).
          /district/promo/write 라우트와 권한 로직은 그대로 두어 되살리기 쉽게 한다. */}
      <div className="flex items-center justify-between py-3">
        <Link href="/district" className="text-sm text-muted">
          ‹ 해룡상권
        </Link>
      </div>

      {/* 갤러리 */}
      <div className="flex gap-2 overflow-x-auto">
        {store.photos.length > 0 ? (
          store.photos.map((u) => (
            <div
              key={u}
              className="relative h-[150px] w-[200px] flex-shrink-0 overflow-hidden rounded-card bg-ivory-2"
            >
              <Image
                src={u}
                alt={store.name}
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
          ))
        ) : (
          <Thumb
            alt={store.name}
            rounded="rounded-card"
            className="h-[150px] w-[200px] flex-shrink-0"
          />
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="rounded-full bg-ivory-2 px-2 py-0.5 text-[11px] font-bold text-muted">
          {BIZ_CAT_NAME[store.category]}
        </span>
        {store.isPromoted && (
          <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[11px] font-bold text-rose">
            홍보 등록업체
          </span>
        )}
      </div>
      <h1 className="mt-2 text-[22px] font-extrabold">{store.name}</h1>
      <p className="mt-1 text-[13px] text-muted">
        {store.reviewCount > 0 ? (
          <>
            <span className="font-bold text-rose">
              ★ {store.rating.toFixed(1)}
            </span>{" "}
            · 리뷰 {store.reviewCount}
          </>
        ) : (
          "아직 리뷰가 없습니다"
        )}
      </p>

      {/* 정보 */}
      <dl className="mt-4 flex flex-col gap-2.5 border-y border-line py-4 text-sm">
        <InfoRow k="영업시간" v={store.is24h ? "24시간 영업" : store.hours} />
        <InfoRow k="휴무일" v={store.closedDays} />
        <InfoRow k="전화" v={store.phone} />
        <InfoRow k="주소" v={store.address} />
      </dl>

      {/* 메뉴 */}
      {store.menus.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-base text-rose-deep">메뉴</h2>
          <ul className="flex flex-col">
            {store.menus.map((m) => (
              <li
                key={m.name}
                className="flex items-center gap-3 border-t border-line py-3 first:border-t-0"
              >
                <Thumb alt={m.name} className="h-12 w-12 flex-shrink-0" />
                <span className="flex-1 text-sm font-bold">
                  {m.name}
                  {m.popular && (
                    <span className="ml-1.5 text-[11px] font-normal text-rose">
                      가장 인기
                    </span>
                  )}
                </span>
                <span className="text-sm">{m.price.toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 홍보 소식 */}
      {store.promos.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-base text-rose-deep">홍보 소식</h2>
          {store.promos.map((p) => (
            <div
              key={p.id}
              className="mb-2 rounded-card border border-line bg-white p-4"
            >
              <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[10px] font-bold text-rose">
                {p.category}
              </span>
              <h5 className="mt-1.5 text-sm font-bold">{p.title}</h5>
              <p className="mt-1 text-[13px] text-muted">{p.body}</p>
              {p.photoUrls.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {p.photoUrls.map((u) => (
                    <div
                      key={u}
                      className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-thumb bg-ivory-2"
                    >
                      <Image src={u} alt="" fill sizes="96px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <BusinessReviews
        businessId={store.id}
        reviews={reviews}
        mine={myReview}
        loggedIn={Boolean(user)}
      />

      <div className="mt-6 flex items-center justify-between gap-2">
        <ShareButton title={store.name} text={store.intro} label="가게 공유" />
        <ReportSheet
          targetType="business"
          targetId={store.id}
          targetLabel={store.name}
          triggerClassName="text-xs text-muted underline"
          triggerLabel="🚩 이 업체 신고하기"
        />
      </div>

      {/* 하단 액션 바 — fixed로 두면 하단 탭바와 푸터를 덮는다.
          sticky + 탭바 높이만큼 띄워서 겹치지 않게 한다. */}
      <div className="sticky bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] z-20 -mx-[18px] mt-6 flex gap-2 border-t border-line bg-white p-3">
        <a
          href={`tel:${store.phone}`}
          className="flex min-h-[48px] flex-1 items-center justify-center rounded-element border border-line text-sm font-bold"
        >
          📞 전화하기
        </a>
        {store.kakaoChannel && (
          <a
            href={store.kakaoChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-element bg-[#FEE500] text-sm font-bold text-[#3C1E1E]"
          >
            💬 카톡 문의
          </a>
        )}
      </div>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 flex-shrink-0 text-muted">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}
