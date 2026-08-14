"use client";

import { useEffect, useRef, useState } from "react";
import {
  blocksToPlainText,
  colorClass,
  COLOR_CLASS,
  COLOR_LABEL,
  MAX_BLOCKS,
  MAX_CAPTION_LEN,
  MAX_TEXT_LEN,
  youtubeId,
  youtubeThumb,
  type Block,
  type BlockColor,
  type TextStyle,
} from "@/lib/blocks";
import { uploadImage } from "@/lib/upload-client";

// 본문 블록 편집기 — 기사·게시판 공용.
//
// 문단마다 별도의 textarea를 쓴다. 편집 영역 하나에 서식을 섞는 방식
// (contenteditable)은 모바일에서 한글을 조합하는 도중 커서가 튀거나 글자가
// 빠지는 문제가 알려져 있어, 쓰던 글이 망가질 위험을 아예 만들지 않았다.
//
// 폼과의 연결은 기존 ImageUpload와 같은 방식이다. 편집 상태를 hidden input
// 두 개에 담아 보내므로 서버액션 폼 구조를 바꾸지 않아도 된다.
//   · {name}     → 블록 JSON
//   · {textName} → 블록에서 뽑은 순수 텍스트(기존 body 컬럼용, 폴백)
// 서버는 JSON을 그대로 믿지 않고 lib/blocks.ts에서 다시 검증한다.

type Item = { id: number; block: Block };

// 매번 새 객체를 만든다. 하나를 돌려쓰면 여러 칸이 같은 객체를 가리키게 되어,
// 나중에 누군가 블록을 직접 고치는 코드를 넣는 순간 엉뚱한 칸이 같이 바뀐다.
const emptyText = (): Block => ({ type: "text", text: "" });
// 주소를 붙여넣기 전의 빈 영상칸. videoId가 비어 있으면 저장 때 검증에서
// 걸러지므로(lib/blocks.ts), 빈 채로 남겨둬도 본문에는 나가지 않는다.
const emptyVideo = (): Block => ({ type: "video", videoId: "" });

const BTN =
  "min-h-[40px] rounded-element border border-line bg-white px-3 text-[16px] font-bold text-muted";

