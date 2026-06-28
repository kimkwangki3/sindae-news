import Image from "next/image";

// 썸네일: 이미지가 있으면 lazy-load, 없으면 더스티로즈 그라데이션 자리표시.
export default function Thumb({
  src,
  alt = "",
  className = "",
  rounded = "rounded-thumb",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden ${rounded} ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          loading="lazy"
          sizes="(max-width: 480px) 40vw, 200px"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-[#EFD9DE] to-[#D69AA8] text-[13px] text-white/60 ${rounded} ${className}`}
      aria-hidden
    >
      사진
    </div>
  );
}
