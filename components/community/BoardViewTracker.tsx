"use client";

import { useEffect, useRef } from "react";
import { trackBoardView } from "@/lib/community-actions";

// 게시글 조회수 — 상세 화면에 마운트되어 조회수를 1 올린다. 화면에는 아무것도 그리지 않는다.
// 개발 모드의 StrictMode 이중 마운트와 SPA 라우팅 재사용 모두에서 두 번 세지 않도록
// '어느 글을 이미 보냈는지'를 기억한다.
export default function BoardViewTracker({ postId }: { postId: string }) {
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    if (sentFor.current === postId) return;
    sentFor.current = postId;
    void trackBoardView(postId);
  }, [postId]);

  return null;
}
