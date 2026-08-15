import Link from "next/link";
import { saveSurvey } from "@/lib/survey-actions";
import type { AdminSurvey } from "@/lib/mock/admin-surveys";
import { MAX_OPTIONS, SURVEY_FORBIDDEN_TOPICS } from "@/lib/surveys";

// 설문 만들기·고치기.
//
// 보기 칸은 처음부터 여섯 개를 펼쳐 둔다. '추가' 버튼을 두면 클라이언트
// 컴포넌트가 되는데, 이 화면은 자바스크립트 없이도 되는 일이라 그럴 이유가 없다.
// 빈 칸은 저장할 때 버려진다.

const FIELD =
  "min-h-[44px] w-full rounded-element border border-line bg-white px-3 text-[17px] outline-none focus:border-rose";
const LABEL = "text-[17px] font-bold";

// timestamptz → datetime-local 입력칸이 읽는 한국시 문자열.
function toKstInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}

export default function SurveyForm({ survey }: { survey?: AdminSurvey }) {
  const labels = survey?.options.map((o) => o.label) ?? [];

  return (
    <form action={saveSurvey} className="flex flex-col gap-4">
      {survey && <input type="hidden" name="id" value={survey.id} />}

      {/* 법적 경고 — 관리자가 끌 수 없게 코드에 박아 둔다.
          이 두 가지는 실수하면 매체가 법정에 선다. */}
      <div className="rounded-card border border-rose bg-rose-soft p-3.5">
        <p className="text-[17px] font-bold text-rose-deep">
          ⚠️ 아래 주제는 등록할 수 없습니다
        </p>
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-[16px] leading-relaxed">
          {SURVEY_FORBIDDEN_TOPICS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>제목</span>
        <input
          name="title"
          required
          minLength={5}
          maxLength={100}
          defaultValue={survey?.title ?? ""}
          placeholder="신대지구에서 가장 불편한 것은 무엇입니까?"
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>설명 (선택)</span>
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={survey?.description ?? ""}
          placeholder="무엇을 왜 묻는지 한두 줄로 적습니다."
          className={`${FIELD} py-2`}
        />
      </label>

      {!survey && (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>주소 (선택)</span>
          <input
            name="slug"
            maxLength={60}
            placeholder="sindae-inconvenience — 비우면 자동 생성"
            className={FIELD}
          />
          <span className="text-[16px] text-muted">
            영문·숫자·붙임표만. 한 번 정하면 바꾸지 않습니다(나눠둔 링크가
            죽습니다).
          </span>
        </label>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className={LABEL}>보기 (2~{MAX_OPTIONS}개)</legend>
        {Array.from({ length: MAX_OPTIONS }, (_, i) => (
          <input
            key={i}
            name="option"
            maxLength={40}
            defaultValue={labels[i] ?? ""}
            placeholder={`보기 ${i + 1}${i < 2 ? " (필수)" : ""}`}
            className={FIELD}
          />
        ))}
        {survey && survey.totalVotes > 0 && (
          <span className="text-[16px] text-muted">
            이미 표를 받은 보기는 비워도 지워지지 않습니다 — 지우면 그 표까지
            사라져 총계가 어긋납니다.
          </span>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className={LABEL}>물어볼 항목 (선택 응답)</span>
        <label className="flex min-h-[44px] items-center gap-2 text-[17px]">
          <input
            type="checkbox"
            name="collect_district"
            defaultChecked={survey?.collectDistrict ?? true}
            className="h-5 w-5 accent-rose-deep"
          />
          거주 지역
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-[17px]">
          <input
            type="checkbox"
            name="collect_age_band"
            defaultChecked={survey?.collectAgeBand ?? true}
            className="h-5 w-5 accent-rose-deep"
          />
          연령대
        </label>
        <span className="text-[16px] text-muted">
          이름·연락처·주소는 어떤 경우에도 묻지 않습니다.
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>결과 공개</span>
        <select
          name="result_visibility"
          defaultValue={survey?.resultVisibility ?? "immediate"}
          className={FIELD}
        >
          <option value="immediate">바로 공개 — 참여하면 그 자리에서 본다</option>
          <option value="after_close">
            마감 후 공개 — 앞선 결과가 뒤 참여자에게 영향을 주지 않는다
          </option>
        </select>
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={LABEL}>시작 (선택)</span>
          <input
            type="datetime-local"
            name="starts_at"
            defaultValue={toKstInput(survey?.startsAt ?? null)}
            className={FIELD}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={LABEL}>마감 (선택)</span>
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={toKstInput(survey?.endsAt ?? null)}
            className={FIELD}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>상태</span>
        <select
          name="status"
          defaultValue={survey?.status ?? "draft"}
          className={FIELD}
        >
          <option value="draft">초안 — 아무에게도 보이지 않음</option>
          <option value="open">진행 — 주민이 참여할 수 있음</option>
          <option value="closed">종료 — 결과만 보임</option>
        </select>
      </label>

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="min-h-[48px] flex-1 rounded-element bg-rose-deep text-[18px] font-bold text-white"
        >
          저장
        </button>
        <Link
          href="/admin/surveys"
          className="flex min-h-[48px] items-center rounded-element border border-line bg-white px-4 text-[17px] text-muted"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
