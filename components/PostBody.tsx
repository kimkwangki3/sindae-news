import ArticlePhoto from "@/components/article/ArticlePhoto";
import linkify from "@/components/Linkify";
import { colorClass, type Block } from "@/lib/blocks";

// 블록 본문 렌더러 — 기사·게시판 공용.
//
// 저장된 값을 HTML로 해석하지 않는다. 블록 종류에 따라 우리가 미리 정해둔
// 태그와 클래스로만 그린다. 그래서 본문에 무엇이 들어 있든 스크립트나 스타일이
// 실행될 여지가 없다(dangerouslySetInnerHTML 을 쓰지 않는다).
//
// 글자 크기·줄간격은 기존 기사/게시판 본문과 같은 값을 기본으로 둔다.
export default function PostBody({
  blocks,
  alt = "",
  className = "",
}: {
  blocks: Block[];
  alt?: string; // 사진 대체 텍스트의 바탕(보통 글 제목)
  className?: string;
}) {
  return (
    // min-w-0 + break-words — 주소나 긴 영문처럼 끊을 곳이 없는 글자가 와도
    // 칸 밖으로 밀어내지 않는다(밀려나면 화면 전체가 옆으로 스크롤된다).
    <div
      className={`flex min-w-0 flex-col gap-4 break-words text-[20px] leading-[1.85] ${className}`}
    >
      {blocks.map((b, i) => {
        if (b.type === "divider") {
          return <hr key={i} className="my-2 border-line" />;
        }

        if (b.type === "image") {
          return (
            <figure key={i}>
              {/* 본문 사진도 대표 사진과 똑같이 탭하면 전체화면으로 열린다.
                  화면 아래쪽에 있으므로 미리 받지 않고 지연 로드한다. */}
              <ArticlePhoto
                src={b.url}
                alt={b.caption ? `${alt} — ${b.caption}` : alt}
                priority={false}
              />
              {b.caption && (
                <figcaption className="mt-1.5 text-[16px] text-muted">
                  {b.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        const color = colorClass(b.color);

        if (b.style === "heading") {
          return (
            <h2
              key={i}
              className={`mt-2 whitespace-pre-line text-[24px] font-extrabold leading-snug ${color}`}
            >
              {linkify(b.text)}
            </h2>
          );
        }

        if (b.style === "quote") {
          return (
            <blockquote
              key={i}
              className={`whitespace-pre-line border-l-4 border-line pl-4 ${color}`}
            >
              {linkify(b.text)}
            </blockquote>
          );
        }

        // 한 문단 안의 줄바꿈은 그대로 살린다(주소·명단처럼 줄을 맞춰 쓴 경우).
        return (
          <p key={i} className={`whitespace-pre-line ${color}`}>
            {linkify(b.text)}
          </p>
        );
      })}
    </div>
  );
}
