"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

// 기사 대표 사진.
//
// 예전에는 높이 210px 상자에 object-cover로 넣었다. 목록 썸네일과 같은 방식인데,
// 상세 화면에서는 이게 문제가 된다. 안내 포스터나 세로로 긴 사진을 올리면
// 정작 읽어야 할 부분이 잘려 나갔다. 그래서 상세에서는 원본 비율 그대로 두고,
// 탭하면 전체화면으로 크게 볼 수 있게 한다. (목록 썸네일은 줄 높이가 들쭉날쭉해지면
// 못 쓰기 때문에 그대로 정사각 크롭이다.)
//
// width/height는 자리를 미리 잡아두기 위한 값이다. 원격 이미지라 실제 크기를
// 미리 알 수 없어서 현재 올라오는 이미지 비율(4:3)을 기본값으로 뒀다. 다른 비율의
// 사진이라도 로드된 뒤에는 h-auto 가 실제 비율을 따라가므로 잘리지 않는다.
const PLACEHOLDER_W = 1448;
const PLACEHOLDER_H = 1086;

export default function ArticlePhoto({
  src,
  alt,
  priority = true,
}: {
  src: string;
  alt: string;
  // 대표 사진은 화면 맨 위라 먼저 받아야 한다(기본값). 본문 중간 사진까지
  // 전부 priority로 두면 서로 대역폭을 뺏어 첫 화면이 오히려 늦어진다.
  priority?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // 전체화면 동안 뒤 본문이 따라 움직이면 어디를 보고 있었는지 놓친다.
  // ESC로도 닫히게 한다 — 데스크톱에서 볼 때 닫기 버튼을 찾아 헤매지 않도록.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} — 사진 크게 보기`}
        className="block w-full overflow-hidden rounded-card"
      >
        <Image
          src={src}
          alt={alt}
          width={PLACEHOLDER_W}
          height={PLACEHOLDER_H}
          sizes="(max-width: 768px) 100vw, 720px"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="h-auto w-full"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          {/* 화면 안에 사진 전체가 들어오게 object-contain. 잘리는 곳이 없다. */}
          <Image
            src={src}
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
          <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/70">
            아무 곳이나 눌러 닫기
          </p>
        </div>
      )}
    </>
  );
}
