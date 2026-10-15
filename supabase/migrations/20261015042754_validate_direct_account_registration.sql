-- Service-only validation: passwords never enter application tables or RPC parameters.
create function private.validate_account_registration(p_data jsonb,p_inviter uuid,p_auth_id uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor_role text; d jsonb:=p_data||jsonb_build_object('id','pending-registration'); mid text:=nullif(p_data->>'memberId',''); member_d jsonb;
begin
 select data->>'role' into actor_role from private.accounts where auth_user_id=p_inviter and deleted_at is null and data->>'status'='활동';
 if actor_role is null or actor_role not in ('admin','tf') or (p_data->>'role'='admin' and actor_role<>'admin') then
  raise exception '계정 등록 권한이 없습니다.' using errcode='42501';
 end if;
 if not private.valid_record('accounts',d) then raise exception '계정 정보의 필수 항목과 형식을 확인하세요.'; end if;
 if exists(select 1 from auth.users where lower(email)=lower(p_data->>'email') and (p_auth_id is null or id<>p_auth_id))
  or exists(select 1 from private.accounts where lower(data->>'email')=lower(p_data->>'email') and deleted_at is null) then
  raise exception '이미 등록된 이메일입니다. 기존 계정을 확인하세요.';
 end if;
 if mid is not null then
  select data into member_d from private.members where id=mid and deleted_at is null and data->>'status' in ('활동','장기결석');
  if member_d is null then raise exception '활동 중인 연결 회원을 선택하세요.'; end if;
  if exists(select 1 from private.accounts where member_id=mid and deleted_at is null) then raise exception '이미 계정이 연결된 회원입니다.'; end if;
 end if;
 if p_data->>'district'<>'지역' and not exists(select 1 from private.districts where id=p_data->>'district' and deleted_at is null and data->>'status'='활동') then
  raise exception '활동 중인 담당 구역을 선택하세요.';
 end if;
 if p_data->>'role'='district' and (mid is null or p_data->>'district'='지역' or member_d->>'district' is distinct from p_data->>'district') then
  raise exception '구역장에게 같은 구역의 회원과 담당 구역을 연결하세요.';
 end if;
 return true;
end $$;
create function public.app_validate_account_registration(p_data jsonb,p_inviter uuid)
returns boolean language sql security invoker set search_path='' as $$select private.validate_account_registration(p_data,p_inviter,null)$$;
revoke all on function private.validate_account_registration(jsonb,uuid,uuid),public.app_validate_account_registration(jsonb,uuid) from public,anon,authenticated;
grant execute on function private.validate_account_registration(jsonb,uuid,uuid),public.app_validate_account_registration(jsonb,uuid) to service_role;

-- Recheck the same relationships after Auth creation, including concurrent membership changes.
create or replace function private.provision_account(p_auth_id uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid text:=p_auth_id::text; d jsonb:=(p_data-'_invitedBy')||jsonb_build_object('id',rid); actual_email text; inviter uuid:=nullif(p_data->>'_invitedBy','')::uuid; inviter_role text;
begin
 select email into actual_email from auth.users where id=p_auth_id;
 if actual_email is null or lower(actual_email)<>lower(d->>'email') or not private.valid_record('accounts',d) then raise exception '인증 계정과 계정 정보를 확인하세요.'; end if;
 if d->>'role'='district' and coalesce(d->>'district','지역')='지역' then raise exception '구역장의 담당 구역을 지정하세요.'; end if;
 if inviter is not null then
  perform private.validate_account_registration(d,inviter,p_auth_id);
  select data->>'role' into inviter_role from private.accounts where auth_user_id=inviter and deleted_at is null and data->>'status'='활동';
 end if;
 insert into private.accounts(id,data,auth_user_id,created_by) values(rid,d,p_auth_id,p_auth_id);
 insert into private.profiles(user_id) values(p_auth_id) on conflict do nothing;
 insert into private.audit_log(actor_id,actor_role,action,collection,target_id) values(inviter,coalesce(inviter_role,'system'),'인증 계정 연결','accounts',rid);
 return jsonb_build_object('id',rid);
end $$;
revoke all on function private.provision_account(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.provision_account(uuid,jsonb) to service_role;
notify pgrst,'reload schema';
