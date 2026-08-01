// 기사 작성 폼 공통 — 출처 표기 + AI 생성 고지. 관리자·기자 에디터 양쪽에서 쓴다.
// 여기서 넣은 값은 기사 상세 하단에 자동 노출된다(ArticleAiNotice / ArticleSource).

const INPUT =
  "min-h-[48px] w-full rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose";

export default function ArticleAiFields({
  defaultText = false,
  defaultImage = false,
  defaultSourceName = "",
  defaultSourceUrl = "",
}: {
  defaultText?: boolean;
  defaultImage?: boolean;
  defaultSourceName?: string;
  defaultSourceUrl?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="rounded-card border border-line bg-ivory-2 p-4">
        <legend className="px-1 text-[16px] font-bold">📎 출처 (선택)</legend>
        <p className="mt-1 text-[15px] leading-relaxed text-muted">
          보도자료·공공자료를 재구성한 기사는 출처를 밝혀야 합니다. 자체 취재
          기사는 비워 두세요.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <input
            name="source_name"
            defaultValue={defaultSourceName}
            placeholder="출처 기관 (예: 순천시청 보도자료)"
            className={INPUT}
          />
          <input
            name="source_url"
            type="url"
            defaultValue={defaultSourceUrl}
            placeholder="원문 링크 (https://…)"
            className={INPUT}
          />
        </div>
      </fieldset>

      <fieldset className="rounded-card border border-line bg-ivory-2 p-4">
        <legend className="px-1 text-[16px] font-bold">🤖 AI 생성 고지</legend>
        <p className="mt-1 text-[15px] leading-relaxed text-muted">
          해당하는 항목을 체크하면 기사 하단에 고지 문구가 표시됩니다. 생성형
          AI를 쓰고도 밝히지 않으면 독자 신뢰를 잃고 포털 제휴 심사에서도
          불리합니다.
        </p>
        <div className="mt-2 flex flex-col">
          <Check name="ai_text" defaultChecked={defaultText}>
            본문을 AI로 작성·생성했습니다
          </Check>
          <Check name="ai_image" defaultChecked={defaultImage}>
            대표 이미지를 AI로 생성했습니다
          </Check>
        </div>
      </fieldset>
    </div>
  );
}

function Check({
  name,
  defaultChecked,
  children,
}: {
  name: string;
  defaultChecked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[16px]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-[18px] w-[18px] shrink-0 accent-rose-deep"
      />
      {children}
    </label>
  );
}
