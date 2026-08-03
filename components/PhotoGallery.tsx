"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

// 업로드된 사진(공개 URL) 갤러리. 큰 사진 1장 + 썸네일 줄.
// 사진이 없으면 아무것도 렌더하지 않는다(호출부에서 자리표시 처리).
//
// 예전에는 서버 컴포넌트라 큰 사진이 항상 첫 장으로 고정이고 썸네일은 눌러도
// 아무 일도 없었다. 사진을 3장 올려도 사실상 1장만 볼 수 있었던 셈이다.
// 그래서 (1) 썸네일을 누르면 큰 사진이 바뀌고, (2) 큰 사진을 누르면 기사 사진과
// 똑같이 전체화면으로 열리며, 전체화면에서는 좌우 넘기기(스와이프·화살표)로
// 모든 사진을 볼 수 있게 했다.
//
// 큰 사진 상자는 240px 고정 크롭을 유지한다. 게시판 사진은 비율이 제각각이라
// 원본 비율로 두면 사진을 넘길 때마다 아래 본문이 위아래로 튄다. 잘려서 안 보이는
// 부분은 전체화면(object-contain)에서 온전히 볼 수 있다.
export default function PhotoGallery({
  photos,
  alt = "",
}: {
  photos: string[];
  alt?: string;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  // 스와이프 판정용 시작 좌표. 세로 스크롤과 헷갈리지 않게 X 이동량만 본다.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const count = photos.length;
  const close = useCallback(() => setOpen(false), []);
  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  // 전체화면 동안 뒤 본문이 따라 움직이면 어디를 보고 있었는지 놓친다.
  // ESC·좌우 화살표는 데스크톱에서 확인할 때를 위한 것.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open, close, go]);

  if (!count) return null;

  const current = photos[index] ?? photos[0];

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || count < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // 가로로 40px 이상, 그리고 세로 이동보다 확실히 클 때만 사진을 넘긴다.
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? 1 : -1);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          count > 1
            ? `${alt} — 사진 크게 보기 (${index + 1}/${count})`
            : `${alt} — 사진 크게 보기`
        }
        className="relative block h-[240px] w-full overflow-hidden rounded-card bg-ivory-2"
      >
        <Image
          src={current}
          alt={alt}
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
        />
        {count > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1 text-[14px] font-bold text-white">
            {index + 1} / {count}
          </span>
        )}
      </button>

      {count > 1 && (
        // 첫 장까지 모두 보여준다. 지금 어느 사진을 보고 있는지 알 수 있어야
        // "나머지는 어디 갔지?"가 안 생긴다.
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {photos.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}번째 사진 보기`}
              aria-current={i === index}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-thumb bg-ivory-2 ${
                i === index
                  ? "ring-2 ring-rose ring-offset-1"
                  : "opacity-70"
              }`}
            >
              <Image src={u} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        >
          {/* 화면 안에 사진 전체가 들어오게 object-contain. 잘리는 곳이 없다. */}
          <Image
            src={current}
            alt={alt}
            fill
            sizes="100vw"
            className="object-contain p-4"
          />

          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
          >
            ✕
          </button>

          {count > 1 && (
            <>
              {/* 스와이프를 모르는 사람도 있으니 좌우 버튼을 같이 둔다. */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="이전 사진"
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="다음 사진"
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
              >
                ›
              </button>
              <p className="absolute bottom-6 left-0 right-0 text-center text-sm font-bold text-white/90">
                {index + 1} / {count}
              </p>
            </>
          )}
          {count === 1 && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/70">
              아무 곳이나 눌러 닫기
            </p>
          )}
        </div>
      )}
    </div>
  );
}
