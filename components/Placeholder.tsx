// Phase 0 자리표시 페이지. 각 Phase에서 실제 화면으로 교체.
export default function Placeholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-xl text-rose-deep">{title}</h1>
      <p className="text-sm text-muted">준비 중입니다 · {phase}</p>
    </div>
  );
}
