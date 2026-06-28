import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { registerOrg } from "@/lib/local-actions";
import LoginRequired from "@/components/community/LoginRequired";
import { ORG_CAT_NAME, type OrgCategory } from "@/lib/mock/orgs";

export const metadata = { title: "지역단체 등록 · 신대신문" };

const CATS = Object.entries(ORG_CAT_NAME) as [OrgCategory, string][];
const INPUT =
  "min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose";

export default async function OrgRegisterPage() {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="단체 등록은 로그인 후 가능합니다" />;

  return (
    <div className="px-[18px] py-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">지역단체 등록</h1>
        <Link href="/orgs" className="text-xs text-muted">
          ‹ 단체
        </Link>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        우리 단체를 등록하고 승인받으면 소개 페이지와 소식 글을 운영할 수 있어요.
      </p>

      <form action={registerOrg} className="flex flex-col gap-4">
        <Field label="단체명">
          <input name="name" required placeholder="예) 신대동 주민자치회" className={INPUT} />
        </Field>
        <Field label="분류">
          <select name="category" className={INPUT}>
            {CATS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="대표자 / 직책">
          <input name="leader" placeholder="예) 홍길동 회장" className={INPUT} />
        </Field>
        <Field label="활동지역">
          <input name="region" placeholder="예) 순천시 신대지구" className={INPUT} />
        </Field>
        <Field label="문의 연락처">
          <input name="contact" placeholder="전화번호" className={INPUT} />
        </Field>
        <Field label="카카오톡 채널 (1:1 문의용·선택)">
          <input
            name="kakao_channel"
            placeholder="http://pf.kakao.com/_xxxxx"
            className={INPUT}
          />
        </Field>
        <Field label="가입 신청 받기">
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              name="accept_join"
              defaultChecked
              className="h-auto w-auto"
            />
            홈페이지에서 회원 가입 신청을 받습니다
          </label>
        </Field>
        <Field label="대표 이미지 / 활동 사진">
          <div className="flex h-24 items-center justify-center rounded-element border border-dashed border-line bg-white text-sm text-muted">
            📷 사진 업로드 (후속 연동)
          </div>
        </Field>
        <Field label="단체 소개">
          <textarea
            name="intro"
            rows={4}
            placeholder="단체 활동·목적 소개"
            className={`${INPUT} resize-y`}
          />
        </Field>

        <button
          type="submit"
          className="mt-1 min-h-[52px] rounded-element bg-rose-deep text-sm font-bold text-white"
        >
          등록 신청 (승인 대기)
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
