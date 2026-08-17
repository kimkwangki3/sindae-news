import { Fragment } from "react";
import ArticlePhoto from "@/components/article/ArticlePhoto";
import linkify from "@/components/Linkify";
import ResultChart from "@/components/survey/ResultChart";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { colorClass, type Block } from "@/lib/blocks";
import { kstDate } from "@/lib/datetime";
import { buildResults } from "@/lib/surveys";

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
  midAd,
  midAdAfter = 4,
}: {
  blocks: Block[];
  alt?: string; // 사진 대체 텍스트의 바탕(보통 글 제목)
  className?: string;
  // 본문 중간에 끼울 것(지금은 광고). 넣을 자리가 없으면 그리지 않는다.
  midAd?: React.ReactNode;
  midAdAfter?: number; // 몇 번째 문단 뒤에 끼울지
}) {
  // 자리는 '문단'으로 센다. 블록으로 세면 안 된다 — 텍스트 블록 하나가
  // 문단 열넷을 품기도 한다(기사를 통째로 담은 블록이 흔하다). 실제로
  // 블록 수로 세던 동안, 문단 26개짜리 기사가 블록이 넷이라는 이유로
  // 광고를 받지 못하고 문단 23개짜리 기사는 블록이 일곱이라 받았다.
  const plan = planMidAd(blocks, midAd ? midAdAfter : 0);

  return (
    // min-w-0 + break-words — 주소나 긴 영문처럼 끊을 곳이 없는 글자가 와도
    // 칸 밖으로 밀어내지 않는다(밀려나면 화면 전체가 옆으로 스크롤된다).
    <div
      className={`flex min-w-0 flex-col gap-4 break-words text-[20px] leading-[1.85] ${className}`}
    >
      {blocks.map((b, i) => (
        <Fragment key={i}>
          {plan && plan.blockIndex === i && plan.splitAt === 0 && midAd}
          {renderBlock(b, i)}
          {plan && plan.blockIndex === i && plan.splitAt === null && midAd}
        </Fragment>
      ))}
    </div>
  );

  function renderBlock(b: Block, i: number) {
    {
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
                alt={
                  b.ai
                    ? `${alt ? `${alt} — ` : ""}AI로 생성한 이미지${b.caption ? ` — ${b.caption}` : ""}`
                    : b.caption
                      ? `${alt} — ${b.caption}`
                      : alt
                }
                priority={false}
              />
              {/* AI 그림은 설명이 없어도 표시를 낸다. 실제 현장 사진과 나란히
                  놓이는 자리라, 표시가 없으면 찍은 사진으로 읽힌다. */}
              {(b.caption || b.ai) && (
                <figcaption className="mt-1.5 text-[16px] text-muted">
                  {b.ai && (
                    <span className="mr-1.5 rounded-element border border-line bg-ivory-2 px-1.5 py-0.5 font-bold text-ink">
                      🤖 AI 생성 이미지
                    </span>
                  )}
                  {b.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        if (b.type === "chart") {
          // 기사에 실리는 그래프는 발행 시점에 뜬 집계다. 조사가 그 뒤에 더
          // 진행돼도 이 숫자는 움직이지 않는다 — 그래서 언제 뜬 것인지를
          // 그래프 아래에 반드시 적는다. 법이 요구하는 표기는 그래프 컴포넌트
          // 안에 박혀 있어 여기서 뺄 수 없다.
          return (
            <figure key={i}>
              <p className="text-[16px] font-bold text-muted">주민 의견 조사</p>
              <h2 className="mb-2 mt-0.5 text-[22px] font-extrabold leading-snug">
                {b.title}
              </h2>
              <ResultChart
                results={buildResults({
                  id: b.surveyId,
                  title: b.title,
                  status: "closed",
                  totalVotes: b.totalVotes,
                  options: b.options.map((o, n) => ({ id: String(n), ...o })),
                })}
                showStatus={false}
              />
              <figcaption className="mt-1.5 text-[16px] text-muted">
                {kstDate(b.capturedAt)} 집계 ·{" "}
                <a
                  href={`/surveys/${b.surveySlug}`}
                  className="underline underline-offset-2"
                >
                  조사 원문 보기
                </a>
              </figcaption>
            </figure>
          );
        }

        if (b.type === "video") {
          return (
            <figure key={i}>
              <YouTubeEmbed
                videoId={b.videoId}
                title={b.caption ? `${alt} — ${b.caption}` : alt || "영상"}
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

        // 광고가 이 블록 '안'에 들어가는 경우 — 문단 경계에서 갈라 그 사이에
        // 끼운다. 블록 사이에만 넣을 수 있게 두면, 기사를 통째로 담은 블록
        // 하나짜리 글에서는 광고가 맨 앞이나 맨 뒤로 밀려난다.
        if (plan && plan.blockIndex === i && plan.splitAt) {
          const paras = splitParagraphs(b.text);
          const head = paras.slice(0, plan.splitAt).join("\n\n");
          const tail = paras.slice(plan.splitAt).join("\n\n");
          return (
            <Fragment key={i}>
              <p className={`whitespace-pre-line ${color}`}>{linkify(head)}</p>
              {midAd}
              <p className={`whitespace-pre-line ${color}`}>{linkify(tail)}</p>
            </Fragment>
          );
        }

        // 한 문단 안의 줄바꿈은 그대로 살린다(주소·명단처럼 줄을 맞춰 쓴 경우).
        return (
          <p key={i} className={`whitespace-pre-line ${color}`}>
            {linkify(b.text)}
          </p>
        );
    }
  }
}

// 텍스트 블록 안의 문단 나누기. 빈 줄이 문단 경계다 — 한 문단 안의 줄바꿈은
// 주소나 명단처럼 줄을 맞춰 쓴 것이라 나누면 안 된다.
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// 소제목 줄인지. 이 신문의 기사는 본문 안에 ■ 로 소제목을 단다. 소제목과 그
// 아래 문단 사이에 광고가 끼면 소제목이 광고 제목처럼 읽힌다.
function isHeadingLine(p: string): boolean {
  return /^[■▶◆●□▣#]/.test(p.trim());
}

interface MidAdPlan {
  blockIndex: number;
  /** null이면 그 블록 뒤에, 0이면 앞에, 그 밖엔 블록 안 n번째 문단 뒤에. */
  splitAt: number | null;
}

/**
 * 본문 중간 광고를 몇 번째 문단 뒤에 넣을지 정한다.
 *
 * 짧은 글에는 넣지 않는다. 뒤에 남는 문단이 몇 개 없으면 '본문 중간'이
 * 아니라 그냥 글 끝이고, 그런 자리의 광고는 본문보다 커 보인다.
 */
function planMidAd(blocks: Block[], afterParagraph: number): MidAdPlan | null {
  if (afterParagraph <= 0) return null;
  // 광고 뒤에 최소한 이만큼은 남아야 한다. 둘이면 대개 500자 안팎이라
  // '아직 읽을 것이 남은 자리'가 된다. 하나만 남으면 그건 글 끝이다.
  const MIN_AFTER = 2;

  // 문단 수를 먼저 세어 전체 길이를 본다. 사진·그래프는 세지 않는다 —
  // 사진만 여럿인 글이 길어 보이는 착시를 만들지 않기 위해서다.
  const counts = blocks.map((b) =>
    b.type === "text" ? splitParagraphs(b.text).length : 0,
  );
  const total = counts.reduce((a, n) => a + n, 0);
  if (total < afterParagraph + MIN_AFTER) return null;

  let seen = 0;
  for (let i = 0; i < blocks.length; i++) {
    const n = counts[i];
    if (seen + n < afterParagraph) {
      seen += n;
      continue;
    }
    // 이 블록 안에서 경계를 넘는다.
    let at = afterParagraph - seen;
    const paras = blocks[i].type === "text" ? splitParagraphs((blocks[i] as { text: string }).text) : [];
    // 소제목 바로 뒤에서 자르지 않는다. 한 칸 앞으로 물린다.
    if (at > 0 && at <= paras.length && isHeadingLine(paras[at - 1] ?? "")) {
      at -= 1;
    }
    if (at <= 0) return { blockIndex: i, splitAt: 0 };
    if (at >= paras.length) return { blockIndex: i, splitAt: null };
    return { blockIndex: i, splitAt: at };
  }
  return null;
}
