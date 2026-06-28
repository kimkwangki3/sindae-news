import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { writeOrgPost } from "@/lib/local-actions";
import LoginRequired from "@/components/community/LoginRequired";
import { getOrg } from "@/lib/mock/orgs";

export const metadata = { title: "단체 소식 글쓰기 · 지역단체" };

const POST_CATS = ["모집", "공지", "활동후기"];

export default async function OrgPostWritePage({
  params,
}: {
  params: { id: string };
}) {
  const org = await getOrg(params.id);
  if (!org) notFound();

  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="소식 글쓰기는 로그인 후 가능합니다" />;

  if (!can(user, "write_org_post", { orgId: org.id })) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm leading-relaxed text-muted">
          단체 소식은 <b>등록·승인된 단체의 운영진</b>만 작성할 수 있어요.
        </p>
        <Link href={`/orgs/${org.id}`} className="text-sm text-rose-deep">
          단체로 돌아가기 ›
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[18px] py-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">단체 소식 글쓰기</h1>
        <Link href={`/orgs/${org.id}`} className="text-xs text-muted">
          ‹ 단체
        </Link>
      </div>

      <div className="mb-4 rounded-element border border-tag-org-bg bg-tag-org-bg/40 p-3 text-[13px] text-tag-org-fg">
        ℹ <b>{org.name}</b> 운영진으로 소식을 작성합니다.
      </div>

      <form
        action={writeOrgPost.bind(null, org.id)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-[13px] font-bold">
            제목
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="예) 봄맞이 봉사 모집"
            className="min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-bold">분류</legend>
          <div className="flex gap-2">
            {POST_CATS.map((c, idx) => (
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
            placeholder="단체 소식을 적어주세요"
            className="w-full resize-y rounded-element border border-line bg-white p-3.5 text-sm leading-relaxed outline-none focus:border-rose"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold">사진 (최대 5장)</label>
          <div className="flex h-24 items-center justify-center rounded-element border border-dashed border-line bg-white text-sm text-muted">
            📷 사진 추가 (후속 연동)
          </div>
        </div>

        <button
          type="submit"
          className="mt-1 min-h-[52px] rounded-element bg-rose-deep text-sm font-bold text-white"
        >
          게시하기
        </button>
      </form>
    </div>
  );
}
