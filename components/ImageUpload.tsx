"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createUploadUrl } from "@/lib/upload-actions";

// 재사용 이미지 업로더(단일/다중).
// 파일 선택 → 서버액션으로 서명 URL 발급 → 브라우저가 Storage에 직접 업로드
// → public URL(들)을 hidden input(name)에 담아 폼이 그대로 제출하게 한다.
// max=1: 단일 URL 문자열, max>1: 줄바꿈(\n)으로 이어붙인 여러 URL.
export default function ImageUpload({
  name,
  bucket,
  label = "이미지",
  hint,
  max = 1,
  defaultUrls = [],
}: {
  name: string;
  bucket: string; // articles | board | market | business | org | ads
  label?: string;
  hint?: string;
  max?: number;
  defaultUrls?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(defaultUrls);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadOne(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있어요.");
      return null;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("파일이 너무 커요. 6MB 이하로 올려주세요.");
      return null;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const ticket = await createUploadUrl(bucket, ext);
    if (!ticket.ok || !ticket.path || !ticket.token) {
      setError(ticket.error ?? "업로드에 실패했어요.");
      return null;
    }
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(ticket.bucket!)
      .uploadToSignedUrl(ticket.path, ticket.token, file);
    if (upErr) {
      setError("업로드에 실패했어요. 다시 시도해 주세요.");
      return null;
    }
    return ticket.publicUrl ?? null;
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError("");
    setBusy(true);
    try {
      const room = max - urls.length;
      const picked = files.slice(0, Math.max(0, room));
      if (files.length > room) setError(`최대 ${max}장까지 올릴 수 있어요.`);
      const next: string[] = [];
      for (const f of picked) {
        const url = await uploadOne(f);
        if (url) next.push(url);
      }
      if (next.length) setUrls((prev) => [...prev, ...next]);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAt(i: number) {
    setUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  const full = urls.length >= max;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold">{label}</span>
      <input type="hidden" name={name} value={urls.join("\n")} />

      {urls.length > 0 && (
        <div className={max > 1 ? "grid grid-cols-3 gap-2" : ""}>
          {urls.map((u, i) => (
            <div
              key={u}
              className="relative overflow-hidden rounded-element border border-line bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt="미리보기"
                className={
                  max > 1
                    ? "aspect-square w-full object-cover"
                    : "max-h-56 w-full object-cover"
                }
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1.5 top-1.5 min-h-[32px] rounded-element bg-black/55 px-2.5 text-xs font-bold text-white"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {!full && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex h-24 items-center justify-center rounded-element border border-dashed border-line bg-white text-sm text-muted disabled:opacity-60"
        >
          {busy
            ? "업로드 중…"
            : `📷 ${label} 선택${max > 1 ? ` (${urls.length}/${max})` : ""}`}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={max > 1}
        onChange={onPick}
        className="hidden"
      />
      {hint && !error && <p className="text-[11px] text-muted">{hint}</p>}
      {error && <p className="text-[11px] text-rose-deep">{error}</p>}
    </div>
  );
}
