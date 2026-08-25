"use client";

import { useEffect, useRef, useState } from "react";

// 공유 시트 — 페이스북 / 기기 공유(카카오톡·문자 등) / 링크 복사 중에서 고른다.
//
// 예전에는 버튼을 누르는 즉시 navigator.share(기기 공유 시트)만 띄웠다. 그런데
// 페이스북 앱은 안드로이드·iOS의 링크 공유 인텐트를 받지 않아 그 목록에 아예
// 나타나지 않는다. 페이스북은 sharer.php 라는 웹 주소로만 링크를 받으므로,
// 그 버튼을 따로 두지 않으면 페이스북 공유는 어떤 경우에도 되지 않는다.
// 카카오톡·문자는 기기 공유 시트가 그대로 처리하므로 그 경로는 남겨둔다.
//
// 주소는 렌더 시점이 아니라 열 때 window.location에서 읽는다. 서버에서 절대
// 주소를 만들어 넘기지 않아도 되고, 쿼리(페이지 번호 등)까지 그대로 공유된다.
// 해시(#comments 등)는 미리보기에 도움이 안 되고 페이스북이 무시하므로 뺀다.
function currentUrl() {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}`;
}

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
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // 클립보드가 막힌 환경(HTTPS가 아닌 주소로 접속한 경우 등)에서는 주소를
  // 직접 띄워 손으로 복사하게 한다. 예전에는 "복사 실패"만 뜨고 끝이었다.
  const [manual, setManual] = useState<string | null>(null);
  // 기기 공유 시트는 지원하는 기기에서만 보여준다. navigator는 서버 렌더에
  // 없으므로 마운트 후에 확인한다 — 렌더 중에 읽으면 hydration이 어긋난다.
  const [canDeviceShare, setCanDeviceShare] = useState(false);
  const manualRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCanDeviceShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // 복사 확인 문구를 잠깐 보여준 뒤 시트를 닫는다.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(close, 1200);
    return () => clearTimeout(t);
  }, [copied]);

  // 수동 복사 칸이 뜨면 주소를 미리 선택해 둔다 — 길게 눌러 지정할 필요 없이
  // 바로 복사할 수 있다.
  useEffect(() => {
    if (manual) manualRef.current?.select();
  }, [manual]);

  function close() {
    setOpen(false);
    setCopied(false);
    setManual(null);
  }

  function shareToFacebook() {
    const u = encodeURIComponent(currentUrl());
    // 팝업 차단기를 피하려면 클릭 처리 안에서 동기로 열어야 한다.
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      "_blank",
      "noopener,noreferrer",
    );
    close();
  }

  async function shareToDevice() {
    try {
      await navigator.share({ title, text, url: currentUrl() });
      close();
    } catch {
      // 사용자가 공유를 취소한 경우 — 시트를 열어둔 채 아무것도 하지 않는다.
    }
  }

  async function copyLink() {
    const url = currentUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setManual(url);
    }
  }

  const itemClass =
    "flex min-h-[52px] w-full items-center gap-3 rounded-element border border-line bg-white px-4 text-left text-sm font-bold text-ink";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "flex min-h-[44px] items-center gap-1.5 rounded-element border border-line bg-white px-4 text-[18px] font-bold text-ink"
        }
      >
        {`🔗 ${label}`}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="닫기"
            onClick={close}
            className="absolute inset-0 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="공유하기"
            className="relative z-10 w-full max-w-app rounded-t-card bg-white p-5 pb-7"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-rose-deep">공유하기</h2>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="min-h-[44px] px-2 text-lg text-muted"
              >
                ✕
              </button>
            </div>

            {copied ? (
              <p className="py-6 text-center text-sm">링크를 복사했어요.</p>
            ) : manual ? (
              <div className="py-2">
                <p className="mb-2 text-[18px]">
                  이 기기에서는 자동 복사가 막혀 있어요. 아래 주소를 직접
                  복사해 주세요.
                </p>
                <input
                  ref={manualRef}
                  readOnly
                  value={manual}
                  aria-label="공유 주소"
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-element border border-line bg-ivory p-3 text-xs text-ink outline-none"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={shareToFacebook}
                  className={itemClass}
                >
                  <span aria-hidden>📘</span> 페이스북에 공유
                </button>

                {canDeviceShare && (
                  <button
                    type="button"
                    onClick={shareToDevice}
                    className={itemClass}
                  >
                    <span aria-hidden>💬</span> 카카오톡·문자 등 다른 앱
                  </button>
                )}

                <button type="button" onClick={copyLink} className={itemClass}>
                  <span aria-hidden>🔗</span> 링크 복사
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
