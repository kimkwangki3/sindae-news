"use client";

import { useEffect, useState } from "react";

// 공유 버튼 — 모바일에서는 기기 공유 시트(카카오톡·문자 등)를 띄우고,
// 지원하지 않으면 링크를 클립보드에 복사한다.
//
// 카카오 SDK를 붙이지 않은 이유: JS SDK를 쓰려면 도메인 등록과 스크립트 로딩이
// 필요한데, 기기 공유 시트가 이미 카카오톡을 포함하고 다른 앱까지 함께 지원한다.
//
// URL은 렌더 시점이 아니라 누를 때 window.location.href로 읽는다. 서버에서
// 절대 주소를 만들어 넘기지 않아도 되고, 쿼리(페이지 번호 등)까지 그대로 공유된다.
export default function ShareButton({
  title,
  text,
  label = "공유하기",
  className = "",
}: {
  title: string;
  text?: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied && !failed) return;
    const t = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2000);
    return () => clearTimeout(t);
  }, [copied, failed]);

  async function share() {
    const url = window.location.href;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // 사용자가 공유를 취소한 경우 — 아무것도 하지 않는다.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-live="polite"
      className={
        className ||
        "flex min-h-[44px] items-center gap-1.5 rounded-element border border-line bg-white px-4 text-[16px] font-bold text-ink"
      }
    >
      {copied ? "🔗 링크 복사됨" : failed ? "복사 실패" : `🔗 ${label}`}
    </button>
  );
}
