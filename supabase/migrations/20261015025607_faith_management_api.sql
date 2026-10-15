-- Private SECURITY DEFINER routines are the only data boundary. Public wrappers are INVOKER.
-- No table DML privileges or service keys are granted to browser clients.
create function private.actor() returns jsonb language sql stable security definer set search_path='' as $$
 select a.data||jsonb_build_object('userId',a.auth_user_id,'accountId',a.id,
 'menuRestricted',coalesce((a.data->>'enforceAssignments')::boolean,false) and a.data->>'role' not in ('admin','tf'),
 'menus',coalesce((select jsonb_agg(distinct upper(entry)) from private.appointments ap join private.positions po on po.id=ap.position_id cross join lateral regexp_split_to_table(po.data->>'menus','[,[:space:]]+') entry where ap.member_id=a.member_id and ap.deleted_at is null and po.deleted_at is null and not coalesce((ap.data->>'revoked')::boolean,false) and (ap.data->>'start')::date<=(now() at time zone 'Asia/Seoul')::date and (po.data->>'scope'='지역' or ap.data->>'district'=a.data->>'district') and entry~'^[A-Za-z]{2}(-[0-9]{2})?$'),'[]'))
 from private.accounts a
 where a.auth_user_id=(select auth.uid()) and a.deleted_at is null and a.data->>'status'='활동'
 and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 and exists(select 1 from auth.sessions s where s.user_id=a.auth_user_id and s.id::text=auth.jwt()->>'session_id')
$$;