export default function BlockEditor({
  name,
  textName,
  bucket,
  palette,
  defaultBlocks = [],
  label = "본문",
  hint,
}: {
  name: string; // 블록 JSON을 담을 hidden input 이름
  textName: string; // 순수 텍스트를 담을 hidden input 이름
  bucket: string; // 사진 업로드 버킷 (articles | board | market …)
  palette: readonly BlockColor[]; // 노출할 색 목록. 1개면 색 UI를 숨긴다
  defaultBlocks?: Block[];
  label?: string;
  hint?: string;
}) {
  const nextId = useRef(0);
  const [items, setItems] = useState<Item[]>(() =>
    (defaultBlocks.length ? defaultBlocks : [emptyText()]).map((block) => ({
      id: nextId.current++,
      block,
    })),
  );
  // 지금 편집 중인 블록. 도구 모음을 이 블록에만 띄워 화면을 조용하게 유지한다.
  const [activeId, setActiveId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 사진을 어느 블록 '아래'에 넣을지. null이면 맨 끝.
  const insertAfter = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const blocks = items.map((it) => it.block);
  const full = items.length >= MAX_BLOCKS;

  function replaceAt(id: number, block: Block) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, block } : it)));
  }

  // afterId가 null이면 맨 끝에. 화면에 보이는 순서대로 끼워 넣는다.
  function insertInto(prev: Item[], item: Item, afterId: number | null) {
    if (afterId === null) return [...prev, item];
    const i = prev.findIndex((it) => it.id === afterId);
    if (i < 0) return [...prev, item];
    return [...prev.slice(0, i + 1), item, ...prev.slice(i + 1)];
  }

  function insert(block: Block, afterId: number | null) {
    if (items.length >= MAX_BLOCKS) {
      setError(`본문은 ${MAX_BLOCKS}칸까지 넣을 수 있어요.`);
      return;
    }
    const item = { id: nextId.current++, block };
    setItems((prev) => insertInto(prev, item, afterId));
    // 글·영상은 넣자마자 입력할 게 있다. 도구 모음을 함께 펼쳐준다.
    if (block.type === "text" || block.type === "video") setActiveId(item.id);
  }

  function removeAt(id: number) {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      // 전부 지우면 편집할 곳이 없어진다. 빈 문단 하나는 남긴다.
      return next.length
        ? next
        : [{ id: nextId.current++, block: emptyText() }];
    });
    setActiveId(null);
  }

  function move(id: number, delta: number) {
    setItems((prev) => {
      const i = prev.findIndex((it) => it.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function pickPhoto(afterId: number | null) {
    setError("");
    insertAfter.current = afterId;
    fileRef.current?.click();
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;

    setBusy(true);
    try {
      // 여러 장을 고르면 고른 순서대로 이어서 넣는다.
      // 방금 넣은 사진의 id를 다음 기준점으로 삼는다 — items는 아직 갱신되기
      // 전이라 그걸 보고 위치를 찾으면 순서가 뒤집힌다.
      let after = insertAfter.current;
      for (const file of files) {
        const { url, error: err } = await uploadImage(file, bucket);
        if (err || !url) {
          setError(err ?? "업로드에 실패했어요.");
          break;
        }
        const item: Item = {
          id: nextId.current++,
          block: { type: "image", url },
        };
        const anchor = after;
        setItems((prev) => insertInto(prev, item, anchor));
        after = item.id;
      }
    } finally {
      setBusy(false);
      insertAfter.current = null;
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[18px] font-bold">{label}</span>

      {/* 폼 제출용 — 서버는 이 JSON을 다시 검증한다 */}
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />
      <input type="hidden" name={textName} value={blocksToPlainText(blocks)} />

      <div className="flex flex-col gap-2">
        {items.map((it, idx) => {
          // 지역 상수로 받아둬야 아래 콜백들 안에서도 블록 종류가 유지된다.
          const block = it.block;
          const active = activeId === it.id;

          return (
            <div
              key={it.id}
              className={`rounded-element border bg-white p-2.5 ${
                active ? "border-rose" : "border-line"
              }`}
            >
              {block.type === "text" && (
                <AutoTextarea
                  value={block.text}
                  color={block.color}
                  textStyle={block.style}
                  onFocus={() => setActiveId(it.id)}
                  onChange={(text) => replaceAt(it.id, { ...block, text })}
                />
              )}

              {block.type === "image" && (
                <div>
                  {/* 편집 중 미리보기 — next/image의 크기 제약이 오히려 방해가 된다 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.url}
                    alt="본문 사진 미리보기"
                    onClick={() => setActiveId(it.id)}
                    className="w-full rounded-element"
                  />
                  <input
                    value={block.caption ?? ""}
                    maxLength={MAX_CAPTION_LEN}
                    onFocus={() => setActiveId(it.id)}
                    onChange={(e) =>
                      replaceAt(it.id, { ...block, caption: e.target.value })
                    }
                    placeholder="사진 설명 (선택)"
                    className="mt-1.5 min-h-[40px] w-full rounded-element border border-line px-3 text-[16px] outline-none focus:border-rose"
                  />
                </div>
              )}

              {block.type === "video" && (
                <VideoField
                  videoId={block.videoId}
                  caption={block.caption ?? ""}
                  onFocus={() => setActiveId(it.id)}
                  onVideoId={(videoId) => replaceAt(it.id, { ...block, videoId })}
                  onCaption={(caption) =>
                    replaceAt(it.id, { ...block, caption })
                  }
                />
              )}

              {block.type === "divider" && (
                <button
                  type="button"
                  onClick={() => setActiveId(it.id)}
                  className="flex w-full items-center justify-center py-2"
                  aria-label="구분선"
                >
                  <span className="h-px w-full bg-line" />
                </button>
              )}

              {active && (
                <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
                  {block.type === "text" && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {palette.length > 1 &&
                        palette.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => replaceAt(it.id, { ...block, color: c })}
                            aria-label={`${COLOR_LABEL[c]} 글자색`}
                            aria-pressed={(block.color ?? "ink") === c}
                            className={`min-h-[40px] rounded-element border px-3 text-[16px] font-bold ${
                              COLOR_CLASS[c]
                            } ${
                              (block.color ?? "ink") === c
                                ? "border-rose bg-rose-soft"
                                : "border-line bg-white"
                            }`}
                          >
                            {COLOR_LABEL[c]}
                          </button>
                        ))}
                      <select
                        value={block.style ?? "normal"}
                        onChange={(e) =>
                          replaceAt(it.id, {
                            ...block,
                            style: e.target.value as TextStyle,
                          })
                        }
                        aria-label="문단 종류"
                        className="min-h-[40px] rounded-element border border-line bg-white px-2 text-[16px]"
                      >
                        <option value="normal">본문</option>
                        <option value="heading">소제목</option>
                        <option value="quote">인용</option>
                      </select>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(it.id, -1)}
                      disabled={idx === 0}
                      aria-label="위로 옮기기"
                      className={`${BTN} disabled:opacity-40`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(it.id, 1)}
                      disabled={idx === items.length - 1}
                      aria-label="아래로 옮기기"
                      className={`${BTN} disabled:opacity-40`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAt(it.id)}
                      className={`${BTN} text-rose-deep`}
                    >
                      삭제
                    </button>
                    <span className="ml-auto flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => insert(emptyText(), it.id)}
                        disabled={full}
                        className={`${BTN} disabled:opacity-40`}
                      >
                        ＋문단
                      </button>
                      <button
                        type="button"
                        onClick={() => pickPhoto(it.id)}
                        disabled={busy || full}
                        className={`${BTN} disabled:opacity-40`}
                      >
                        📷사진
                      </button>
                      <button
                        type="button"
                        onClick={() => insert(emptyVideo(), it.id)}
                        disabled={full}
                        className={`${BTN} disabled:opacity-40`}
                      >
                        ▶영상
                      </button>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 맨 끝에 추가 */}
      <div className="mt-1 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => insert(emptyText(), null)}
          disabled={full}
          className={`${BTN} disabled:opacity-40`}
        >
          ＋ 문단
        </button>
        <button
          type="button"
          onClick={() => pickPhoto(null)}
          disabled={busy || full}
          className={`${BTN} disabled:opacity-40`}
        >
          {busy ? "업로드 중…" : "📷 사진"}
        </button>
        <button
          type="button"
          onClick={() => insert(emptyVideo(), null)}
          disabled={full}
          className={`${BTN} disabled:opacity-40`}
        >
          ▶ 영상
        </button>
        <button
          type="button"
          onClick={() => insert({ type: "divider" }, null)}
          disabled={full}
          className={`${BTN} disabled:opacity-40`}
        >
          ― 구분선
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={onFilePicked}
        className="hidden"
      />

      {hint && !error && <p className="text-[16px] text-muted">{hint}</p>}
      {error && <p className="text-[16px] text-rose-deep">{error}</p>}
    </div>
  );
}

// 유튜브 주소를 붙여넣는 칸.
//
// 편집기에서는 플레이어를 띄우지 않고 미리보기 그림만 보여준다. 글 쓰는 중에
// 영상이 재생될 이유가 없고, 영상마다 유튜브 스크립트를 끌어오면 편집 화면이
// 무거워진다. 대신 그림은 보여준다 — 엉뚱한 영상을 붙였는지는 저장 전에
// 눈으로 확인할 수 있어야 한다.
function VideoField({
  videoId,
  caption,
  onVideoId,
  onCaption,
  onFocus,
}: {
  videoId: string;
  caption: string;
  onVideoId: (id: string) => void;
  onCaption: (v: string) => void;
  onFocus: () => void;
}) {
  // 입력칸에는 사람이 친 그대로를 둔다. 블록에는 ID만 저장하므로, 여기까지
  // ID로 바꿔치기하면 주소를 붙여넣자마자 글자가 뒤바뀌어 당황하게 된다.
  const [raw, setRaw] = useState(() =>
    videoId ? `https://youtu.be/${videoId}` : "",
  );
  const bad = raw.trim().length > 0 && !videoId;

  return (
    <div>
      <input
        value={raw}
        inputMode="url"
        onFocus={onFocus}
        onChange={(e) => {
          setRaw(e.target.value);
          onVideoId(youtubeId(e.target.value) ?? "");
        }}
        placeholder="유튜브 주소 붙여넣기"
        aria-label="유튜브 주소"
        className={`min-h-[44px] w-full rounded-element border px-3 text-[16px] outline-none ${
          bad ? "border-rose-deep" : "border-line focus:border-rose"
        }`}
      />

      {videoId && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youtubeThumb(videoId)}
            alt="영상 미리보기"
            onClick={onFocus}
            className="mt-1.5 aspect-video w-full rounded-element bg-black object-cover"
          />
          <input
            value={caption}
            maxLength={MAX_CAPTION_LEN}
            onFocus={onFocus}
            onChange={(e) => onCaption(e.target.value)}
            placeholder="영상 설명 (선택)"
            className="mt-1.5 min-h-[40px] w-full rounded-element border border-line px-3 text-[16px] outline-none focus:border-rose"
          />
        </>
      )}

      {bad && (
        <p className="mt-1.5 text-[16px] text-rose-deep">
          유튜브 주소를 알아볼 수 없어요. 공유 → 링크 복사로 받은 주소를
          붙여넣어 주세요. (비워 두면 저장할 때 이 칸은 사라집니다)
        </p>
      )}
    </div>
  );
}

// 내용에 맞춰 높이가 늘어나는 입력칸. 문단이 길어질 때마다 스크롤바가 생기면
// 모바일에서 글 전체를 훑기 어렵다.
function AutoTextarea({
  value,
  color,
  textStyle,
  onChange,
  onFocus,
}: {
  value: string;
  color?: BlockColor;
  textStyle?: TextStyle;
  onChange: (v: string) => void;
  onFocus: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // 높이는 실제로 그려진 내용의 높이(scrollHeight)를 재야 정확하다. 줄 수로
  // 어림하면 자동 줄바꿈된 긴 문단에서 어긋난다. 보이는 모양을 정하는 값이
  // 아니라 실측값이라 여기서만 style을 직접 만진다.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const tone = colorClass(color);
  const size =
    textStyle === "heading"
      ? "text-[22px] font-extrabold"
      : textStyle === "quote"
        ? "text-[19px] italic"
        : "text-[19px]";

  return (
    <textarea
      ref={ref}
      value={value}
      maxLength={MAX_TEXT_LEN}
      rows={2}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder="내용을 입력하세요"
      className={`w-full resize-none overflow-hidden bg-transparent leading-[1.7] outline-none ${tone} ${size}`}
    />
  );
}
