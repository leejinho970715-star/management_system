-- Schema contract generated from app/entities.js. Rebuild before applying the FIRST migration only.
create schema if not exists private;
create schema if not exists finance;
revoke all on schema private, finance from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema finance revoke all on tables from public, anon, authenticated;
create table private.entity_definitions (collection text primary key, definition jsonb not null);
revoke all on private.entity_definitions from public, anon, authenticated;
insert into private.entity_definitions values ('districts','{"table":"districts","title":"구역","group":"OR","fields":[{"key":"name","label":"구역명","type":"text","required":true},{"key":"leaderId","label":"구역장","type":"reference","ref":"members","required":false},{"key":"status","label":"상태","type":"select","values":["활동","비활성"],"required":true}]}'::jsonb);
insert into private.entity_definitions values ('regions','{"table":"regions","title":"지역","group":"OR","fields":[{"key":"name","label":"지역명","type":"text","required":true},{"key":"leaderId","label":"지역장","type":"reference","ref":"members","required":false},{"key":"status","label":"상태","type":"select","values":["활동","비활성"],"required":true}]}'::jsonb);
insert into private.entity_definitions values ('members','{"table":"members","title":"회원","group":"MB","fields":[{"key":"name","label":"이름","type":"text","required":true},{"key":"phone","label":"연락처","type":"tel","required":true},{"key":"district","label":"소속 구역","type":"reference","ref":"districts","required":true},{"key":"status","label":"회원 상태","type":"select","values":["활동","장기결석","이명","제적","사고처리"],"required":true},{"key":"birthday","label":"생년월일","type":"date","required":false},{"key":"address","label":"주소","type":"text","required":false},{"key":"consent","label":"정보 수집 동의 확인","type":"checkbox"},{"key":"consentAt","label":"동의 확인일","type":"date","required":true},{"key":"incidentAt","label":"사고처리일","type":"date","required":false},{"key":"reason","label":"변경 사유","type":"textarea","required":false}]}'::jsonb);
insert into private.entity_definitions values ('positions','{"table":"positions","title":"직책","group":"OR","fields":[{"key":"name","label":"직책명","type":"text","required":true},{"key":"scope","label":"적용 범위","type":"select","values":["지역","구역"],"required":true},{"key":"menus","label":"허용 메뉴","type":"text","required":true}]}'::jsonb);
insert into private.entity_definitions values ('accounts','{"table":"accounts","title":"계정","group":"SY","fields":[{"key":"email","label":"이메일","type":"email","required":true},{"key":"memberId","label":"연결 회원","type":"reference","ref":"members","required":false},{"key":"role","label":"역할","type":"select","values":["lead","district","evangelist","visitor","educator","finance","tf","admin"],"required":true},{"key":"district","label":"담당 구역","type":"districtScope","required":true},{"key":"status","label":"상태","type":"select","values":["활동","비활성"],"required":true},{"key":"enforceAssignments","label":"직책 메뉴 제한 적용","type":"checkbox"}],"managed":true}'::jsonb);
insert into private.entity_definitions values ('attendance','{"table":"attendance","title":"출결","group":"AT","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"year","label":"연도","type":"number","min":2020,"max":2100,"required":true},{"key":"week","label":"주차","type":"number","min":1,"max":54,"required":true},{"key":"service","label":"예배 유형","type":"text","required":true},{"key":"status","label":"출석 상태","type":"select","values":["출석","온라인","결석","사유결석"],"required":true},{"key":"reason","label":"결석 사유","type":"textarea","required":false}],"unique":["memberId","year","week","service"]}'::jsonb);
insert into private.entity_definitions values ('prospects','{"table":"prospects","title":"전도 대상자","group":"EV","fields":[{"key":"name","label":"이름","type":"text","required":true},{"key":"phone","label":"연락처","type":"tel"},{"key":"age","label":"연령대","type":"select","values":["20대","30대","40대","50대","60대 이상"],"required":true},{"key":"path","label":"만난 경로","type":"select","values":["지인 소개","모임","직장","기타"],"required":true},{"key":"guideId","label":"담당 인도자","type":"reference","ref":"members","required":true},{"key":"leaderId","label":"구역장","type":"reference","ref":"members","required":true},{"key":"stage","label":"단계","type":"select","values":["찾기","정파","상담","복음방","센터","입교","중단"],"required":true},{"key":"enteredAt","label":"단계 진입일","type":"date","required":true},{"key":"reason","label":"단계 변경 사유","type":"textarea","required":false},{"key":"note","label":"비고","type":"textarea","required":false},{"key":"lastContact","label":"최근 연락일","type":"date","required":false}]}'::jsonb);
insert into private.entity_definitions values ('contacts','{"table":"contacts","title":"접촉 기록","group":"EV","fields":[{"key":"prospectId","label":"대상자","type":"reference","ref":"prospects","required":true},{"key":"date","label":"접촉일","type":"date","required":true},{"key":"method","label":"방법","type":"select","values":["대면","전화","문자"],"required":true},{"key":"content","label":"내용","type":"textarea","required":true}]}'::jsonb);
insert into private.entity_definitions values ('stageHistory','{"table":"stage_history","title":"단계 이력","group":"EV","fields":[{"key":"prospectId","label":"대상자","type":"reference","ref":"prospects","required":true},{"key":"from","label":"이전 단계","type":"select","values":["찾기","정파","상담","복음방","센터","입교","중단"],"required":false},{"key":"to","label":"이후 단계","type":"select","values":["찾기","정파","상담","복음방","센터","입교","중단"],"required":true},{"key":"date","label":"변경일","type":"date","required":true},{"key":"reason","label":"사유","type":"textarea","required":true}],"managed":true}'::jsonb);
insert into private.entity_definitions values ('visits','{"table":"visits","title":"심방 기록","group":"VS","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"visitorId","label":"심방자","type":"reference","ref":"members","required":true},{"key":"date","label":"심방일","type":"date","required":true},{"key":"year","label":"연도","type":"number","min":2020,"max":2100,"required":true},{"key":"week","label":"주차","type":"number","min":1,"max":54,"required":true},{"key":"type","label":"심방 유형","type":"select","values":["전화","대면"],"required":true},{"key":"content","label":"내용","type":"textarea","required":true},{"key":"action","label":"후속조치","type":"text","required":false},{"key":"deadline","label":"완료 기한","type":"date","required":false},{"key":"status","label":"처리 상태","type":"select","values":["진행","완료"],"required":true},{"key":"sensitive","label":"민감 상담","type":"checkbox"},{"key":"completedAt","label":"완료일","type":"date","required":false}]}'::jsonb);
insert into private.entity_definitions values ('feedback','{"table":"feedback","title":"인원별 피드백","group":"AT","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"date","label":"작성일","type":"date","required":true},{"key":"content","label":"내용","type":"textarea","required":true}]}'::jsonb);
insert into private.entity_definitions values ('interviews','{"table":"interviews","title":"면담 요청","group":"VS","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"district","label":"소속 구역","type":"reference","ref":"districts","required":true},{"key":"target","label":"요청 대상","type":"select","values":["지역장","회장"],"required":true},{"key":"reason","label":"요청 사유","type":"textarea","required":true},{"key":"status","label":"처리 상태","type":"select","values":["요청","배정","일정확정","완료","취소"],"required":true},{"key":"requested","label":"요청일","type":"date","required":true},{"key":"assignee","label":"면담자","type":"select","values":["지역장","회장"],"required":false},{"key":"date","label":"면담일","type":"date","required":false},{"key":"result","label":"면담 결과","type":"textarea","required":false}]}'::jsonb);
insert into private.entity_definitions values ('cases','{"table":"absence_cases","title":"장기결석 후속조치","group":"AT","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"weeks","label":"연속 결석 주수","type":"number","min":1,"max":5400,"required":true},{"key":"ownerId","label":"담당자","type":"reference","ref":"members","required":false},{"key":"stage","label":"처리 단계","type":"select","values":["등재","배정","접촉","심방","단계향상","사고처리"],"required":true},{"key":"result","label":"처리 결과","type":"textarea","required":false},{"key":"closedAt","label":"종결일","type":"date","required":false}]}'::jsonb);
insert into private.entity_definitions values ('worship','{"table":"worship","title":"구역예배","group":"ED","fields":[{"key":"district","label":"소속 구역","type":"reference","ref":"districts","required":true},{"key":"year","label":"연도","type":"number","min":2020,"max":2100,"required":true},{"key":"week","label":"주차","type":"number","min":1,"max":54,"required":true},{"key":"conducted","label":"진행 여부","type":"checkbox"},{"key":"date","label":"진행일","type":"date","required":false},{"key":"count","label":"참석 인원","type":"number","min":0,"max":10000,"required":false},{"key":"title","label":"말씀 제목","type":"text","required":false},{"key":"note","label":"특이사항","type":"textarea","required":false}],"unique":["district","year","week"]}'::jsonb);
insert into private.entity_definitions values ('courses','{"table":"courses","title":"교육 과정","group":"ED","fields":[{"key":"name","label":"과정명","type":"text","required":true},{"key":"start","label":"시작일","type":"date","required":true},{"key":"end","label":"종료일","type":"date","required":true},{"key":"sessions","label":"총 회차","type":"number","min":1,"max":1000,"required":true},{"key":"status","label":"상태","type":"select","values":["진행","완료","비활성"],"required":true}]}'::jsonb);
insert into private.entity_definitions values ('courseAttendance','{"table":"course_attendance","title":"교육 참석","group":"ED","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"courseId","label":"교육 과정","type":"reference","ref":"courses","required":true},{"key":"session","label":"회차","type":"number","min":1,"max":1000,"required":true},{"key":"attended","label":"참석","type":"checkbox"},{"key":"date","label":"교육일","type":"date","required":false}],"unique":["memberId","courseId","session"]}'::jsonb);
insert into private.entity_definitions values ('exams','{"table":"exams","title":"시험","group":"ED","fields":[{"key":"name","label":"시험명","type":"text","required":true},{"key":"courseId","label":"교육 과정","type":"reference","ref":"courses","required":true},{"key":"date","label":"시행일","type":"date","required":true},{"key":"status","label":"상태","type":"select","values":["예정","완료","취소"],"required":true}]}'::jsonb);
insert into private.entity_definitions values ('examResults','{"table":"exam_results","title":"시험 결과","group":"ED","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"examId","label":"시험","type":"reference","ref":"exams","required":true},{"key":"attended","label":"응시","type":"checkbox"},{"key":"score","label":"점수","type":"number","min":0,"max":100,"required":false}],"unique":["memberId","examId"]}'::jsonb);
insert into private.entity_definitions values ('contributions','{"table":"contributions","title":"납부","group":"FN","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"kind","label":"납부 구분","type":"select","values":["십일조","회비","서포터즈"],"required":true},{"key":"month","label":"납부 연월","type":"month","required":true},{"key":"amount","label":"금액 (원)","type":"number","min":1,"max":100000000,"required":true},{"key":"date","label":"납부일","type":"date","required":true}],"schema":"finance","unique":["memberId","kind","month"]}'::jsonb);
insert into private.entity_definitions values ('reports','{"table":"reports","title":"주간보고","group":"WR","fields":[{"key":"district","label":"구역","type":"districtScope","required":true},{"key":"year","label":"연도","type":"number","min":2020,"max":2100,"required":true},{"key":"week","label":"주차","type":"number","min":1,"max":54,"required":true},{"key":"kind","label":"보고 종류","type":"select","values":["구역","lead","district","evangelist","visitor","educator","finance","tf","admin"],"required":true},{"key":"status","label":"상태","type":"select","values":["작성중","제출","확인"],"required":true},{"key":"opinion","label":"소견","type":"textarea","required":true},{"key":"note","label":"특이사항","type":"textarea","required":false},{"key":"plan","label":"다음 주 계획","type":"textarea","required":false}],"managed":true,"extra":["snapshot","submittedAt","confirmedAt","confirmedBy","service","reporterId"],"unique":["district","year","week","kind"]}'::jsonb);
insert into private.entity_definitions values ('meetings','{"table":"meetings","title":"회의록","group":"MT","fields":[{"key":"title","label":"회의 제목","type":"text","required":true},{"key":"date","label":"회의일","type":"date","required":true},{"key":"agenda","label":"안건","type":"textarea","required":true},{"key":"content","label":"회의 내용","type":"textarea","required":true}],"extra":["attendees"]}'::jsonb);
insert into private.entity_definitions values ('actions','{"table":"actions","title":"결정사항","group":"MT","fields":[{"key":"meetingId","label":"회의","type":"reference","ref":"meetings","required":true},{"key":"title","label":"결정사항","type":"text","required":true},{"key":"owner","label":"담당 역할","type":"select","values":["lead","district","evangelist","visitor","educator","finance","tf","admin"],"required":true},{"key":"deadline","label":"완료 기한","type":"date","required":true},{"key":"status","label":"처리 상태","type":"select","values":["진행","완료","취소"],"required":true},{"key":"completedAt","label":"완료일","type":"date","required":false}],"extra":["originId","sourceMeetingId"]}'::jsonb);
insert into private.entity_definitions values ('appointments','{"table":"appointments","title":"사명자 배정","group":"OR","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"positionId","label":"직책","type":"reference","ref":"positions","required":true},{"key":"district","label":"소속","type":"districtScope","required":true},{"key":"start","label":"시작일","type":"date","required":true},{"key":"end","label":"종료일","type":"date","required":false},{"key":"revoked","label":"권한 회수","type":"checkbox"}]}'::jsonb);
insert into private.entity_definitions values ('relationships','{"table":"relationships","title":"관계 및 동의","group":"AT","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"type","label":"관계 구분","type":"select","values":["인교","섬강","전도","친분자"],"required":true},{"key":"relatedId","label":"연결 회원","type":"reference","ref":"members","required":true},{"key":"consent","label":"동의 상태","type":"select","values":["확인"],"required":true}]}'::jsonb);
insert into private.entity_definitions values ('moves','{"table":"moves","title":"구역 이동","group":"MB","fields":[{"key":"memberId","label":"회원","type":"reference","ref":"members","required":true},{"key":"type","label":"이동 유형","type":"select","values":["구역 이동","신규 편입","제적 / 사고처리"],"required":true},{"key":"from","label":"이전 구역","type":"reference","ref":"districts","required":false},{"key":"to","label":"이후 구역","type":"reference","ref":"districts","required":false},{"key":"date","label":"처리일","type":"date","required":true},{"key":"reason","label":"이동 사유","type":"textarea","required":true}],"managed":true}'::jsonb);
insert into private.entity_definitions values ('weeks','{"table":"weeks","title":"주차","group":"OR","fields":[{"key":"year","label":"연도","type":"number","min":2020,"max":2100,"required":true},{"key":"number","label":"주차","type":"number","min":1,"max":54,"required":true},{"key":"start","label":"시작일","type":"date","required":true},{"key":"end","label":"종료일","type":"date","required":true}],"unique":["year","number"]}'::jsonb);
insert into private.entity_definitions values ('settings','{"table":"settings","title":"운영 기준","group":"SY","fields":[{"key":"absenceWeeks","label":"장기결석 기준 (주)","type":"number","min":1,"max":52,"required":true},{"key":"contactDays","label":"연락 필요 기준 (일)","type":"number","min":1,"max":365,"required":true},{"key":"retentionMonths","label":"보관기간 (개월)","type":"number","min":1,"max":120,"required":false}],"managed":true,"extra":["services","confirmed"]}'::jsonb);

