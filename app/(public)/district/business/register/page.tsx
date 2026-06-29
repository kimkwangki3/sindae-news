import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { registerBusiness } from "@/lib/local-actions";
import LoginRequired from "@/components/community/LoginRequired";
import ImageUpload from "@/components/ImageUpload";
import { BIZ_CAT_NAME, type BizCategory } from "@/lib/mock/district";

export const metadata = { title: "업체 등록 · 신대신문" };

const CATS = Object.entries(BIZ_CAT_NAME) as [BizCategory, string][];

export default async function BusinessRegisterPage() {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="업체 등록은 로그인 후 가능합니다" />;

  // 업체 1인 1개 — 이미 보유 시 안내
  if (user.business) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted">
          이미 등록한 업체가 있어요. <br />
          업체는 1인당 1개만 등록할 수 있습니다.
        </p>
        <p className="rounded-element bg-rose-soft px-3 py-1.5 text-sm font-bold text-rose">
          🏪 {user.business.name} ·{" "}
          {user.business.status === "approved" ? "승인됨" : "승인 대기"}
        </p>
        <Link href="/district" className="text-sm text-rose-deep">
          상권으로 돌아가기 ›
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[18px] py-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">업체 등록</h1>
        <Link href="/district" className="text-xs text-muted">
          ‹ 상권
        </Link>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        업체를 등록하고 승인받으면 상권 홍보 글을 올릴 수 있어요.
      </p>

      <form action={registerBusiness} className="flex flex-col gap-4">
        <Field label="업체명">
          <input name="name" required placeholder="예) 신대분식" className={INPUT} />
        </Field>
        <Field label="업종">
          <select name="category" className={INPUT}>
            {CATS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="주소">
          <input name="address" placeholder="순천시 신대지구 …" className={INPUT} />
        </Field>
        <Field label="전화번호">
          <input name="phone" placeholder="061-…" className={INPUT} />
        </Field>
        <Field label="사업자등록번호 (확인용·비공개)">
          <input name="biz_reg_no" placeholder="000-00-00000" className={INPUT} />
        </Field>
        <Field label="카카오톡 채널 (1:1 문의용·선택)">
          <input
            name="kakao_channel"
            placeholder="http://pf.kakao.com/_xxxxx"
            className={INPUT}
          />
        </Field>
        <Field label="운영시간">
          <div className="flex items-center gap-2">
            <input type="time" name="hours_open" defaultValue="09:00" className={INPUT} />
            <span className="text-muted">~</span>
            <input type="time" name="hours_close" defaultValue="21:00" className={INPUT} />
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="is_24h" className="h-auto w-auto" />
            24시간 영업
          </label>
        </Field>
        <ImageUpload
          name="photos"
          bucket="business"
          label="대표 이미지 / 매장 사진 (최대 5장)"
          max={5}
        />
        <Field label="업체 소개">
          <textarea
            name="intro"
            rows={4}
            placeholder="간단한 소개"
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

const INPUT =
  "min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose";

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
