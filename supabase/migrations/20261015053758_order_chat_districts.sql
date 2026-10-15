-- Keep the fixed ten districts in the same natural order as the organization UI.
create or replace function public.app_chat_search(p_category text,p_term text default '',p_district text default null,p_month text default to_char(current_date,'YYYY-MM'),p_year int default extract(year from current_date)::int,p_week int default 1,p_service text default '주일',p_status text default '',p_offset int default 0)
returns jsonb language sql security invoker set search_path='' as $$
 with answer as materialized (
  select private.chat_search(p_category,p_term,p_district,p_month,p_year,p_week,p_service,p_status,p_offset) value
 )
 select case when p_category='organization' then jsonb_set(value,'{items}',coalesce((
  select jsonb_agg(item order by case when item->>'title' ~ '^[0-9]{1,2}구역$' then regexp_replace(item->>'title','[^0-9]','','g')::int else 999 end,item->>'title')
  from jsonb_array_elements(value->'items') item
 ),'[]'::jsonb)) else value end from answer
$$;
revoke all on function public.app_chat_search(text,text,text,text,int,int,text,text,int) from public,anon,authenticated;
grant execute on function public.app_chat_search(text,text,text,text,int,int,text,text,int) to authenticated;