create function private.valid_record(p_collection text, d jsonb) returns boolean
language plpgsql stable set search_path='' as $$
declare def jsonb; f jsonb; k text; v jsonb; typ text; allowed text[];
begin
 select definition into def from private.entity_definitions where collection=p_collection;
 if def is null or d is null or jsonb_typeof(d)<>'object' or octet_length(d::text)>300000 then return false; end if;
 select array_agg(value->>'key') into allowed from jsonb_array_elements(def->'fields');
 allowed:=allowed||array['id','createdAt','createdBy','updatedAt','updatedBy','author','district'];
 select allowed||coalesce(array_agg(value),array[]::text[]) into allowed from jsonb_array_elements_text(coalesce(def->'extra','[]'));
 if exists(select 1 from jsonb_object_keys(d) x where not (x=any(allowed))) then return false; end if;
 for f in select value from jsonb_array_elements(def->'fields') loop
  k:=f->>'key';v:=d->k;typ:=f->>'type';
  if v is null or v='null'::jsonb or v='""'::jsonb then
   if coalesce((f->>'required')::boolean,false) and not(p_collection='reports' and k='opinion' and d->>'status'='작성중') then return false; end if;
   continue;
  end if;
  if typ='number' then
   if jsonb_typeof(v)<>'number' or (d->>k)::numeric<>(d->>k)::bigint or (d->>k)::numeric<(f->>'min')::numeric or (d->>k)::numeric>(f->>'max')::numeric then return false; end if;
  elsif typ='checkbox' then
   if jsonb_typeof(v)<>'boolean' then return false; end if;
  elsif typ='date' then
   if (d->>k)!~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
   perform (d->>k)::date;
  elsif typ='month' then
   if (d->>k)!~ '^\d{4}-(0[1-9]|1[0-2])$' then return false; end if;
  elsif typ='select' then
   if not (f->'values' @> jsonb_build_array(d->>k)) then return false; end if;
  elsif typ='email' then
   if (d->>k)!~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then return false; end if;
  elsif typ='districtScope' then
   if d->>k<>'지역' and (d->>k)!~ '^(10|[1-9])구역$' then return false; end if;
  elsif typ='tel' then
   if (d->>k)!~ '^[0-9+() -]{8,20}$' then return false; end if;
  end if;
  if typ not in ('checkbox','number') and (jsonb_typeof(v)<>'string' or length(d->>k)>case when typ='textarea' then 10000 else 500 end) then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;

