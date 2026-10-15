-- Parameterized, bounded search. No arbitrary SQL or external AI service receives data.
create function private.chat_search(p_category text,p_term text,p_district text,p_month text,p_year int,p_week int,p_service text,p_status text,p_offset int)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare a jsonb:=private.actor(); c text; menu text; permitted boolean; def jsonb; result jsonb; eligible int; entered int; present int;
begin
 if a is null then raise exception '활동 중인 계정으로 로그인해야 합니다.' using errcode='42501'; end if;
 case p_category
 when 'members' then c:='members';menu:='MB-01';permitted:=a->>'role' in ('lead','district','visitor','tf');
 when 'attendance' then c:='attendance';menu:='AT-01';permitted:=a->>'role' in ('lead','district','visitor');
 when 'prospects' then c:='prospects';menu:='EV-01';permitted:=a->>'role' in ('lead','district','evangelist');
 when 'visits' then c:='visits';menu:='VS-02';permitted:=a->>'role' in ('lead','district','visitor');
 when 'education' then c:='courses';menu:='ED-02';permitted:=a->>'role' in ('lead','educator');
 when 'finance' then c:='contributions';menu:='FN-02';permitted:=a->>'role' in ('lead','finance');
 when 'reports' then c:='reports';menu:=case when a->>'role'='lead' then 'WR-02' else 'WR-01' end;permitted:=a->>'role' in ('lead','district','visitor','evangelist','educator','finance');
 when 'actions' then c:='actions';menu:='MT-02';permitted:=a->>'role' in ('lead','district','visitor','evangelist','educator','finance');
 when 'organization' then c:='districts';menu:='OR-02';permitted:=a->>'role' in ('lead','tf','admin');
 when 'accounts' then c:='accounts';menu:='SY-02';permitted:=a->>'role' in ('tf','admin');
 else raise exception '조회 항목을 선택해 주세요.' using errcode='22023';
 end case;
 if not permitted or not private.screen_menu(menu) then raise exception '현재 계정에서 조회할 수 없는 업무입니다.' using errcode='42501'; end if;
 if p_term is null or length(p_term)>100 or p_offset is null or p_offset<0 or p_offset>10000
 or p_year is null or p_year not between 2020 and 2100 or p_week is null or p_week not between 1 and 54
 or p_month is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'
 or p_service is null or length(p_service) not between 1 and 40 or p_status is null or length(p_status)>30
 or (p_district is not null and p_district !~ '^(10|[1-9])구역$') then
 raise exception '검색 조건의 형식과 범위를 확인하세요.' using errcode='22023'; end if;
 if a->>'role'='district' and p_district is not null and p_district<>a->>'district' then
 raise exception '담당 구역만 조회할 수 있습니다.' using errcode='42501'; end if;
 if a->>'role'='district' then p_district:=a->>'district'; end if;
 select definition into def from private.entity_definitions where collection=c;
 execute format($query$
 with filtered as materialized (
 select t.id,t.updated_at,
 case when $1 in ('members','prospects') then private.mask_name(t.data->>'name')
 when $1 in ('attendance','visits','contributions') then coalesce(private.mask_name(m.data->>'name'),'삭제 회원')
 when $1='accounts' then left(t.data->>'email',2)||'***@'||split_part(t.data->>'email','@',2)
 when $1='reports' then (t.data->>'district')||' · '||(t.data->>'kind')||' 보고'
 else coalesce(t.data->>'name',t.data->>'title','기록') end title,
 concat_ws(' · ',case when $1='districts' then null else coalesce(t.data->>'district',m.data->>'district') end,
 t.data->>'date',case when $1 in ('attendance','reports') then (t.data->>'year')||'년 '||(t.data->>'week')||'주차' end,
 t.data->>'service',t.data->>'type',t.data->>'kind',t.data->>'month',
 case when $1='courses' then (t.data->>'sessions')||'회차' end,
 case when $1='accounts' then t.data->>'role' end,
 case when $1='actions' then '기한 '||(t.data->>'deadline') end) detail,
 coalesce(t.data->>'status',t.data->>'stage','등록') status,
 case when $1='contributions' then (t.data->>'amount')::numeric else null end amount
 from %I.%I t left join private.members m on m.id=coalesce(t.data->>'memberId',t.data->>'guideId')
 where t.deleted_at is null and private.can_read($1,t.data,t.created_by)
 and ($2 is null or case when $1='districts' then t.data->>'name' else coalesce(t.data->>'district',m.data->>'district') end=$2)
 and ($3='' or strpos(lower(concat_ws(' ',t.data->>'name',t.data->>'title',m.data->>'name',t.data->>'email',t.data->>'kind',t.data->>'status',t.data->>'stage')),lower($3))>0)
 and ($4='' or coalesce(t.data->>'status',t.data->>'stage')=$4)
 and ($1 not in ('attendance','reports') or ((t.data->>'year')::int=$5 and (t.data->>'week')::int=$6))
 and ($1<>'attendance' or t.data->>'service'=$7)
 and ($1 not in ('visits','contributions') or case when $1='contributions' then t.data->>'month' else left(t.data->>'date',7) end=$8)
 ), page as (select * from filtered order by updated_at desc,id limit 20 offset $9)
 select jsonb_build_object('total',(select count(*) from filtered),'amount',(select coalesce(sum(amount),0) from filtered),
 'statuses',coalesce((select jsonb_object_agg(status,n) from (select status,count(*) n from filtered group by status) s),'{}'::jsonb),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'detail',detail,'status',status,'amount',amount) order by updated_at desc,id) from page),'[]'::jsonb))
 $query$,coalesce(def->>'schema','private'),def->>'table') into result using c,p_district,trim(p_term),p_status,p_year,p_week,p_service,p_month,p_offset;
 if c='attendance' then
 select count(*) into eligible from private.members m where m.deleted_at is null and private.can_read('members',m.data,m.created_by)
 and m.data->>'status' in ('활동','장기결석') and (p_district is null or m.data->>'district'=p_district)
 and (p_term='' or strpos(lower(m.data->>'name'),lower(trim(p_term)))>0);
 -- Rate uses eligible members and all statuses, even when the rows are filtered to absences.
 select count(*),count(*) filter(where t.data->>'status' in ('출석','온라인')) into entered,present
 from private.attendance t join private.members m on m.id=t.member_id
 where t.deleted_at is null and m.deleted_at is null and m.data->>'status' in ('활동','장기결석')
 and private.can_read('attendance',t.data,t.created_by) and t.year=p_year and t.week=p_week and t.data->>'service'=p_service
 and (p_district is null or m.data->>'district'=p_district) and (p_term='' or strpos(lower(m.data->>'name'),lower(trim(p_term)))>0);
 result:=result||jsonb_build_object('attendance',jsonb_build_object('total',eligible,'present',present,'entered',entered,
 'missing',greatest(eligible-entered,0),'rate',case when eligible=0 then 0 else round(present*100.0/eligible)::int end));
 end if;
 perform private.audit_event('챗봇 조회',c,null,'항목='||p_category||'; 구역='||coalesce(p_district,'허용 범위')||'; 결과='||(result->>'total'));
 return result||jsonb_build_object('category',p_category,'screen',menu,'offset',p_offset,'limit',20,'queriedAt',clock_timestamp(),
 'scope',case when a->>'role'='district' then a->>'district' else coalesce(p_district,'허용된 전체 범위') end);
end $$;
revoke all on function private.chat_search(text,text,text,text,int,int,text,text,int) from public,anon,authenticated;
grant execute on function private.chat_search(text,text,text,text,int,int,text,text,int) to authenticated;
create function public.app_chat_search(p_category text,p_term text default '',p_district text default null,p_month text default to_char(current_date,'YYYY-MM'),p_year int default extract(year from current_date)::int,p_week int default 1,p_service text default '주일',p_status text default '',p_offset int default 0)
returns jsonb language sql security invoker set search_path='' as $$select private.chat_search(p_category,p_term,p_district,p_month,p_year,p_week,p_service,p_status,p_offset)$$;
revoke all on function public.app_chat_search(text,text,text,text,int,int,text,text,int) from public,anon,authenticated;
grant execute on function public.app_chat_search(text,text,text,text,int,int,text,text,int) to authenticated;
