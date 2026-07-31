import Link from "next/link";
import { MEDIA } from "@/lib/media";

// 기사 상세 하단에 '무조건' 붙는 고지 묶음. 작성자가 매번 타이핑하지 않도록 자동 렌더링한다.
//  1) 출처 — 입력했을 때만
//  2) AI 생성 고지 — 체크했을 때만
//  3) 매체·저작권·정정보도·제보 — 항상
export default function ArticleAiNotice({
  aiText,
  aiImage,
  sourceName,
  sourceUrl,
}: {
  aiText: boolean;
  aiImage: boolean;
  sourceName: string | null;
  sourceUrl: string | null;
}) {
  const hasSource = Boolean(sourceName || sourceUrl);

  return (
    <div className="mt-6 flex flex-col gap-3">
      {hasSource && (
        <aside className="rounded-card border border-line bg-ivory-2 p-4 text-[12px] leading-relaxed">
          <p className="font-bold text-ink">📎 출처</p>
          <p className="mt-1.5 text-muted">
            {sourceName ?? "원문 자료"}
            {sourceUrl && (
              <>
                {" · "}
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="break-all underline"
                >
                  원문 보기
                </a>
              </>
            )}
          </p>
        </aside>
      )}

      {(aiText || aiImage) && (
        <aside className="rounded-card border border-line bg-ivory-2 p-4 text-[12px] leading-relaxed text-muted">
          <p className="font-bold text-ink">🤖 AI 생성 고지</p>
          {aiText && (
            <p className="mt-1.5">
              이 기사는 생성형 AI의 도움을 받아 작성했으며, 게재 전 편집인이
              사실관계를 확인했습니다. 보도 책임은 {MEDIA.name}에 있습니다.
            </p>
          )}
          {aiImage && (
            <p className="mt-1.5">
              대표 이미지는 생성형 AI로 만든 것으로, 실제 현장을 촬영한 사진이
              아닙니다.
            </p>
          )}
        </aside>
      )}

      {/* 항상 노출 — 저작권 + 정정보도 청구 창구(언론중재법) + 제보 */}
      <aside className="rounded-card border border-line bg-ivory-2 p-4 text-[11px] leading-relaxed text-muted">
        <p>
          ⓒ {MEDIA.name}({MEDIA.regNo}) · 무단전재 및 재배포 금지
        </p>
        <p className="mt-1.5">
          기사에 사실과 다른 내용이 있다면{" "}
          <Link href="/legal/correction" className="underline">
            정정보도를 청구
          </Link>
          하실 수 있습니다. 접수 {MEDIA.email}
        </p>
        <p className="mt-1.5">
          우리 동네 소식을 알고 계신가요?{" "}
          <Link href="/tips" className="underline">
            기사 제보하기
          </Link>
        </p>
      </aside>
    </div>
  );
}
