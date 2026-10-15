import fs from 'node:fs';
import {entities} from '../app/entities.js';
const quote=s=>`'${String(s).replaceAll("'","''")}'`;
const snake=s=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const target=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_faith_management_schema.sql'));
if(!target)throw Error('Run supabase migration new faith_management_schema first');
let sql=`-- Schema contract generated from app/entities.js. Rebuild before applying the FIRST migration only.
create schema if not exists private;
create schema if not exists finance;
revoke all on schema private, finance from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema finance revoke all on tables from public, anon, authenticated;
create table private.entity_definitions (collection text primary key, definition jsonb not null);
revoke all on private.entity_definitions from public, anon, authenticated;
`;
for(const [key,e] of Object.entries(entities))sql+=`insert into private.entity_definitions values (${quote(key)},${quote(JSON.stringify(e))}::jsonb);\n`;
sql+=`
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
   if (d->>k)!~ '^\\d{4}-\\d{2}-\\d{2}$' then return false; end if;
   perform (d->>k)::date;
  elsif typ='month' then
   if (d->>k)!~ '^\\d{4}-(0[1-9]|1[0-2])$' then return false; end if;
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
`;
for(const [key,e] of Object.entries(entities)){
 const schema=e.schema||'private',table=`${schema}.${e.table}`;
 let columns='';
 if(key==='accounts')columns+=', auth_user_id uuid unique references auth.users(id) on delete restrict';
 for(const f of e.fields){
  if(f.type==='reference'||f.type==='districtScope'){
   const expr=f.type==='districtScope'?`nullif(nullif(data->>${quote(f.key)},'지역'),'')`:`nullif(data->>${quote(f.key)},'')`;
   columns+=`, "${snake(f.key)}" text generated always as (${expr}) stored`;
  }else if(f.type==='number')columns+=`, "${snake(f.key)}" bigint generated always as (nullif(data->>${quote(f.key)},'')::bigint) stored`;
 }
 sql+=`\ncreate table ${table} (
 id text primary key check(length(id) between 1 and 1024 and id~'^[a-zA-Z0-9가-힣_.:| -]+$'),
 data jsonb not null check(private.valid_record(${quote(key)},data)),
 version bigint not null default 1,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
 ${columns}
);
alter table ${table} enable row level security;
revoke all on ${table} from public, anon, authenticated;
create index ${e.table}_active_updated_idx on ${table}(updated_at) where deleted_at is null;
create index ${e.table}_created_by_idx on ${table}(created_by);
`;
 if(key==='districts')sql+=`alter table private.districts add constraint ten_districts_only check(id~'^(10|[1-9])구역$' and data->>'name'=id);\n`;
 for(const f of e.fields.filter(f=>f.type==='reference'||f.type==='districtScope'))sql+=`create index ${e.table}_${snake(f.key)}_idx on ${table}("${snake(f.key)}") where deleted_at is null;\n`;
 if(key==='reports')sql+=`create unique index reports_natural_key on private.reports((data->>'district'),(data->>'year'),(data->>'week'),(data->>'kind'),(case when data->>'kind'='구역' then '' else data->>'reporterId' end)) where deleted_at is null;\n`;
 else if(e.unique)sql+=`create unique index ${e.table}_natural_key on ${table}(${e.unique.map(k=>`(data->>${quote(k)})`).join(',')}) where deleted_at is null;\n`;
}
// Relations are added after all tables exist, including the district/leader cycle.
for(const [key,e] of Object.entries(entities))for(const f of e.fields.filter(f=>f.type==='reference'||f.type==='districtScope')){
 const to=entities[f.ref||'districts'];
 sql+=`alter table ${e.schema||'private'}.${e.table} add constraint ${e.table}_${snake(f.key)}_fk foreign key ("${snake(f.key)}") references ${to.schema||'private'}.${to.table}(id) deferrable initially deferred;\n`;
}
sql+=`
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
`;
fs.writeFileSync(`supabase/migrations/${target}`,sql);
console.log(`Generated ${Object.keys(entities).length} entity tables + profiles + audit_log`);
