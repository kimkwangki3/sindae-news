"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { demoLogin } from "@/lib/auth-actions";
import { DEMO_PERSONA_KEYS, DEMO_PERSONAS } from "@/lib/mock/auth";

// 로그인 패널. demo=true(.env 미설정)면 페르소나 데모 로그인, 아니면 실제 카카오 OAuth.
export default function LoginPanel({ demo }: { demo: boolean }) {
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
      <h1 className="text-2xl text-rose-deep">신대신문</h1>
      <p className="mt-2 text-sm text-muted">
        신대지구 이웃들의 소식, 함께 나눠요
      </p>

      <div className="mt-9 w-full max-w-[320px]">
        {/* 실제 카카오 로그인 — Supabase Auth 연결 시 동작 */}
        <button
          type="button"
          onClick={kakao}
          disabled={demo}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-element bg-[#FEE500] text-[15px] font-bold text-[#3C1E1E] disabled:opacity-50"
        >
          <span aria-hidden>💬</span> 카카오로 시작하기
        </button>
        {kakaoError && (
          <p className="mt-2 text-xs text-rose">{kakaoError}</p>
        )}

        {demo && (
          <div className="mt-7 rounded-card border border-line bg-white p-4 text-left">
            <p className="text-[13px] font-bold text-rose-deep">
              데모 로그인
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
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
                    <span className="text-[13px] font-bold text-ink">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-muted">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-8 max-w-[300px] text-[11px] leading-relaxed text-muted">
        로그인 시 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
      </p>
    </div>
  );
}
