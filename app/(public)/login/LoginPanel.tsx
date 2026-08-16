"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { demoLogin } from "@/lib/auth-actions";
import { DEMO_PERSONA_KEYS, DEMO_PERSONAS } from "@/lib/mock/auth";

// 로그인 패널. demo=true(.env 미설정)면 페르소나 데모 로그인, 아니면 실제 카카오 OAuth.
export default function LoginPanel({
  demo,
  failed = false,
}: {
  demo: boolean;
  failed?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [kakaoError, setKakaoError] = useState<string | null>(null);

  async function kakao() {
    setKakaoError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setKakaoError("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-7 text-center">
      <h1 className="text-2xl text-rose-deep">해룡신문</h1>
      <p className="mt-2 text-sm text-muted">
        해룡면 이웃들의 소식, 함께 나눠요
      </p>

      <div className="mt-9 w-full max-w-[320px]">
        {/* 실제 카카오 로그인 — Supabase Auth 연결 시 동작 */}
        <button
          type="button"
          onClick={kakao}
          disabled={demo}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-element bg-[#FEE500] text-[20px] font-bold text-[#3C1E1E] disabled:opacity-50"
        >
          <span aria-hidden>💬</span> 카카오로 시작하기
        </button>
        {kakaoError && (
          <p className="mt-2 text-xs text-rose">{kakaoError}</p>
        )}

        {/* 아이폰에서 카카오 로그인 창이 "접속 정보를 확인해 주세요"로 막히는
            일이 있다. 카카오가 로그인 도중 접속 주소가 바뀌면 가짜 접속으로
            보고 끊는 것인데, 아이클라우드 비공개 릴레이가 켜져 있으면 그렇게
            된다. 우리 쪽에서 고칠 수 있는 것이 아니라서, 무엇을 끄면 되는지
            알려주는 것이 우리가 할 수 있는 전부다. */}
        {(failed || kakaoError) && (
          <div className="mt-3 rounded-element border border-line bg-white p-3.5 text-left">
            <p className="text-[17px] font-bold text-rose-deep">
              로그인 창이 막히나요?
            </p>
            <p className="mt-1 text-[16px] leading-relaxed text-muted">
              카카오 화면에 &ldquo;접속 정보를 확인해 주세요&rdquo;가 뜨면
              아래를 꺼 보세요. 로그인 도중 접속 주소가 바뀌면 카카오가 연결을
              끊습니다.
            </p>
            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-[16px] leading-relaxed text-muted">
              <li>
                아이폰: 설정 → 맨 위 내 이름 → iCloud → <b>비공개 릴레이 끄기</b>
              </li>
              <li>VPN 앱을 쓰고 있다면 잠시 끄기</li>
              <li>와이파이와 데이터를 오가는 중이면 한쪽만 켜기</li>
            </ul>
          </div>
        )}

        {demo && (
          <div className="mt-7 rounded-card border border-line bg-white p-4 text-left">
            <p className="text-[18px] font-bold text-rose-deep">
              데모 로그인
            </p>
            <p className="mt-1 text-[16px] leading-relaxed text-muted">
              아직 Supabase·카카오가 연결되지 않았어요. 화면 미리보기를 위해
              아래 가상 계정으로 로그인할 수 있어요.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_PERSONA_KEYS.map((key) => {
                const p = DEMO_PERSONAS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => demoLogin(key))}
                    className="flex min-h-[56px] flex-col items-start justify-center rounded-element border border-line bg-ivory px-3 py-2 text-left disabled:opacity-50"
                  >
                    <span className="text-[18px] font-bold text-ink">
                      {p.label}
                    </span>
                    <span className="text-[15px] text-muted">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 동의를 구하는 문서는 눌러서 읽을 수 있어야 한다. 링크 없이 문구만
          두면 무엇에 동의하는지 확인할 방법이 없다. */}
      <p className="mt-8 max-w-[300px] text-[16px] leading-relaxed text-muted">
        로그인 시{" "}
        <Link href="/legal/terms" className="underline">
          서비스 이용약관
        </Link>{" "}
        및{" "}
        <Link href="/legal/privacy" className="underline">
          개인정보처리방침
        </Link>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}
