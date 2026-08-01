import Image from "next/image";

// 썸네일: 이미지가 있으면 lazy-load, 없으면 더스티로즈 그라데이션 자리표시.
export default function Thumb({
  src,
  alt = "",
  className = "",
  rounded = "rounded-thumb",
  // 목록 썸네일 기준값. 기사 상세처럼 가로 전체를 쓰는 곳은 100vw를 넘겨야
  // 작은 이미지를 받아 흐릿해지지 않는다.
  sizes = "(max-width: 480px) 40vw, 200px",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  rounded?: string;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden ${rounded} ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          loading="lazy"
          sizes={sizes}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-[#EFD9DE] to-[#D69AA8] text-[18px] text-white/60 ${rounded} ${className}`}
      aria-hidden
    >
      사진
    </div>
  );
}