create table private.districts (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('districts',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "leader_id" text generated always as (nullif(data->>'leaderId','')) stored
);
alter table private.districts enable row level security;
revoke all on private.districts from public, anon, authenticated;
create index districts_active_updated_idx on private.districts(updated_at) where deleted_at is null;
create index districts_created_by_idx on private.districts(created_by);
alter table private.districts add constraint ten_districts_only check(id~'^(10|[1-9])구역$' and data->>'name'=id);
create index districts_leader_id_idx on private.districts("leader_id") where deleted_at is null;

create table private.regions (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('regions',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "leader_id" text generated always as (nullif(data->>'leaderId','')) stored
);
alter table private.regions enable row level security;
revoke all on private.regions from public, anon, authenticated;
create index regions_active_updated_idx on private.regions(updated_at) where deleted_at is null;
create index regions_created_by_idx on private.regions(created_by);
create index regions_leader_id_idx on private.regions("leader_id") where deleted_at is null;

create table private.members (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('members',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "district" text generated always as (nullif(data->>'district','')) stored
);
alter table private.members enable row level security;
revoke all on private.members from public, anon, authenticated;
create index members_active_updated_idx on private.members(updated_at) where deleted_at is null;
create index members_created_by_idx on private.members(created_by);
create index members_district_idx on private.members("district") where deleted_at is null;

create table private.positions (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('positions',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 
);
alter table private.positions enable row level security;
revoke all on private.positions from public, anon, authenticated;
create index positions_active_updated_idx on private.positions(updated_at) where deleted_at is null;
create index positions_created_by_idx on private.positions(created_by);

create table private.accounts (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('accounts',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , auth_user_id uuid unique references auth.users(id) on delete restrict, "member_id" text generated always as (nullif(data->>'memberId','')) stored, "district" text generated always as (nullif(nullif(data->>'district','지역'),'')) stored
);
alter table private.accounts enable row level security;
revoke all on private.accounts from public, anon, authenticated;
create index accounts_active_updated_idx on private.accounts(updated_at) where deleted_at is null;
create index accounts_created_by_idx on private.accounts(created_by);
create index accounts_member_id_idx on private.accounts("member_id") where deleted_at is null;
create index accounts_district_idx on private.accounts("district") where deleted_at is null;

create table private.attendance (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('attendance',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "year" bigint generated always as (nullif(data->>'year','')::bigint) stored, "week" bigint generated always as (nullif(data->>'week','')::bigint) stored
);
alter table private.attendance enable row level security;
revoke all on private.attendance from public, anon, authenticated;
create index attendance_active_updated_idx on private.attendance(updated_at) where deleted_at is null;
create index attendance_created_by_idx on private.attendance(created_by);
create index attendance_member_id_idx on private.attendance("member_id") where deleted_at is null;
create unique index attendance_natural_key on private.attendance((data->>'memberId'),(data->>'year'),(data->>'week'),(data->>'service')) where deleted_at is null;

create table private.prospects (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('prospects',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "guide_id" text generated always as (nullif(data->>'guideId','')) stored, "leader_id" text generated always as (nullif(data->>'leaderId','')) stored
);
alter table private.prospects enable row level security;
revoke all on private.prospects from public, anon, authenticated;
create index prospects_active_updated_idx on private.prospects(updated_at) where deleted_at is null;
create index prospects_created_by_idx on private.prospects(created_by);
create index prospects_guide_id_idx on private.prospects("guide_id") where deleted_at is null;
create index prospects_leader_id_idx on private.prospects("leader_id") where deleted_at is null;

create table private.contacts (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('contacts',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "prospect_id" text generated always as (nullif(data->>'prospectId','')) stored
);
alter table private.contacts enable row level security;
revoke all on private.contacts from public, anon, authenticated;
create index contacts_active_updated_idx on private.contacts(updated_at) where deleted_at is null;
create index contacts_created_by_idx on private.contacts(created_by);
create index contacts_prospect_id_idx on private.contacts("prospect_id") where deleted_at is null;

create table private.stage_history (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('stageHistory',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "prospect_id" text generated always as (nullif(data->>'prospectId','')) stored
);
alter table private.stage_history enable row level security;
revoke all on private.stage_history from public, anon, authenticated;
create index stage_history_active_updated_idx on private.stage_history(updated_at) where deleted_at is null;
create index stage_history_created_by_idx on private.stage_history(created_by);
create index stage_history_prospect_id_idx on private.stage_history("prospect_id") where deleted_at is null;

create table private.visits (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('visits',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "visitor_id" text generated always as (nullif(data->>'visitorId','')) stored, "year" bigint generated always as (nullif(data->>'year','')::bigint) stored, "week" bigint generated always as (nullif(data->>'week','')::bigint) stored
);
alter table private.visits enable row level security;
revoke all on private.visits from public, anon, authenticated;
create index visits_active_updated_idx on private.visits(updated_at) where deleted_at is null;
create index visits_created_by_idx on private.visits(created_by);
create index visits_member_id_idx on private.visits("member_id") where deleted_at is null;
create index visits_visitor_id_idx on private.visits("visitor_id") where deleted_at is null;

create table private.feedback (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('feedback',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored
);
alter table private.feedback enable row level security;
revoke all on private.feedback from public, anon, authenticated;
create index feedback_active_updated_idx on private.feedback(updated_at) where deleted_at is null;
create index feedback_created_by_idx on private.feedback(created_by);
create index feedback_member_id_idx on private.feedback("member_id") where deleted_at is null;

create table private.interviews (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('interviews',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "district" text generated always as (nullif(data->>'district','')) stored
);
alter table private.interviews enable row level security;
revoke all on private.interviews from public, anon, authenticated;
create index interviews_active_updated_idx on private.interviews(updated_at) where deleted_at is null;
create index interviews_created_by_idx on private.interviews(created_by);
create index interviews_member_id_idx on private.interviews("member_id") where deleted_at is null;
create index interviews_district_idx on private.interviews("district") where deleted_at is null;

create table private.absence_cases (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('cases',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "weeks" bigint generated always as (nullif(data->>'weeks','')::bigint) stored, "owner_id" text generated always as (nullif(data->>'ownerId','')) stored
);
alter table private.absence_cases enable row level security;
revoke all on private.absence_cases from public, anon, authenticated;
create index absence_cases_active_updated_idx on private.absence_cases(updated_at) where deleted_at is null;
create index absence_cases_created_by_idx on private.absence_cases(created_by);
create index absence_cases_member_id_idx on private.absence_cases("member_id") where deleted_at is null;
create index absence_cases_owner_id_idx on private.absence_cases("owner_id") where deleted_at is null;

create table private.worship (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('worship',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "district" text generated always as (nullif(data->>'district','')) stored, "year" bigint generated always as (nullif(data->>'year','')::bigint) stored, "week" bigint generated always as (nullif(data->>'week','')::bigint) stored, "count" bigint generated always as (nullif(data->>'count','')::bigint) stored
);
alter table private.worship enable row level security;
revoke all on private.worship from public, anon, authenticated;
create index worship_active_updated_idx on private.worship(updated_at) where deleted_at is null;
create index worship_created_by_idx on private.worship(created_by);
create index worship_district_idx on private.worship("district") where deleted_at is null;
create unique index worship_natural_key on private.worship((data->>'district'),(data->>'year'),(data->>'week')) where deleted_at is null;

create table private.courses (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('courses',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "sessions" bigint generated always as (nullif(data->>'sessions','')::bigint) stored
);
alter table private.courses enable row level security;
revoke all on private.courses from public, anon, authenticated;
create index courses_active_updated_idx on private.courses(updated_at) where deleted_at is null;
create index courses_created_by_idx on private.courses(created_by);

create table private.course_attendance (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('courseAttendance',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "course_id" text generated always as (nullif(data->>'courseId','')) stored, "session" bigint generated always as (nullif(data->>'session','')::bigint) stored
);
alter table private.course_attendance enable row level security;
revoke all on private.course_attendance from public, anon, authenticated;
create index course_attendance_active_updated_idx on private.course_attendance(updated_at) where deleted_at is null;
create index course_attendance_created_by_idx on private.course_attendance(created_by);
create index course_attendance_member_id_idx on private.course_attendance("member_id") where deleted_at is null;
create index course_attendance_course_id_idx on private.course_attendance("course_id") where deleted_at is null;
create unique index course_attendance_natural_key on private.course_attendance((data->>'memberId'),(data->>'courseId'),(data->>'session')) where deleted_at is null;

create table private.exams (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('exams',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "course_id" text generated always as (nullif(data->>'courseId','')) stored
);
alter table private.exams enable row level security;
revoke all on private.exams from public, anon, authenticated;
create index exams_active_updated_idx on private.exams(updated_at) where deleted_at is null;
create index exams_created_by_idx on private.exams(created_by);
create index exams_course_id_idx on private.exams("course_id") where deleted_at is null;

create table private.exam_results (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('examResults',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "exam_id" text generated always as (nullif(data->>'examId','')) stored, "score" bigint generated always as (nullif(data->>'score','')::bigint) stored
);
alter table private.exam_results enable row level security;
revoke all on private.exam_results from public, anon, authenticated;
create index exam_results_active_updated_idx on private.exam_results(updated_at) where deleted_at is null;
create index exam_results_created_by_idx on private.exam_results(created_by);
create index exam_results_member_id_idx on private.exam_results("member_id") where deleted_at is null;
create index exam_results_exam_id_idx on private.exam_results("exam_id") where deleted_at is null;
create unique index exam_results_natural_key on private.exam_results((data->>'memberId'),(data->>'examId')) where deleted_at is null;

create table finance.contributions (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('contributions',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "amount" bigint generated always as (nullif(data->>'amount','')::bigint) stored
);
alter table finance.contributions enable row level security;
revoke all on finance.contributions from public, anon, authenticated;
create index contributions_active_updated_idx on finance.contributions(updated_at) where deleted_at is null;
create index contributions_created_by_idx on finance.contributions(created_by);
create index contributions_member_id_idx on finance.contributions("member_id") where deleted_at is null;
create unique index contributions_natural_key on finance.contributions((data->>'memberId'),(data->>'kind'),(data->>'month')) where deleted_at is null;

create table private.reports (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('reports',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "district" text generated always as (nullif(nullif(data->>'district','지역'),'')) stored, "year" bigint generated always as (nullif(data->>'year','')::bigint) stored, "week" bigint generated always as (nullif(data->>'week','')::bigint) stored
);
alter table private.reports enable row level security;
revoke all on private.reports from public, anon, authenticated;
create index reports_active_updated_idx on private.reports(updated_at) where deleted_at is null;
create index reports_created_by_idx on private.reports(created_by);
create index reports_district_idx on private.reports("district") where deleted_at is null;
create unique index reports_natural_key on private.reports((data->>'district'),(data->>'year'),(data->>'week'),(data->>'kind'),(case when data->>'kind'='구역' then '' else data->>'reporterId' end)) where deleted_at is null;

create table private.meetings (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('meetings',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 
);
alter table private.meetings enable row level security;
revoke all on private.meetings from public, anon, authenticated;
create index meetings_active_updated_idx on private.meetings(updated_at) where deleted_at is null;
create index meetings_created_by_idx on private.meetings(created_by);

create table private.actions (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('actions',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "meeting_id" text generated always as (nullif(data->>'meetingId','')) stored
);
alter table private.actions enable row level security;
revoke all on private.actions from public, anon, authenticated;
create index actions_active_updated_idx on private.actions(updated_at) where deleted_at is null;
create index actions_created_by_idx on private.actions(created_by);
create index actions_meeting_id_idx on private.actions("meeting_id") where deleted_at is null;

create table private.appointments (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('appointments',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "position_id" text generated always as (nullif(data->>'positionId','')) stored, "district" text generated always as (nullif(nullif(data->>'district','지역'),'')) stored
);
alter table private.appointments enable row level security;
revoke all on private.appointments from public, anon, authenticated;
create index appointments_active_updated_idx on private.appointments(updated_at) where deleted_at is null;
create index appointments_created_by_idx on private.appointments(created_by);
create index appointments_member_id_idx on private.appointments("member_id") where deleted_at is null;
create index appointments_position_id_idx on private.appointments("position_id") where deleted_at is null;
create index appointments_district_idx on private.appointments("district") where deleted_at is null;

create table private.relationships (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('relationships',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "related_id" text generated always as (nullif(data->>'relatedId','')) stored
);
alter table private.relationships enable row level security;
revoke all on private.relationships from public, anon, authenticated;
create index relationships_active_updated_idx on private.relationships(updated_at) where deleted_at is null;
create index relationships_created_by_idx on private.relationships(created_by);
create index relationships_member_id_idx on private.relationships("member_id") where deleted_at is null;
create index relationships_related_id_idx on private.relationships("related_id") where deleted_at is null;

create table private.moves (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('moves',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "member_id" text generated always as (nullif(data->>'memberId','')) stored, "from" text generated always as (nullif(data->>'from','')) stored, "to" text generated always as (nullif(data->>'to','')) stored
);
alter table private.moves enable row level security;
revoke all on private.moves from public, anon, authenticated;
create index moves_active_updated_idx on private.moves(updated_at) where deleted_at is null;
create index moves_created_by_idx on private.moves(created_by);
create index moves_member_id_idx on private.moves("member_id") where deleted_at is null;
create index moves_from_idx on private.moves("from") where deleted_at is null;
create index moves_to_idx on private.moves("to") where deleted_at is null;

create table private.weeks (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('weeks',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "year" bigint generated always as (nullif(data->>'year','')::bigint) stored, "number" bigint generated always as (nullif(data->>'number','')::bigint) stored
);
alter table private.weeks enable row level security;
revoke all on private.weeks from public, anon, authenticated;
create index weeks_active_updated_idx on private.weeks(updated_at) where deleted_at is null;
create index weeks_created_by_idx on private.weeks(created_by);
create unique index weeks_natural_key on private.weeks((data->>'year'),(data->>'number')) where deleted_at is null;

create table private.settings (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record('settings',data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 , "absence_weeks" bigint generated always as (nullif(data->>'absenceWeeks','')::bigint) stored, "contact_days" bigint generated always as (nullif(data->>'contactDays','')::bigint) stored, "retention_months" bigint generated always as (nullif(data->>'retentionMonths','')::bigint) stored
);
alter table private.settings enable row level security;
revoke all on private.settings from public, anon, authenticated;
create index settings_active_updated_idx on private.settings(updated_at) where deleted_at is null;
create index settings_created_by_idx on private.settings(created_by);
alter table private.districts add constraint districts_leader_id_fk foreign key ("leader_id") references private.members(id) deferrable initially deferred;
alter table private.regions add constraint regions_leader_id_fk foreign key ("leader_id") references private.members(id) deferrable initially deferred;
alter table private.members add constraint members_district_fk foreign key ("district") references private.districts(id) deferrable initially deferred;
alter table private.accounts add constraint accounts_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.accounts add constraint accounts_district_fk foreign key ("district") references private.districts(id) deferrable initially deferred;
alter table private.attendance add constraint attendance_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.prospects add constraint prospects_guide_id_fk foreign key ("guide_id") references private.members(id) deferrable initially deferred;
alter table private.prospects add constraint prospects_leader_id_fk foreign key ("leader_id") references private.members(id) deferrable initially deferred;
alter table private.contacts add constraint contacts_prospect_id_fk foreign key ("prospect_id") references private.prospects(id) deferrable initially deferred;
alter table private.stage_history add constraint stage_history_prospect_id_fk foreign key ("prospect_id") references private.prospects(id) deferrable initially deferred;
alter table private.visits add constraint visits_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.visits add constraint visits_visitor_id_fk foreign key ("visitor_id") references private.members(id) deferrable initially deferred;
alter table private.feedback add constraint feedback_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.interviews add constraint interviews_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.interviews add constraint interviews_district_fk foreign key ("district") references private.districts(id) deferrable initially deferred;
alter table private.absence_cases add constraint absence_cases_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.absence_cases add constraint absence_cases_owner_id_fk foreign key ("owner_id") references private.members(id) deferrable initially deferred;
alter table private.worship add constraint worship_district_fk foreign key ("district") references private.districts(id) deferrable initially deferred;
alter table private.course_attendance add constraint course_attendance_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.course_attendance add constraint course_attendance_course_id_fk foreign key ("course_id") references private.courses(id) deferrable initially deferred;
alter table private.exams add constraint exams_course_id_fk foreign key ("course_id") references private.courses(id) deferrable initially deferred;
alter table private.exam_results add constraint exam_results_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.exam_results add constraint exam_results_exam_id_fk foreign key ("exam_id") references private.exams(id) deferrable initially deferred;
alter table finance.contributions add constraint contributions_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.reports add constraint reports_district_fk foreign key ("district") references private.districts(id) deferrable initially deferred;
alter table private.actions add constraint actions_meeting_id_fk foreign key ("meeting_id") references private.meetings(id) deferrable initially deferred;
alter table private.appointments add constraint appointments_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.appointments add constraint appointments_position_id_fk foreign key ("position_id") references private.positions(id) deferrable initially deferred;
alter table private.appointments add constraint appointments_district_fk foreign key ("district") references private.districts(id) deferrable initially deferred;
alter table private.relationships add constraint relationships_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.relationships add constraint relationships_related_id_fk foreign key ("related_id") references private.members(id) deferrable initially deferred;
alter table private.moves add constraint moves_member_id_fk foreign key ("member_id") references private.members(id) deferrable initially deferred;
alter table private.moves add constraint moves_from_fk foreign key ("from") references private.districts(id) deferrable initially deferred;
alter table private.moves add constraint moves_to_fk foreign key ("to") references private.districts(id) deferrable initially deferred;

create unique index accounts_email_unique on private.accounts(lower(data->>'email')) where deleted_at is null;
create unique index accounts_member_unique on private.accounts(member_id) where deleted_at is null;
create unique index absence_case_open_unique on private.absence_cases(member_id) where deleted_at is null and nullif(data->>'closedAt','') is null;
create unique index action_carry_unique on private.actions((data->>'meetingId'),(coalesce(data->>'originId',id))) where deleted_at is null;
create table private.profiles (
 user_id uuid primary key references auth.users(id) on delete restrict,
 phone text not null default '' check(phone='' or phone~'^[0-9+() -]{8,20}$'),
 photo text not null default '' check(length(photo)<=250000 and (photo='' or photo~'^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')),
 version bigint not null default 1, updated_at timestamptz not null default now()
);
alter table private.profiles enable row level security;
revoke all on private.profiles from public, anon, authenticated;
create table private.audit_log (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete restrict,
 actor_role text, action text not null, collection text, target_id text,
 reason text not null default '', changed_fields text[] not null default '{}', at timestamptz not null default now()
);
alter table private.audit_log enable row level security;
revoke all on private.audit_log from public, anon, authenticated;
create index audit_log_at_idx on private.audit_log(at desc);
create index audit_log_actor_idx on private.audit_log(actor_id,at desc);
-- No demo members or shared passwords are inserted into production.
insert into private.districts(id,data)
select n||'구역',jsonb_build_object('id',n||'구역','name',n||'구역','status','활동') from generate_series(1,10) n;
insert into private.regions(id,data) values ('reg1','{"id":"reg1","name":"신도림지역","status":"활동"}');
insert into private.settings(id,data) values ('global','{"id":"global","absenceWeeks":8,"contactDays":14,"services":["주일","수요","구역예배"],"retentionMonths":null,"confirmed":false}');
