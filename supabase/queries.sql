-- 운영자 SQL Editor용 읽기 쿼리 예시입니다. 연도·주차·연월은 조회할 값으로 바꿉니다.
-- 브라우저는 이 테이블을 직접 조회하지 않고, 인증된 public.app_* RPC를 사용합니다.

-- 1. 구역별 현재 인원: 삭제된 회원은 제외하고 회원 상태를 구분합니다.
select d.id district,
 count(m.id) filter(where m.data->>'status'='활동') active_members,
 count(m.id) filter(where m.data->>'status'='장기결석') long_absence_members,
 count(m.id) total_members
from private.districts d
left join private.members m on m.district=d.id and m.deleted_at is null
where d.deleted_at is null
group by d.id
order by regexp_replace(d.id,'[^0-9]','','g')::int;

-- 2. 출석률/미입력. 사유결석은 분모에 포함하고 미입력은 결석으로 생성하지 않습니다.
with params as(select 2026 y,42 w,'주일'::text service),
targets as(select * from private.members where deleted_at is null and data->>'status' in ('활동','장기결석'))
select m.district,count(*) total,
 count(a.id) entered,
 count(*)-count(a.id) missing,
 count(a.id) filter(where a.data->>'status' in ('출석','온라인')) present,
 coalesce(round(count(a.id) filter(where a.data->>'status' in ('출석','온라인'))*100.0/nullif(count(*),0)),0) attendance_rate
from targets m cross join params p
left join private.attendance a on a.member_id=m.id and a.year=p.y and a.week=p.w and a.data->>'service'=p.service and a.deleted_at is null
group by m.district order by m.district;

-- 3. 납부 합계. 회원이 이후 비활성·삭제되어도 실제 납부 금액은 사라지지 않습니다.
select data->>'month' month_key,data->>'kind' kind,
 sum(amount) total_amount,count(distinct member_id) recorded_payers
from finance.contributions
where deleted_at is null and data->>'month'='2026-10'
group by data->>'month',data->>'kind';

-- 4. 미납: 현재 활동·장기결석 회원 중 해당 월/구분의 납부 기록이 없는 사람.
select m.id,private.mask_name(m.data->>'name') masked_name,m.district,
 right(regexp_replace(m.data->>'phone','[^0-9]','','g'),4) phone_last4
from private.members m
where m.deleted_at is null and m.data->>'status' in ('활동','장기결석')
and not exists(select 1 from finance.contributions c where c.member_id=m.id and c.deleted_at is null and c.data->>'month'='2026-10' and c.data->>'kind'='회비')
order by m.district,m.id;

-- 5. 교육 이수율: 참석 회차 / 총 회차. 기록이 없어도 0회로 표시합니다.
select m.id member_id,c.id course_id,c.data->>'name' course,
 count(t.id) filter(where (t.data->>'attended')::boolean) attended,c.sessions,
 round(count(t.id) filter(where (t.data->>'attended')::boolean)*100.0/nullif(c.sessions,0)) completion_rate
from private.members m cross join private.courses c
left join private.course_attendance t on t.member_id=m.id and t.course_id=c.id and t.deleted_at is null
where m.deleted_at is null and c.deleted_at is null
group by m.id,c.id,c.data,c.sessions;

-- 6. 제출 보고 기준 집계. 미제출 구역을 0으로 섞지 않습니다.
select year,week,count(*) submitted_districts,
 coalesce(round(sum((data->'snapshot'->>'present')::numeric)*100/nullif(sum((data->'snapshot'->>'total')::numeric),0)),0) submitted_attendance_rate
from private.reports
where deleted_at is null and data->>'kind'='구역' and data->>'status' in ('제출','확인')
group by year,week order by year desc,week desc;

-- 7. 최근 감사 기록. 인증 사용자와 변경 항목을 연결합니다.
select l.at,a.data->>'email' account,l.actor_role,l.action,l.collection,l.target_id,l.reason,l.changed_fields
from private.audit_log l left join private.accounts a on a.auth_user_id=l.actor_id
order by l.at desc limit 100;

-- 8. 미완료·기한 경과 액션과 원본 연결.
select id,data->>'title' title,data->>'owner' owner_role,
 data->>'deadline' deadline,data->>'originId' origin_id,data->>'sourceMeetingId' previous_meeting
from private.actions
where deleted_at is null and data->>'status'='진행'
and (data->>'deadline')::date<(now() at time zone 'Asia/Seoul')::date
order by data->>'deadline';

-- 변경 쿼리는 migration API 파일의 private.commit_changes에 정의되어 있습니다.
-- 앱에서는 아래처럼 JWT를 포함한 Supabase RPC를 호출합니다. SQL Editor의
-- 기본 관리자 세션에는 auth.uid()가 없으므로 앱 RPC를 그대로 실행할 수 없습니다.
--
-- supabase.rpc('app_commit', {
--   changes: [{collection:'attendance', id:'정규화된_업무키_ID', version:0,
--     action:'upsert', reason:'주간 출석 입력', data:{memberId:'실제회원ID',
--       year:2026,week:42,service:'주일',status:'출석',reason:''}}],
--   p_year:2026,p_week:42,p_service:'주일'
-- })
--
-- 수정: 조회 결과의 id/_version을 전달하고 바뀐 필드만 data에 넣습니다.
-- 삭제/복원: 같은 id/_version과 action:'delete'/'restore', 3자 이상 reason을 전달합니다.
-- 모든 변경은 서버의 역할/범위/참조/형식 검사 및 한 트랜잭션을 거칩니다.
