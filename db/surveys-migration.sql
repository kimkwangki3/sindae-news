-- =====================================================================
--  해룡신문 — 주민 의견 조사(설문)
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  왜 이렇게 만드는가
--   * 이 기능의 존재 이유는 조작 방지다. 조작된 숫자를 기사로 내보내면
--     매체 신뢰가 무너진다. 그래서 화면이 아니라 여기서 전부 판정한다.
--     화면은 언제든 우회된다 — 개발자도구로 API를 직접 부르면 그만이다.
--   * 투표는 테이블에 직접 INSERT 하지 못한다. survey_votes 에는 INSERT
--     정책을 '만들지 않는다'. 정책이 없으면 차단이고, security definer 로
--     선언한 cast_survey_vote() 만 통과한다. 그게 설계 의도다.
--   * 1인 1표의 최종 방어선은 코드가 아니라 UNIQUE 인덱스다. 함수가 뚫려도
--     DB가 두 번째 표를 거부한다.
--
--  용어 — 코드·화면 어디에도 '여론조사'를 쓰지 않는다.
--  공직선거법상 규제 용어라서다. 테이블은 surveys, 화면 문구는 '주민 의견 조사'.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------

create table if not exists surveys (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  description    text,
  status         text not null default 'draft'
                   check (status in ('draft','open','closed')),
  starts_at      timestamptz,
  ends_at        timestamptz,

  -- 결과를 언제 보여줄지. 설문마다 발행인이 고른다.
  --   immediate   투표 직후 바로 — 참여 동기가 크고 공유가 잘 된다
  --   after_close 종료 후에만  — 앞선 결과가 뒤 참여자에게 영향을 주지 않는다
  result_visibility text not null default 'immediate'
                   check (result_visibility in ('immediate','after_close')),

  -- 참여자에게 물을 항목. 교차 분석의 재료가 되지만 물을수록 응답이 줄어든다.
  collect_district boolean not null default true,
  collect_age_band boolean not null default false,

  -- 비정규화 집계. 목록마다 votes 를 세면 화면이 느려지고, 무엇보다
  -- 집계를 위해 개별 투표를 읽을 권한을 열어야 한다. 그건 열지 않는다.
  total_votes    int not null default 0,

  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint surveys_valid_period
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists surveys_status_idx on surveys(status, ends_at desc);

create table if not exists survey_options (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid not null references surveys(id) on delete cascade,
  label       text not null,
  sort_order  int  not null default 0,
  vote_count  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists survey_options_survey_idx
  on survey_options(survey_id, sort_order);

create table if not exists survey_votes (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid not null references surveys(id) on delete cascade,
  option_id   uuid not null references survey_options(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  district    text,                 -- survey_district_ok() 가 허용한 값만
  age_band    text,
  ip_hash     text,                 -- 원본 IP는 저장하지 않는다. 해시만
  created_at  timestamptz not null default now()
);

-- ★ 1인 1표의 최종 방어선. 함수가 뚫려도 여기서 막힌다.
create unique index if not exists survey_votes_one_per_user
  on survey_votes(survey_id, user_id);

create index if not exists survey_votes_option_idx on survey_votes(option_id);
-- 이상 징후(같은 회선에서 여러 계정) 조회용
create index if not exists survey_votes_ip_idx
  on survey_votes(survey_id, ip_hash);

-- ---------------------------------------------------------------------
-- 2. 허용값 — 화면과 글자까지 같아야 한다
-- ---------------------------------------------------------------------
-- 거주 지역은 lib/surveys.ts 의 SURVEY_DISTRICTS 와 글자까지 같아야 한다.
-- 한쪽을 고치면 반드시 다른 쪽도 고칠 것("신대지구" ≠ "신대").
--
-- 회원가입에 쓰는 lib/region.ts 의 REGIONS(다섯 갈래)와는 일부러 다르다.
-- 가입은 한 번 고르고 마는 값이라 자세해도 되지만, 설문은 답할 때마다 고르는
-- 값이라 길어지면 '선택 안 함'으로 넘어가 버린다. 세 갈래면 기사에 충분하다.
create or replace function survey_district_ok(v text) returns boolean as $$
  select v is null or v in ('신대지구','해룡면','그 외 지역');
$$ language sql immutable;

create or replace function survey_age_band_ok(v text) returns boolean as $$
  select v is null or v in
    ('10대','20대','30대','40대','50대','60대 이상');
$$ language sql immutable;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'survey_votes_district_chk') then
    alter table survey_votes add constraint survey_votes_district_chk
      check (survey_district_ok(district));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'survey_votes_age_band_chk') then
    alter table survey_votes add constraint survey_votes_age_band_chk
      check (survey_age_band_ok(age_band));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. 참여 자격
-- ---------------------------------------------------------------------
-- 1인 1표는 '계정 하나당 한 표'다. 계정을 여러 개 만들면 뚫린다. 기술로 100%
-- 막을 수 없으니 비용을 올려 실익을 없앤다.
--
-- 이 사이트는 카카오 OAuth 로만 로그인한다. 그래서 "이메일 인증 필수"를 글자
-- 그대로 넣으면 카카오가 이메일을 안 넘긴 계정이 전부 막힌다 — 주민 전원이
-- 참여 불가가 된다. 취지(계정을 함부로 못 늘리게)만 옮겨 이렇게 둔다.
--
--   ① 이메일이 있는 계정은 인증된 것만
--   ② 온보딩(닉네임·거주지역)을 마친 계정만   ← 실질적 방어선
--   ③ 정지·탈퇴 계정 제외
--
-- ②가 핵심이다. 표 하나를 늘리려면 카카오 계정을 새로 만들고 닉네임까지
-- 정해야 한다. 장난으로 하기엔 번거롭고, 작정하고 하면 어차피 못 막는다.
create or replace function survey_can_vote(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p
    join auth.users u on u.id = p.id
    where p.id = p_user
      and p.is_suspended = false
      and p.deleted_at is null
      and p.nickname_set_at is not null
      and (u.email is null or u.email_confirmed_at is not null)
  );
$$;

-- 이 함수는 cast_survey_vote 안에서만 쓴다. 밖에 열어두면 아무 회원 id나 넣어
-- "저 사람은 투표할 수 있는 계정인가"를 캐물을 수 있다.
revoke all on function survey_can_vote(uuid) from public;

-- ---------------------------------------------------------------------
-- 4. 투표 — 모든 검증을 한 트랜잭션 안에서
-- ---------------------------------------------------------------------
-- 클라이언트가 insert 를 직접 하면 아래를 막을 방법이 없다.
--   · 종료된 설문에 투표          · 다른 설문의 보기를 섞어 넣기
--   · 없는 보기 id                · 집계 카운트 어긋남
create or replace function cast_survey_vote(
  p_survey_id uuid,
  p_option_id uuid,
  p_district  text default null,
  p_age_band  text default null,
  p_ip_hash   text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := auth.uid();
  v_survey surveys%rowtype;
  v_exists boolean;
begin
  if v_user is null then
    return json_build_object('ok', false, 'code', 'UNAUTHENTICATED');
  end if;

  if not survey_can_vote(v_user) then
    return json_build_object('ok', false, 'code', 'ACCOUNT_NOT_ELIGIBLE');
  end if;

  -- 행 잠금 — 더블클릭·연타로 동시에 들어온 요청을 한 줄로 세운다.
  select * into v_survey from surveys where id = p_survey_id for update;
  if not found then
    return json_build_object('ok', false, 'code', 'SURVEY_NOT_FOUND');
  end if;

  -- 시간 판단은 전부 DB의 now() 로 한다. 클라이언트 시계는 믿지 않는다.
  if v_survey.status <> 'open' then
    return json_build_object('ok', false, 'code', 'SURVEY_NOT_OPEN');
  end if;
  if v_survey.starts_at is not null and now() < v_survey.starts_at then
    return json_build_object('ok', false, 'code', 'NOT_STARTED');
  end if;
  if v_survey.ends_at is not null and now() > v_survey.ends_at then
    return json_build_object('ok', false, 'code', 'ALREADY_ENDED');
  end if;

  -- ★ 보기가 '이 설문'의 것인지 확인한다. 가장 흔히 빠뜨리는 구멍이다.
  --   빠뜨리면 남의 설문 보기 id를 넣어 엉뚱한 집계를 올릴 수 있다.
  select exists (
    select 1 from survey_options
    where id = p_option_id and survey_id = p_survey_id
  ) into v_exists;
  if not v_exists then
    return json_build_object('ok', false, 'code', 'INVALID_OPTION');
  end if;

  -- 자유 입력값은 허용 목록으로만 통과시킨다(임의 문자열 저장 차단).
  if not survey_district_ok(p_district) then
    return json_build_object('ok', false, 'code', 'INVALID_DISTRICT');
  end if;
  if not survey_age_band_ok(p_age_band) then
    return json_build_object('ok', false, 'code', 'INVALID_AGE_BAND');
  end if;

  -- 안 물어본 항목은 받지도 않는다. 화면에 없는 값이 올라오는 것 자체가
  -- 비정상 요청이고, 수집 안 한다고 해놓고 저장하면 그건 거짓말이 된다.
  if not v_survey.collect_district then p_district := null; end if;
  if not v_survey.collect_age_band then p_age_band := null; end if;

  begin
    insert into survey_votes
      (survey_id, option_id, user_id, district, age_band, ip_hash)
    values
      (p_survey_id, p_option_id, v_user, p_district, p_age_band, p_ip_hash);
  exception when unique_violation then
    return json_build_object('ok', false, 'code', 'ALREADY_VOTED');
  end;

  update survey_options set vote_count = vote_count + 1 where id = p_option_id;
  update surveys
     set total_votes = total_votes + 1, updated_at = now()
   where id = p_survey_id;

  return json_build_object('ok', true, 'code', 'VOTED');
end;
$$;

-- 비로그인(anon)에는 실행 권한을 주지 않는다.
revoke all on function cast_survey_vote(uuid,uuid,text,text,text) from public;
grant execute on function cast_survey_vote(uuid,uuid,text,text,text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. 결과 조회 — 집계만 내보낸다
-- ---------------------------------------------------------------------
-- 개별 투표 레코드는 절대 내보내지 않는다. 참여자가 적을 때 개별 기록이
-- 보이면 누가 무엇에 투표했는지 추정된다.
--
-- '종료 후 공개' 설문의 가림막을 화면이 아니라 여기에 둔다. 화면에서만
-- 감추면 API를 직접 불러 진행 중 판세를 들여다볼 수 있다.
create or replace function get_survey_results(p_survey_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'survey_id',   s.id,
    'title',       s.title,
    'status',      s.status,
    'total_votes', s.total_votes,
    'options', (
      select coalesce(json_agg(
        json_build_object(
          'id',    o.id,
          'label', o.label,
          'count', o.vote_count,
          'ratio', case when s.total_votes = 0 then 0
                        else round(o.vote_count::numeric * 100 / s.total_votes, 1) end
        ) order by o.sort_order
      ), '[]'::json)
      from survey_options o where o.survey_id = s.id
    )
  )
  from surveys s
  where s.id = p_survey_id
    and s.status in ('open','closed')
    and (s.result_visibility = 'immediate' or s.status = 'closed');
$$;

grant execute on function get_survey_results(uuid) to anon, authenticated;

-- 내가 이미 투표했는지. 화면이 '참여하기'를 보일지 결과를 보일지 정하는 데 쓴다.
create or replace function get_my_vote(p_survey_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then json_build_object('voted', false)
    else coalesce(
      (select json_build_object('voted', true, 'option_id', v.option_id)
         from survey_votes v
        where v.survey_id = p_survey_id and v.user_id = auth.uid()),
      json_build_object('voted', false))
  end;
$$;

-- 비로그인에도 열어 둔다. auth.uid() 가 없으면 voted:false 만 돌려주므로
-- 새어 나갈 것이 없고, 막아 두면 설문 화면을 여는 모든 손님에게 권한 오류가
-- 한 번씩 난다.
grant execute on function get_my_vote(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. RLS — 최후의 방어선
-- ---------------------------------------------------------------------
-- 전제(db/rls.sql 과 동일): 관리자 화면·액션은 service_role 로 동작해 RLS를
-- 우회한다. 그래서 여기는 anon(비로그인)·authenticated(일반회원)만 다룬다.
alter table surveys        enable row level security;
alter table survey_options enable row level security;
alter table survey_votes   enable row level security;

drop policy if exists surveys_read       on surveys;
drop policy if exists survey_options_read on survey_options;
drop policy if exists survey_votes_read  on survey_votes;

-- 초안(draft)은 누구에게도 보이지 않는다. 관리자는 service_role 로 본다.
create policy surveys_read on surveys
  for select using (status in ('open','closed'));

create policy survey_options_read on survey_options
  for select using (
    exists (select 1 from surveys s
             where s.id = survey_id and s.status in ('open','closed'))
  );

-- 본인 투표만 읽는다. 남의 표는 조회 자체가 안 된다.
create policy survey_votes_read on survey_votes
  for select using (user_id = auth.uid());

-- ★ survey_votes 에 INSERT/UPDATE/DELETE 정책을 만들지 않는다.
--   정책이 없으면 차단이다. 투표는 cast_survey_vote() 로만 들어온다.
--   여기에 정책을 하나라도 추가하는 순간 1인 1표 설계가 무너진다.
--   surveys/survey_options 도 쓰기 정책이 없다 — 관리자만 service_role 로 쓴다.

-- ---------------------------------------------------------------------
-- 7. PostgREST 스키마 캐시 갱신 (안 하면 API가 "테이블 없음"으로 응답한다)
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