create function private.screen_menu(s text) returns boolean language sql stable security definer set search_path='' as $$
select private.actor() is not null and (not coalesce((private.actor()->>'menuRestricted')::boolean,false) or private.actor()->'menus' @> jsonb_build_array(s) or private.actor()->'menus' @> jsonb_build_array(left(s,2)))
$$;
create function private.collection_menu(c text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=private.actor(); ids text[]; id text;
begin
 if a is null then return false; end if;
 if not coalesce((a->>'menuRestricted')::boolean,false) then return true; end if;
 if not writing and c in ('members','regions','districts','positions','weeks','settings','courses','exams','accounts') then return true; end if;
 ids:=case c
 when 'members' then array['MB-02'] when 'attendance' then case when writing then array['AT-01'] else array['AT-01','AT-02','MB-03'] end
 when 'prospects' then case when writing then array['EV-02','EV-03'] else array['EV-01','EV-02','EV-03','EV-04','EV-05','EV-06','EV-07'] end when 'contacts' then array['EV-04'] when 'stageHistory' then array['EV-03','EV-06']
 when 'visits' then case when writing then array['VS-01','VS-02'] else array['VS-01','VS-02','MB-03'] end
 when 'feedback' then array['AT-05'] when 'interviews' then array['VS-03','VS-04'] when 'cases' then array['AT-03'] when 'relationships' then array['AT-04']
 when 'worship' then case when writing then array['ED-01'] else array['ED-01','WR-01'] end when 'courses' then array['ED-02'] when 'courseAttendance' then array['ED-03'] when 'exams' then array['ED-04'] when 'examResults' then array['ED-05']
 when 'contributions' then case when writing then array['FN-01'] else array['FN-01','FN-02','FN-03'] end
 when 'reports' then case when writing then array['WR-01','WR-02'] else array['WR-01','WR-02','WR-03'] end when 'meetings' then array['MT-01'] when 'actions' then array['MT-02','MT-03']
 when 'moves' then array['MB-04'] when 'appointments' then array['OR-04'] when 'regions' then array['OR-01'] when 'districts' then array['OR-02'] when 'positions' then array['OR-03'] when 'weeks' then array['OR-05'] when 'settings' then array['SY-01'] when 'accounts' then array['SY-02']
 else array[]::text[] end;
 foreach id in array ids loop if a->'menus' @> jsonb_build_array(id) or a->'menus' @> jsonb_build_array(left(id,2)) then return true; end if;end loop;
 return false;
end $$;

create function private.member_scope(p_id text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.members m where m.id=p_id and m.deleted_at is null
 and private.actor() is not null and (private.actor()->>'role'<>'district' or m.data->>'district'=private.actor()->>'district'))
$$;

create function private.can_read(c text,d jsonb,owner_id uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=private.actor(); r text:=a->>'role'; mid text;
begin
 if a is null then return false; end if;
 if private.collection_menu(c,false) is not true then return false; end if;
 if c='members' then return r<>'district' or d->>'district'=a->>'district'; end if;
 if c in ('districts','regions','positions','weeks','settings','courses','exams') then return true; end if;
 if c='accounts' then return r in ('admin','tf') or owner_id=(select auth.uid()); end if;
 if c='appointments' then return r in ('lead','tf','admin') or (r='district' and private.member_scope(d->>'memberId')); end if;
 if c='contributions' then return r in ('lead','finance'); end if;
 if c in ('prospects','contacts','stageHistory') then
  if r not in ('lead','district','evangelist') then return false; end if;
  if c='prospects' then mid:=d->>'guideId';
  else select p.data->>'guideId' into mid from private.prospects p where p.id=d->>'prospectId' and p.deleted_at is null; end if;
  return private.member_scope(mid);
 end if;
 if c='reports' then
  return (r='lead' and d->>'status'<>'작성중') or
   (r='district' and d->>'kind'='구역' and d->>'district'=a->>'district') or owner_id=(select auth.uid());
 end if;
 if c='meetings' then return r='lead' or (d->'attendees' @> jsonb_build_array(r)); end if;
 if c='actions' then return r='lead' or d->>'owner'=r; end if;
 if c='feedback' then return private.member_scope(d->>'memberId') and (r='lead' or owner_id=(select auth.uid())); end if;
 if c='visits' then return r in ('lead','district','visitor') and private.member_scope(d->>'memberId') and (not coalesce((d->>'sensitive')::boolean,false) or r='lead' or owner_id=(select auth.uid())); end if;
 if c='interviews' then return r in ('lead','district') and private.member_scope(d->>'memberId'); end if;
 if c in ('courses','courseAttendance','exams','examResults') then return r in ('lead','educator','district') and (not(d?'memberId') or private.member_scope(d->>'memberId')); end if;
 if c in ('attendance','cases','relationships','worship','moves') then
  if r in ('admin','finance','tf','educator','evangelist') then return false; end if;
  if d?'memberId' then return private.member_scope(d->>'memberId'); end if;
  return r<>'district' or d->>'district'=a->>'district';
 end if;
 return false;
end $$;

create function private.save_profile(p_phone text,p_photo text,p_version bigint,p_year int) returns jsonb language plpgsql security definer set search_path='' as $$
declare v bigint;
begin
 if private.actor() is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(147103,1);
 select version into v from private.profiles where user_id=(select auth.uid()) for update;
 if p_version is null or coalesce(v,0)<>p_version then raise exception '프로필이 변경되었습니다. 새로고침하세요.' using errcode='40001'; end if;
 insert into private.profiles(user_id,phone,photo) values ((select auth.uid()),p_phone,p_photo)
 on conflict(user_id) do update set phone=excluded.phone,photo=excluded.photo,version=profiles.version+1,updated_at=now();
 perform private.audit_event('프로필 수정','profiles',(select auth.uid())::text);
 return private.bootstrap(p_year);
end $$;

create function private.deleted_records(c text) returns jsonb language plpgsql security definer set search_path='' as $$
declare def jsonb; result jsonb;
begin
 if private.actor() is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 select definition into def from private.entity_definitions where collection=c;
 if def is null or c='stageHistory' then raise exception '허용되지 않은 요청입니다.'; end if;
 execute format('select coalesce(jsonb_agg(jsonb_build_object(''id'',id,''_version'',version,''deletedAt'',deleted_at,''name'',case when $1 in (''members'',''prospects'') then private.mask_name(data->>''name'') else coalesce(data->>''name'',data->>''title'',data->>''date'',id) end)),''[]'') from %I.%I where deleted_at is not null and private.can_write($1,data,data,created_by)',coalesce(def->>'schema','private'),def->>'table') into result using c;
 perform private.audit_event('삭제 기록 조회',c,'trash');
 return result;
end $$;

create function private.provision_account(p_auth_id uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid text:=p_auth_id::text; d jsonb:=(p_data-'_invitedBy')||jsonb_build_object('id',rid); actual_email text; inviter uuid:=nullif(p_data->>'_invitedBy','')::uuid; inviter_role text;
begin
 -- This function is deliberately callable only by service_role, never authenticated/anon.
 select email into actual_email from auth.users where id=p_auth_id;
 if actual_email is null or lower(actual_email)<>lower(d->>'email') or not private.valid_record('accounts',d) then raise exception '인증 계정과 계정 정보를 확인하세요.'; end if;
 if d->>'role'='district' and coalesce(d->>'district','지역')='지역' then raise exception '구역장의 담당 구역을 지정하세요.'; end if;
 if inviter is not null then
  select data->>'role' into inviter_role from private.accounts where auth_user_id=inviter and deleted_at is null and data->>'status'='활동';
  if inviter_role not in ('admin','tf') or inviter_role is null or (d->>'role'='admin' and inviter_role<>'admin') then raise exception '계정 초대 권한이 없습니다.' using errcode='42501'; end if;
 end if;
 insert into private.accounts(id,data,auth_user_id,created_by) values(rid,d,p_auth_id,p_auth_id);
 insert into private.profiles(user_id) values(p_auth_id) on conflict do nothing;
 insert into private.audit_log(actor_id,actor_role,action,collection,target_id) values(inviter,coalesce(inviter_role,'system'),'인증 계정 연결','accounts',rid);
 return jsonb_build_object('id',rid);
end $$;

create function private.can_write(c text,d jsonb,old_d jsonb,owner_id uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=private.actor(); r text:=a->>'role';
begin
 if a is null then return false; end if;
 if private.collection_menu(c,true) is not true then return false; end if;
 if c='prospects' then
  if old_d is null and private.screen_menu('EV-02') is not true then return false; end if;
  if old_d is not null and d->>'stage'<>old_d->>'stage' and private.screen_menu('EV-03') is not true then return false; end if;
  if old_d is not null and private.screen_menu('EV-02') is not true and (d-array['stage','enteredAt','reason','updatedAt','updatedBy']) is distinct from (old_d-array['stage','enteredAt','reason','updatedAt','updatedBy']) then return false; end if;
 end if;
 if c='visits' and private.screen_menu('VS-01') is not true and (old_d is null or (d-array['status','completedAt','updatedAt','updatedBy']) is distinct from (old_d-array['status','completedAt','updatedAt','updatedBy'])) then return false; end if;
 if c='interviews' and ((r='lead' and private.screen_menu('VS-04') is not true) or (r='district' and private.screen_menu('VS-03') is not true)) then return false; end if;
 if c='reports' and ((r='lead' and private.screen_menu('WR-02') is not true) or (r<>'lead' and private.screen_menu('WR-01') is not true)) then return false; end if;
 if c='actions' and private.screen_menu(case when old_d is null and d?'originId' then 'MT-03' else 'MT-02' end) is not true then return false; end if;
 if d?'memberId' and c<>'accounts' and not private.member_scope(d->>'memberId') then return false; end if;
 if old_d is not null and old_d?'memberId' and c<>'accounts' and not private.member_scope(old_d->>'memberId') then return false; end if;
 if r='district' and ((d?'district' and d->>'district'<>a->>'district') or (old_d?'district' and old_d->>'district'<>a->>'district')) then return false; end if;
 case c
 when 'members' then return r in ('lead','district','tf') and (r<>'district' or (d->>'district'=a->>'district' and (old_d is null or old_d->>'district'=a->>'district')));
 when 'regions','districts','positions','appointments' then return r in ('lead','tf','admin');
 when 'weeks','settings' then return r in ('tf','admin');
 when 'accounts' then return r in ('tf','admin');
 when 'contributions' then return r='finance';
 when 'attendance','visits','feedback' then return r in ('lead','district','visitor') and (c<>'feedback' or old_d is null or r='lead' or owner_id=(select auth.uid())) and (c<>'visits' or old_d is null or private.can_read(c,old_d,owner_id));
 when 'cases','relationships','worship' then return r in ('lead','district');
 when 'courses','courseAttendance','exams','examResults' then return r in ('lead','educator');
 when 'prospects' then return r in ('lead','district','evangelist') and private.member_scope(d->>'guideId') and (old_d is null or private.member_scope(old_d->>'guideId')) and (r<>'district' or old_d is null or d->>'stage'=old_d->>'stage');
 when 'contacts' then return r in ('lead','district','evangelist') and private.can_read(c,d,owner_id) and (old_d is null or private.can_read(c,old_d,owner_id));
 when 'interviews' then return r='lead' or (r='district' and (old_d is null or old_d->>'status'='요청') and d->>'status'='요청' and coalesce(d->>'result','')='');
 when 'moves','meetings' then return r='lead';
 when 'actions' then return r='lead' or (old_d is not null and old_d->>'owner'=r and (d-array['status','completedAt','updatedAt','updatedBy'])=(old_d-array['status','completedAt','updatedAt','updatedBy']));
 when 'reports' then return (r='lead' and old_d->>'status'='제출' and d->>'status'='확인') or (r in ('district','evangelist','visitor','educator','finance') and (old_d is null or old_d->>'status'='작성중') and d->>'status' in ('작성중','제출') and ((r='district' and d->>'kind'='구역') or (r<>'district' and d->>'kind'=r and (old_d is null or owner_id=(select auth.uid())))));
 else return false;
 end case;
end $$;

create function private.week_start(y int,w int) returns date language sql immutable set search_path='' as $$
 select make_date(y,1,1)-extract(dow from make_date(y,1,1))::int+7*(w-1)
$$;
create function private.absence_streak(mid text,y int,w int,s text) returns int language sql stable security definer set search_path='' as $$
 with weeks as (select g,private.week_start(y,w)-7*g dt from generate_series(0,51) g),
 states as (select g,(select a.data->>'status' from private.attendance a where a.deleted_at is null and a.member_id=mid and a.data->>'service'=s and private.week_start(a.year::int,a.week::int)=dt order by a.year desc limit 1) status from weeks)
 select coalesce(min(g) filter(where status is distinct from '결석'),52)::int from states
$$;

create function private.statistics(y int,w int,s text,district_name text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; total_count int; present_count int; entered_count int; n int; a jsonb:=private.actor();
begin
 if a is null or a->>'role' not in ('lead','district') or (a->>'role'='district' and district_name is distinct from a->>'district') or not (private.screen_menu('AT-01') or private.screen_menu('AT-02') or private.screen_menu('WR-01') or private.screen_menu('WR-03') or private.screen_menu('MB-03')) then raise exception '조회 권한이 없습니다.' using errcode='42501'; end if;
 select count(*) into total_count from private.members m where m.deleted_at is null and m.data->>'status' in ('활동','장기결석') and (district_name is null or m.data->>'district'=district_name);
 select count(*),count(*) filter(where t.data->>'status' in ('출석','온라인')) into entered_count,present_count
 from private.attendance t join private.members m on m.id=t.member_id where t.deleted_at is null and m.deleted_at is null and m.data->>'status' in ('활동','장기결석') and t.year=y and t.week=w and t.data->>'service'=s and (district_name is null or m.data->>'district'=district_name);
 select (data->>'absenceWeeks')::int into n from private.settings where id='global';
 result:=jsonb_build_object('total',total_count,'present',present_count,'entered',entered_count,'missing',greatest(total_count-entered_count,0),'rate',case when total_count=0 then 0 else round(present_count*100.0/total_count)::int end);
 return result||jsonb_build_object(
 'absence',(select count(*) from private.members m where m.deleted_at is null and m.data->>'status' in ('활동','장기결석') and (district_name is null or m.data->>'district'=district_name) and private.absence_streak(m.id,y,w,s)>=n),
 'visits',(select count(*) from private.visits v join private.members m on m.id=v.member_id where v.deleted_at is null and m.deleted_at is null and v.data->>'date'>=private.week_start(y,w)::text and v.data->>'date'<=(private.week_start(y,w)+6)::text and (district_name is null or m.data->>'district'=district_name) and private.can_read('visits',v.data,v.created_by)),
 'pending',(select count(*) from private.interviews i join private.members m on m.id=i.member_id where i.deleted_at is null and m.deleted_at is null and i.data->>'status' not in ('완료','취소') and (district_name is null or m.data->>'district'=district_name)),
 'prospects',(select jsonb_object_agg(stage,cnt) from (select st.stage,count(p.id) cnt from unnest(array['찾기','정파','상담','복음방','센터','입교','중단']) st(stage) left join private.prospects p on p.deleted_at is null and p.data->>'stage'=st.stage and exists(select 1 from private.members m where m.id=p.guide_id and m.deleted_at is null and (district_name is null or m.data->>'district'=district_name)) group by st.stage) stages),
 'worship',(select (z.data->>'conducted')::boolean from private.worship z where z.deleted_at is null and z.data->>'district'=district_name and z.year=y and z.week=w),
 'education',(select count(*) from private.course_attendance t join private.members m on m.id=t.member_id where t.deleted_at is null and m.deleted_at is null and (t.data->>'attended')::boolean and coalesce(nullif(t.data->>'date','')::date,t.updated_at::date) between private.week_start(y,w) and private.week_start(y,w)+6 and (district_name is null or m.data->>'district'=district_name)));
end $$;

create function private.mask_name(n text) returns text language sql immutable set search_path='' as $$
 select case length(n) when 0 then '' when 1 then '*' when 2 then left(n,1)||'*' when 3 then left(n,1)||'*'||right(n,1) else left(n,1)||'**'||substring(n from 4) end
$$;

create function private.bootstrap(p_year int default extract(year from current_date)::int) returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=private.actor(); def record; rows jsonb; result jsonb:='{"version":2}'::jsonb; p private.profiles%rowtype;
begin
 if a is null then raise exception '활동 중인 계정으로 로그인해야 합니다.' using errcode='42501'; end if;
 if p_year not between 2020 and 2100 then raise exception '연도를 확인하세요.'; end if;
 for def in select collection,definition from private.entity_definitions order by collection loop
  execute format('select coalesce(jsonb_agg(data||jsonb_build_object(''id'',id,''_version'',version) order by created_at,id),''[]''::jsonb) from %I.%I where deleted_at is null and private.can_read($1,data,created_by) and ($2 is null or (data->>''year'')::int=$2)',coalesce(def.definition->>'schema','private'),def.definition->>'table')
   into rows using def.collection,case when def.collection in ('attendance','worship','reports') then p_year else null end;
  if def.collection='districts' then select jsonb_agg(x order by regexp_replace(x->>'id','[^0-9]','','g')::int) into rows from jsonb_array_elements(rows) x; end if;
  if def.collection='members' then
   select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','_version',x->'_version','name',private.mask_name(x->>'name'),'phone','010-****-'||right(regexp_replace(coalesce(x->>'phone',''),'[^0-9]','','g'),4),'district',x->>'district','status',x->>'status','createdAt',x->>'createdAt','consent',case when a->>'role' in ('lead','district','visitor','tf','admin') then x->'consent' else null end,'consentAt',case when a->>'role' in ('lead','district','visitor','tf','admin') then x->>'consentAt' else null end,'incidentAt',case when a->>'role' in ('lead','district','visitor','tf','admin') then x->>'incidentAt' else null end,'birthYear',case when a->>'role' in ('lead','district','visitor','tf') then left(x->>'birthday',4) else null end)),'[]') into rows from jsonb_array_elements(rows) x;
  elsif def.collection='prospects' then
   select coalesce(jsonb_agg(x||jsonb_build_object('name',private.mask_name(x->>'name'),'phone','010-****-'||right(regexp_replace(coalesce(x->>'phone',''),'[^0-9]','','g'),4),'address','','birthYear',left(x->>'birthday',4),'birthday','')),'[]') into rows from jsonb_array_elements(rows) x;
  end if;
  if def.collection='interviews' and a->>'role'<>'lead' then select coalesce(jsonb_agg(x-'result'),'[]') into rows from jsonb_array_elements(rows) x; end if;
  if def.collection='settings' then result:=result||jsonb_build_object('settings',coalesce(rows->0,'{}'));
  else result:=result||jsonb_build_object(def.collection,rows); end if;
 end loop;
 select * into p from private.profiles where user_id=(select auth.uid());
 result:=result||jsonb_build_object('profile',jsonb_build_object('phone',coalesce(p.phone,''),'photo',coalesce(p.photo,''),'_version',coalesce(p.version,0)),
 'profilePhotos',jsonb_build_object(case when a->>'role'='district' then 'district:'||(a->>'district') else a->>'role' end,coalesce(p.photo,'')),
 'audit',coalesce((select jsonb_agg(x) from (select jsonb_build_object('id',id,'at',at,'role',actor_role,'account',coalesce((select ac.data->>'email' from private.accounts ac where ac.auth_user_id=actor_id limit 1),'시스템'),'action',action,'target',coalesce(collection||'/','')||coalesce(target_id,''),'reason',reason) x from private.audit_log where a->>'role' in ('admin','tf') or actor_id=(select auth.uid()) order by at desc limit 200) recent),'[]'),
 'archivedMembers',case when a->>'role' in ('lead','finance') and private.collection_menu('contributions',false) then coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',private.mask_name(m.data->>'name'),'phone','010-****-'||right(regexp_replace(m.data->>'phone','[^0-9]','','g'),4),'district',m.data->>'district')) from private.members m where m.deleted_at is not null and exists(select 1 from finance.contributions c where c.member_id=m.id and c.deleted_at is null)),'[]') else '[]'::jsonb end,
 'authority',a,'year',p_year);
 return result;
end $$;

create function private.audit_event(verb text,c text,tid text,reason_text text default '',fields text[] default '{}') returns void language sql security definer set search_path='' as $$
 insert into private.audit_log(actor_id,actor_role,action,collection,target_id,reason,changed_fields) values ((select auth.uid()),private.actor()->>'role',left(verb,100),c,tid,left(reason_text,1000),fields)
$$;

create function private.member_detail(mid text,reason_text text,for_edit boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare m private.members%rowtype; a jsonb:=private.actor();
begin
 if length(trim(reason_text))<3 or length(reason_text)>1000 then raise exception '열람 사유를 3~1000자로 입력하세요.'; end if;
 select * into m from private.members where id=mid and deleted_at is null;
 if private.screen_menu(case when for_edit then 'MB-02' else 'MB-03' end) is not true then raise exception '열람 메뉴 권한이 없습니다.' using errcode='42501'; end if;
 if not found or not private.member_scope(mid) or a->>'role' not in ('lead','district','visitor','tf') or (for_edit and a->>'role'='visitor') then raise exception '열람 권한이 없습니다.' using errcode='42501'; end if;
 perform private.audit_event(case when for_edit then '회원 수정용 열람' else '전체 이름 열람' end,'members',mid,reason_text);
 if for_edit then return m.data||jsonb_build_object('id',m.id,'_version',m.version); end if;
 return jsonb_build_object('id',m.id,'name',m.data->>'name','_version',m.version);
end $$;

create function private.commit_changes(changes jsonb,p_year int,p_week int,p_service text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=private.actor(); op jsonb; c text; def jsonb; sch text; tbl text; rid text; before_d jsonb; after_d jsonb; ver bigint; owner_id uuid; deleted timestamptz; expected bigint; reason_text text; dt text:=(now() at time zone 'Asia/Seoul')::date::text; f jsonb; ref_def jsonb; ref_data jsonb; ref_owner uuid; key_text text; v text; n int; fields text[]; old_role text; old_status text; hist jsonb;
begin
 if a is null then raise exception '활동 중인 계정으로 로그인해야 합니다.' using errcode='42501'; end if;
 if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes)>5000 or octet_length(changes::text)>8000000 then raise exception '요청 크기를 확인하세요.'; end if;
 if p_year not between 2020 and 2100 or p_week not between 1 and 54 then raise exception '연도와 주차를 확인하세요.'; end if;
 -- A transaction lock avoids write skew between linked operations and concurrent last-admin checks.
 perform pg_advisory_xact_lock(147103,1);
 for op in select value from jsonb_array_elements(changes) loop
  c:=op->>'collection';rid:=op->>'id';expected:=coalesce((op->>'version')::bigint,0);reason_text:=coalesce(op->>'reason','');
  select definition into def from private.entity_definitions where collection=c;
  if def is null or c='stageHistory' or rid is null or length(rid)>1024 or op->>'action' is null or op->>'action' not in ('upsert','delete','restore') then raise exception '허용되지 않은 변경 요청입니다.' using errcode='42501'; end if;
  sch:=coalesce(def->>'schema','private');tbl:=def->>'table';
  before_d:=null;after_d:=null;ver:=null;owner_id:=null;deleted:=null;
  execute format('select data,version,created_by,deleted_at from %I.%I where id=$1 for update',sch,tbl) into before_d,ver,owner_id,deleted using rid;
  if coalesce(ver,0)<>expected then raise exception '다른 사용자가 수정했습니다. 새로고침한 뒤 다시 저장하세요.' using errcode='40001'; end if;
  if deleted is not null and op->>'action'<>'restore' then raise exception '삭제된 기록입니다. 복원 후 수정하세요.'; end if;
  if op->>'action' in ('delete','restore') then
   if before_d is null or length(trim(reason_text))<3 then raise exception '대상과 처리 사유를 확인하세요.'; end if;
   if private.can_write(c,before_d,before_d,owner_id) is not true then raise exception '삭제·복원 권한이 없습니다.' using errcode='42501'; end if;
   if (c='prospects' and private.screen_menu('EV-02') is not true) or (c='visits' and private.screen_menu('VS-01') is not true) then raise exception '삭제 메뉴 권한이 없습니다.' using errcode='42501'; end if;
   if c in ('settings','accounts','weeks','districts','regions','moves') or (c='reports' and before_d->>'status'<>'작성중') then raise exception '이 기록은 삭제 대신 상태로 관리합니다.'; end if;
   if c='members' then
    if a->>'role' not in ('lead','tf') then raise exception '회원 삭제 권한이 없습니다.' using errcode='42501'; end if;
    if exists(select 1 from private.accounts where member_id=rid and deleted_at is null and data->>'status'='활동') then raise exception '연결된 계정을 비활성 처리한 뒤 삭제하세요.'; end if;
    if exists(select 1 from private.prospects where deleted_at is null and (guide_id=rid or leader_id=rid) and data->>'stage' not in ('입교','중단')) then raise exception '진행 중인 전도 대상자의 인도자·구역장을 먼저 변경하세요.'; end if;
   end if;
   execute format('update %I.%I set deleted_at=$1,version=version+1,updated_at=now() where id=$2',sch,tbl) using case when op->>'action'='delete' then now() else null end,rid;
   perform private.audit_event(op->>'action',c,rid,reason_text);
  else
   after_d:=coalesce(before_d,'{}'::jsonb)||((op->'data')-array['_version','birthYear']);
   if jsonb_typeof(after_d)<>'object' then raise exception '입력 형식을 확인하세요.'; end if;
   after_d:=after_d||jsonb_build_object('id',rid,'createdAt',coalesce(before_d->>'createdAt',dt),'createdBy',coalesce(before_d->>'createdBy',a->>'role'),'updatedAt',dt,'updatedBy',a->>'role');
   if c='members' then
    if coalesce((after_d->>'consent')::boolean,false)=false then raise exception '개인정보 수집 동의를 확인하세요.'; end if;
    if before_d is not null and before_d->>'district'<>after_d->>'district' then raise exception '회원의 구역은 구역 이동 화면에서 변경하세요.'; end if;
    if after_d->>'status' in ('제적','사고처리') then after_d:=after_d||jsonb_build_object('incidentAt',coalesce(nullif(before_d->>'incidentAt',''),dt)); end if;
   end if;
   if c in ('visits','feedback','interviews') then after_d:=after_d||jsonb_build_object('author',coalesce(before_d->>'author',a->>'role')); end if;
   if c in ('attendance','worship','reports','visits') and not(after_d?'year') then after_d:=after_d||jsonb_build_object('year',p_year); end if;
   if c='accounts' then
    if before_d is null then raise exception '새 계정은 계정 초대 기능을 사용하세요.'; end if;
    if after_d->>'email'<>before_d->>'email' then raise exception '이메일 변경은 인증 계정에서 처리하세요.'; end if;
    if (a->>'role'='tf' and (after_d->>'role'='admin' or before_d->>'role'='admin')) or (owner_id=(select auth.uid()) and (after_d->>'role'<>before_d->>'role' or after_d->>'status'<>'활동')) then raise exception '이 계정의 권한은 변경할 수 없습니다.' using errcode='42501'; end if;
    if before_d->>'role'='admin' and before_d->>'status'='활동' and (after_d->>'role'<>'admin' or after_d->>'status'<>'활동') and (select count(*) from private.accounts where deleted_at is null and data->>'role'='admin' and data->>'status'='활동')<=1 then raise exception '마지막 활동 관리자는 유지해야 합니다.'; end if;
   end if;
   if private.can_write(c,after_d,before_d,owner_id) is not true then raise exception '저장 권한이 없습니다.' using errcode='42501'; end if;
   if coalesce((a->>'menuRestricted')::boolean,false) and a->>'role' not in ('admin','tf') then
    if c='appointments' and after_d->>'memberId'=a->>'memberId' and (before_d is null or (after_d-array['end','revoked','updatedAt','updatedBy']) is distinct from (before_d-array['end','revoked','updatedAt','updatedBy']) or (coalesce((before_d->>'revoked')::boolean,false) and not coalesce((after_d->>'revoked')::boolean,false))) then raise exception '본인의 적용 직책 변경은 관리자에게 요청하세요.' using errcode='42501'; end if;
    if c='positions' and exists(select 1 from private.appointments z where z.member_id=a->>'memberId' and z.position_id=rid and z.deleted_at is null and not coalesce((z.data->>'revoked')::boolean,false)) and (after_d->>'menus' is distinct from before_d->>'menus' or after_d->>'scope' is distinct from before_d->>'scope') then raise exception '본인의 적용 직책 권한은 관리자에게 변경을 요청하세요.' using errcode='42501'; end if;
   end if;
   -- Every relation must refer to an active row within the caller's scope.
   for f in select value from jsonb_array_elements(def->'fields') where value->>'type' in ('reference','districtScope') loop
    v:=nullif(after_d->>(f->>'key'),'');if v is null or v='지역' then continue; end if;
    select definition into ref_def from private.entity_definitions where collection=coalesce(f->>'ref','districts');
    execute format('select data,created_by from %I.%I where id=$1 and deleted_at is null',coalesce(ref_def->>'schema','private'),ref_def->>'table') into ref_data,ref_owner using v;
    if ref_data is null or (coalesce(f->>'ref','districts')='members' and not private.member_scope(v)) or (coalesce(f->>'ref','districts')<>'members' and not private.can_read(coalesce(f->>'ref','districts'),ref_data,ref_owner)) then raise exception '연결 대상이 없거나 허용 범위 밖입니다.' using errcode='42501'; end if;
   end loop;
   if c='prospects' then
    if (select data->>'district' from private.members where id=after_d->>'guideId') is distinct from (select data->>'district' from private.members where id=after_d->>'leaderId') then raise exception '인도자와 구역장의 소속이 다릅니다.'; end if;
    if before_d is null then after_d:=after_d||jsonb_build_object('stage','찾기','enteredAt',dt,'lastContact',null);
    elsif after_d->>'stage'<>before_d->>'stage' then
     if length(trim(coalesce(after_d->>'reason','')))<1 or (after_d->>'enteredAt')::date<(before_d->>'enteredAt')::date then raise exception '단계 변경 사유와 날짜를 확인하세요.'; end if;
    end if;
   end if;
   if c='interviews' and ((after_d->>'status'='일정확정' and nullif(after_d->>'date','') is null) or (after_d->>'status'='완료' and nullif(trim(after_d->>'result'),'') is null)) then raise exception '면담 일정 또는 결과를 입력하세요.'; end if;
   if c='courses' and (after_d->>'end')::date<(after_d->>'start')::date then raise exception '교육 기간을 확인하세요.'; end if;
   if c='courses' and exists(select 1 from private.course_attendance t where t.course_id=rid and t.deleted_at is null and t.session>(after_d->>'sessions')::int) then raise exception '이미 입력된 회차보다 총 회차를 줄일 수 없습니다.'; end if;
   if c='attendance' and (before_d is null or before_d->>'service'<>after_d->>'service') and not exists(select 1 from private.settings z where z.id='global' and z.data->'services' @> jsonb_build_array(after_d->>'service')) then raise exception '등록된 예배 유형을 선택하세요.'; end if;
   if c='appointments' and nullif(after_d->>'end','') is not null and (after_d->>'end')::date<(after_d->>'start')::date then raise exception '임기를 확인하세요.'; end if;
   if c='courseAttendance' and nullif(after_d->>'date','') is null then after_d:=after_d||jsonb_build_object('date',dt); end if;
   if c='courseAttendance' and (after_d->>'session')::int>(select sessions from private.courses where id=after_d->>'courseId') then raise exception '과정의 총 회차를 초과했습니다.'; end if;
   if c='examResults' and ((coalesce((after_d->>'attended')::boolean,false) and (after_d->>'score' is null)) or (not coalesce((after_d->>'attended')::boolean,false) and after_d->>'score' is not null)) then raise exception '응시한 회원만 0~100점 점수를 입력하세요.'; end if;
   if c='worship' and (after_d->>'conducted')::boolean and (nullif(after_d->>'date','') is null or nullif(after_d->>'title','') is null or after_d->>'count' is null) then raise exception '구역예배 일자·참석 인원·말씀 제목을 입력하세요.'; end if;
   if c='relationships' and (after_d->>'memberId'=after_d->>'relatedId' or after_d->>'consent'<>'확인') then raise exception '다른 회원을 선택하고 동의를 확인하세요.'; end if;
   if c='cases' and before_d is null then
    n:=private.absence_streak(after_d->>'memberId',p_year,p_week,p_service);
    if n<(select (data->>'absenceWeeks')::int from private.settings where id='global') then raise exception '장기결석 등재 기준에 해당하지 않습니다.'; end if;
    after_d:=after_d||jsonb_build_object('weeks',n);
   end if;
   if c='cases' and after_d->>'stage' in ('단계향상','사고처리') then after_d:=after_d||jsonb_build_object('closedAt',dt);if after_d->>'stage'='사고처리' then update private.members set data=data||jsonb_build_object('status','사고처리','incidentAt',dt),version=version+1,updated_at=now() where id=after_d->>'memberId';end if;end if;
   if c in ('visits','actions') and after_d->>'status'='완료' then after_d:=after_d||jsonb_build_object('completedAt',coalesce(before_d->>'completedAt',dt)); end if;
   if c='meetings' and before_d is null then after_d:=after_d||jsonb_build_object('attendees',jsonb_build_array('lead','district','evangelist','visitor','educator','finance')); end if;
   if c='meetings' and (jsonb_typeof(after_d->'attendees')<>'array' or jsonb_array_length(after_d->'attendees')>8 or exists(select 1 from jsonb_array_elements(after_d->'attendees') x where jsonb_typeof(x)<>'string' or x#>>'{}' not in ('lead','district','evangelist','visitor','educator','finance','tf','admin'))) then raise exception '회의 참석 역할을 확인하세요.'; end if;
   if c='actions' and after_d?'originId' then
    if a->>'role'<>'lead' or not exists(select 1 from private.actions z where z.id=after_d->>'originId' and z.deleted_at is null and z.data->>'status'='진행' and (z.data->>'deadline')::date<dt::date) then raise exception '이월할 원본이 없거나 이월 조건에 해당하지 않습니다.'; end if;
   end if;
   if c='districts' and after_d->>'status'='비활성' and exists(select 1 from private.members where district=rid and deleted_at is null and data->>'status' in ('활동','장기결석')) then raise exception '소속 활동 회원을 먼저 이동하세요.'; end if;
   if c='settings' then
    if jsonb_typeof(after_d->'services')<>'array' or jsonb_array_length(after_d->'services') not between 1 and 10 or exists(select 1 from jsonb_array_elements(after_d->'services') x where jsonb_typeof(x)<>'string' or length(x#>>'{}') not between 1 and 50) then raise exception '예배 유형을 확인하세요.'; end if;
    after_d:=after_d||jsonb_build_object('confirmed',false);
   end if;
   if c='reports' then
    if after_d->>'kind'='구역' and (before_d is null or before_d->>'status'='작성중') then
     v:=coalesce(after_d->>'service',p_service);
     if not exists(select 1 from private.settings z where z.id='global' and z.data->'services' @> jsonb_build_array(v)) then raise exception '보고의 예배 유형을 확인하세요.'; end if;
     after_d:=after_d||jsonb_build_object('service',v);
    end if;
    if after_d->>'kind'<>'구역' then after_d:=after_d||jsonb_build_object('reporterId',coalesce(before_d->>'reporterId',(select auth.uid())::text),'district','지역');end if;
    if before_d->>'status'='제출' then
     if (after_d-array['status','confirmedAt','confirmedBy','updatedAt','updatedBy']) is distinct from (before_d-array['status','confirmedAt','confirmedBy','updatedAt','updatedBy']) then raise exception '제출 보고의 내용과 수치는 변경할 수 없습니다.'; end if;
     after_d:=before_d||jsonb_build_object('status','확인','confirmedAt',now(),'confirmedBy',a->>'role');
    elsif after_d->>'status'='제출' then
     if length(trim(coalesce(after_d->>'opinion','')))=0 then raise exception '소견을 입력하세요.'; end if;
     after_d:=after_d||jsonb_build_object('snapshot',case when after_d->>'kind'='구역' then private.statistics((after_d->>'year')::int,(after_d->>'week')::int,coalesce(after_d->>'service',p_service),after_d->>'district') else null end,'submittedAt',now());
    else after_d:=after_d||jsonb_build_object('snapshot',null,'submittedAt',null); end if;
   end if;
   if not private.valid_record(c,after_d) then raise exception '필수 항목·입력 범위·형식을 확인하세요. (%)',c using errcode='22023'; end if;
   if c='moves' then
    if before_d is not null then raise exception '구역 이동 이력은 수정하지 않습니다.'; end if;
    select data into ref_data from private.members where id=after_d->>'memberId' and deleted_at is null for update;
    after_d:=after_d||jsonb_build_object('from',ref_data->>'district');
    if after_d->>'type'='구역 이동' and after_d->>'to'=ref_data->>'district' then raise exception '다른 구역을 선택하세요.'; end if;
    if after_d->>'type'='제적 / 사고처리' then ref_data:=ref_data||jsonb_build_object('status','사고처리','incidentAt',after_d->>'date');
    else ref_data:=ref_data||jsonb_build_object('district',after_d->>'to','status','활동'); end if;
    update private.members set data=ref_data,version=version+1,updated_at=now() where id=after_d->>'memberId';
   end if;
   if before_d is null then
    execute format('insert into %I.%I(id,data,created_by) values($1,$2,$3)',sch,tbl) using rid,after_d,(select auth.uid());
   else execute format('update %I.%I set data=$1,version=version+1,updated_at=now() where id=$2',sch,tbl) using after_d,rid; end if;
   if c='prospects' and (before_d is null or before_d->>'stage'<>after_d->>'stage') then
    hist:=jsonb_build_object('id',gen_random_uuid()::text,'prospectId',rid,'from',before_d->>'stage','to',after_d->>'stage','date',after_d->>'enteredAt','reason',coalesce(nullif(after_d->>'reason',''),'신규 등록'));
    insert into private.stage_history(id,data,created_by) values(hist->>'id',hist,(select auth.uid()));
   end if;
   select coalesce(array_agg(k),'{}') into fields from jsonb_object_keys(after_d) k where before_d->k is distinct from after_d->k;
   perform private.audit_event(case when before_d is null then '등록' else '수정' end,c,rid,reason_text,fields);
  end if;
  if c='contacts' then
   after_d:=case when op->>'action'='delete' then null else after_d end;
   v:=coalesce(after_d->>'prospectId',before_d->>'prospectId');
   update private.prospects p set data=p.data||jsonb_build_object('lastContact',(select max(data->>'date') from private.contacts t where t.prospect_id=p.id and t.deleted_at is null)),version=p.version+1,updated_at=now() where p.id=v;
   if before_d is not null and before_d->>'prospectId' is distinct from v then update private.prospects p set data=p.data||jsonb_build_object('lastContact',(select max(data->>'date') from private.contacts t where t.prospect_id=p.id and t.deleted_at is null)),version=p.version+1,updated_at=now() where p.id=before_d->>'prospectId'; end if;
  end if;
 end loop;
 return private.bootstrap(p_year);
end $$;

create function private.finance_summary(p_month text,p_kind text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare total_count int; paid_count int; amount_sum bigint;
begin
 if private.actor()->>'role' not in ('lead','finance') or private.actor() is null or private.collection_menu('contributions',false) is not true then raise exception '회계 조회 권한이 없습니다.' using errcode='42501'; end if;
 if p_month!~ '^\d{4}-(0[1-9]|1[0-2])$' or p_kind not in ('십일조','회비','서포터즈') then raise exception '연월과 납부 구분을 확인하세요.'; end if;
 select count(*) into total_count from private.members where deleted_at is null and data->>'status' in ('활동','장기결석');
 select count(distinct m.id) into paid_count from finance.contributions c join private.members m on m.id=c.member_id where c.deleted_at is null and m.deleted_at is null and m.data->>'status' in ('활동','장기결석') and c.data->>'month'=p_month and c.data->>'kind'=p_kind;
 select coalesce(sum(c.amount),0) into amount_sum from finance.contributions c where c.deleted_at is null and c.data->>'month'=p_month and c.data->>'kind'=p_kind;
 return jsonb_build_object('total',total_count,'paid',paid_count,'unpaid',total_count-paid_count,'amount',amount_sum,'rate',case when total_count=0 then 0 else round(paid_count*100.0/total_count)::int end);
end $$;

create function private.log_access(p_action text,p_collection text,p_ids text[],p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare d jsonb; def jsonb; who uuid; tid text;
begin
 if private.actor() is null or p_action not in ('회원 카드 조회','마스킹 다운로드','로그인') or coalesce(array_length(p_ids,1),0)>5000 then raise exception '허용되지 않은 기록 요청입니다.' using errcode='42501'; end if;
 if p_action<>'로그인' then
  select definition into def from private.entity_definitions where collection=p_collection;
  if def is null then raise exception '조회 대상을 확인하세요.'; end if;
  foreach tid in array p_ids loop
   execute format('select data,created_by from %I.%I where id=$1 and deleted_at is null',coalesce(def->>'schema','private'),def->>'table') into d,who using tid;
   if d is null or not private.can_read(p_collection,d,who) then raise exception '조회 범위 밖입니다.' using errcode='42501'; end if;
  end loop;
 end if;
 perform private.audit_event(p_action,p_collection,array_to_string(p_ids,','),p_reason);
end $$;

create view private.v_attendance_summary with(security_invoker=true) as
select a.year,a.week,a.data->>'service' service,m.district,
 count(*) entered,count(*) filter(where a.data->>'status' in ('출석','온라인')) present
from private.attendance a join private.members m on m.id=a.member_id
where a.deleted_at is null and m.deleted_at is null and m.data->>'status' in ('활동','장기결석') group by a.year,a.week,a.data->>'service',m.district;
create view finance.v_monthly_contributions with(security_invoker=true) as
select c.data->>'month' AS "month",c.data->>'kind' kind,m.district,count(distinct c.member_id) paid,sum(c.amount) amount
from finance.contributions c join private.members m on m.id=c.member_id where c.deleted_at is null and m.deleted_at is null group by c.data->>'month',c.data->>'kind',m.district;
create view private.v_education_completion with(security_invoker=true) as
select t.member_id,t.course_id,count(*) filter(where (t.data->>'attended')::boolean) attended,c.sessions,
round(count(*) filter(where (t.data->>'attended')::boolean)*100.0/nullif(c.sessions,0)) completion_rate
from private.course_attendance t join private.courses c on c.id=t.course_id where t.deleted_at is null and c.deleted_at is null group by t.member_id,t.course_id,c.sessions;

-- Public SQL wrappers intentionally retain invoker privileges; only specific private RPCs are executable.
create function public.app_authority() returns jsonb language sql stable security invoker set search_path='' as $$select private.actor()$$;
create function public.app_bootstrap(p_year int) returns jsonb language sql security invoker set search_path='' as $$select private.bootstrap(p_year)$$;
create function public.app_commit(changes jsonb,p_year int,p_week int,p_service text) returns jsonb language sql security invoker set search_path='' as $$select private.commit_changes(changes,p_year,p_week,p_service)$$;
create function public.app_member_detail(mid text,reason_text text,for_edit boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.member_detail(mid,reason_text,for_edit)$$;
create function public.app_save_profile(p_phone text,p_photo text,p_version bigint,p_year int) returns jsonb language sql security invoker set search_path='' as $$select private.save_profile(p_phone,p_photo,p_version,p_year)$$;
create function public.app_deleted_records(c text) returns jsonb language sql security invoker set search_path='' as $$select private.deleted_records(c)$$;
create function public.app_statistics(p_year int,p_week int,p_service text,p_district text) returns jsonb language plpgsql security invoker set search_path='' as $$begin
 if private.actor() is null or private.actor()->>'role' not in ('lead','district','visitor') then raise exception '집계 조회 권한이 없습니다.' using errcode='42501'; end if;
 return private.statistics(p_year,p_week,p_service,p_district);end$$;
create function public.app_finance_summary(p_month text,p_kind text) returns jsonb language sql security invoker set search_path='' as $$select private.finance_summary(p_month,p_kind)$$;
create function public.app_log_access(p_action text,p_collection text,p_ids text[],p_reason text default '') returns void language sql security invoker set search_path='' as $$select private.log_access(p_action,p_collection,p_ids,p_reason)$$;
create function public.app_provision_account(p_auth_id uuid,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.provision_account(p_auth_id,p_data)$$;

revoke all on all functions in schema private from public,anon,authenticated;
revoke all on all tables in schema private,finance from public,anon,authenticated;
grant usage on schema private to authenticated,service_role;
grant execute on function private.actor(),private.can_read(text,jsonb,uuid),private.bootstrap(int),private.commit_changes(jsonb,int,int,text),private.member_detail(text,text,boolean),private.save_profile(text,text,bigint,int),private.deleted_records(text),private.statistics(int,int,text,text),private.finance_summary(text,text),private.log_access(text,text,text[],text) to authenticated;
grant execute on function private.provision_account(uuid,jsonb) to service_role;

do $$declare f record;begin
 for f in select proname,oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'app_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.proname='app_provision_account' then execute format('grant execute on function %s to service_role',f.signature);
  else execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;
end$$;

-- RLS remains defense in depth even though the Data API has no direct table privileges.
do $$declare d record;begin
 for d in select collection,definition from private.entity_definitions loop
  execute format('create policy scoped_read on %I.%I for select to authenticated using(private.can_read(%L,data,created_by))',coalesce(d.definition->>'schema','private'),d.definition->>'table',d.collection);
 end loop;
end$$;
create policy own_profile_read on private.profiles for select to authenticated using(user_id=(select auth.uid()));
create policy audit_read on private.audit_log for select to authenticated using(actor_id=(select auth.uid()) or private.actor()->>'role' in ('admin','tf'));
alter table private.entity_definitions enable row level security;
notify pgrst,'reload schema';

create function private.prospect_detail(p_id text,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.prospects%rowtype;
begin
 if private.actor() is null or length(trim(p_reason))<3 then raise exception '계정과 열람 사유를 확인하세요.' using errcode='42501'; end if;
 select * into p from private.prospects where id=p_id and deleted_at is null;
 if not found or private.can_write('prospects',p.data,p.data,p.created_by) is not true or private.screen_menu('EV-02') is not true then raise exception '대상자 수정 권한이 없습니다.' using errcode='42501'; end if;
 perform private.audit_event('대상자 수정용 열람','prospects',p_id,p_reason);
 return p.data||jsonb_build_object('id',p.id,'_version',p.version);
end $$;
create function public.app_prospect_detail(p_id text,p_reason text) returns jsonb language sql security invoker set search_path='' as $$select private.prospect_detail(p_id,p_reason)$$;
revoke all on function private.prospect_detail(text,text),public.app_prospect_detail(text,text) from public,anon,authenticated;
grant execute on function private.prospect_detail(text,text),public.app_prospect_detail(text,text) to authenticated;
create policy no_client_metadata on private.entity_definitions for select to authenticated using(false);

create function private.read_streaks(p_year int,p_week int,p_service text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if private.actor() is null or private.actor()->>'role' not in ('lead','district','visitor') or private.collection_menu('attendance',false) is not true then raise exception '조회 권한이 없습니다.' using errcode='42501'; end if;
 return coalesce((select jsonb_object_agg(m.id,private.absence_streak(m.id,p_year,p_week,p_service)) from private.members m where m.deleted_at is null and private.member_scope(m.id)),'{}');
end $$;
create function private.register_absences(p_year int,p_week int,p_service text) returns jsonb language plpgsql security definer set search_path='' as $$
declare changes jsonb; threshold int;
begin
 if private.actor() is null or private.actor()->>'role' not in ('lead','district') or private.screen_menu('AT-03') is not true then raise exception '등재 권한이 없습니다.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(147103,1);
 select (data->>'absenceWeeks')::int into threshold from private.settings where id='global';
 select coalesce(jsonb_agg(jsonb_build_object('collection','cases','id',gen_random_uuid()::text,'version',0,'action','upsert','reason','연속 결석 기준에 따른 등재','data',jsonb_build_object('memberId',m.id,'weeks',n,'stage','등재','ownerId','','result',''))),'[]') into changes
 from (select t.*,private.absence_streak(t.id,p_year,p_week,p_service) n from private.members t where t.deleted_at is null and t.data->>'status' in ('활동','장기결석') and private.member_scope(t.id)) m
 where n>=threshold and not exists(select 1 from private.absence_cases c where c.member_id=m.id and c.deleted_at is null and nullif(c.data->>'closedAt','') is null);
 return private.commit_changes(changes,p_year,p_week,p_service);
end $$;
create function private.search_members(p_query text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if private.actor() is null or length(p_query)>100 then raise exception '계정과 검색어를 확인하세요.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(id) from (select m.id from private.members m where m.deleted_at is null and private.member_scope(m.id) and (m.data->>'name' ilike '%'||p_query||'%' or right(regexp_replace(m.data->>'phone','[^0-9]','','g'),4) like '%'||p_query||'%') order by m.id limit 1000) matches),'[]');
end $$;
create function public.app_absence_streaks(p_year int,p_week int,p_service text) returns jsonb language sql security invoker set search_path='' as $$select private.read_streaks(p_year,p_week,p_service)$$;
create function public.app_register_absences(p_year int,p_week int,p_service text) returns jsonb language sql security invoker set search_path='' as $$select private.register_absences(p_year,p_week,p_service)$$;
create function public.app_search_members(p_query text) returns jsonb language sql security invoker set search_path='' as $$select private.search_members(p_query)$$;
revoke all on function private.read_streaks(int,int,text),private.register_absences(int,int,text),private.search_members(text),public.app_absence_streaks(int,int,text),public.app_register_absences(int,int,text),public.app_search_members(text) from public,anon,authenticated;
grant execute on function private.read_streaks(int,int,text),private.register_absences(int,int,text),private.search_members(text),public.app_absence_streaks(int,int,text),public.app_register_absences(int,int,text),public.app_search_members(text) to authenticated;
create index attendance_period_service_idx on private.attendance(year,week,(data->>'service'),member_id) where deleted_at is null;
create index contributions_month_kind_idx on finance.contributions((data->>'month'),(data->>'kind'),member_id) where deleted_at is null;
create index contacts_latest_idx on private.contacts(prospect_id,(data->>'date') desc) where deleted_at is null;
notify pgrst,'reload schema';
