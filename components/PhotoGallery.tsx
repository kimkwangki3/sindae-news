import Image from "next/image";

// 업로드된 사진(공개 URL) 갤러리. 큰 사진 1장 + 나머지 썸네일 줄.
// 사진이 없으면 아무것도 렌더하지 않는다(호출부에서 자리표시 처리).
export default function PhotoGallery({
  photos,
  alt = "",
}: {
  photos: string[];
  alt?: string;
}) {
  if (!photos.length) return null;
  const [main, ...rest] = photos;
  return (
    <div>
      <div className="relative h-[240px] w-full overflow-hidden rounded-card bg-ivory-2">
        <Image
          src={main}
          alt={alt}
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
        />
      </div>
      {rest.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {rest.map((u) => (
            <div
              key={u}
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-thumb bg-ivory-2"
            >
              <Image src={u} alt="" fill sizes="64px" className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
