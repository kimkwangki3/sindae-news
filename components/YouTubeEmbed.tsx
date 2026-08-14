"use client";

import { useState } from "react";
import { youtubeThumb } from "@/lib/blocks";

// 본문 속 유튜브 영상 — 기사·게시판 공용.
//
// 처음에는 그림 한 장과 재생 단추만 그린다. 탭해야 유튜브 iframe을 붙인다.
// 유튜브 플레이어는 한 개당 1MB 가까운 스크립트를 끌어오는데, 영상이 두세 개
// 들어간 기사를 그대로 열면 데이터 요금제 독자에게 그 값을 다 물린다.
// 대부분의 독자는 기사만 읽고 지나간다 — 누른 사람만 내려받게 한다.
//
// 주소는 videoId로 우리가 조립한다(lib/blocks.ts의 youtubeId 주석 참고).
// youtube-nocookie.com 은 재생 전까지 추적 쿠키를 심지 않는 쪽 주소다.
export default function YouTubeEmbed({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  // autoplay=1 — 이미 한 번 눌렀는데 재생 단추를 또 누르게 하지 않는다.
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card bg-black">
      {playing ? (
        <iframe
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`${title} 재생`}
          className="group absolute inset-0 h-full w-full"
        >
          {/* 유튜브 섬네일은 next/image로 최적화할 여지가 없다(이미 규격 그림).
              hqdefault는 4:3이라 위아래 검은 띠가 있어 object-cover로 잘라낸다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youtubeThumb(videoId)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {/* 재생 삼각형. 터치 타깃은 68×48보다 크게 잡는다. */}
          <span className="absolute left-1/2 top-1/2 flex h-[56px] w-[80px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-element bg-black/70 text-[24px] text-white">
            ▶
          </span>
        </button>
      )}
    </div>
  );
}
