import {createClient} from '@supabase/supabase-js';
import {entities,recordId} from './entities.js';
const config=globalThis.APP_CONFIG||{};
const configured=config.mode==='supabase';
const authFlow=typeof location!=='undefined'?new URLSearchParams(location.hash.slice(1)).get('type'):null;
if(configured&&(!config.supabaseUrl||!config.supabaseKey))throw Error('Supabase 연결 설정이 완성되지 않았습니다.');
const client=configured?createClient(config.supabaseUrl,config.supabaseKey,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}}):null;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const year=Number(today.slice(0,4));
const jan=new Date(Date.UTC(year,0,1));
const firstSunday=Date.UTC(year,0,1-jan.getUTCDay());
const currentWeek=Math.floor((Date.parse(today+'T00:00:00Z')-firstSunday)/604800000)+1;
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const derived={prospects:['lastContact'],reports:['snapshot','submittedAt','confirmedAt','confirmedBy']};
function normalized(key,row){
 const spec=entities[key],output={};
 for(const f of spec.fields){
  let value=row[f.key];
  if(f.key==='year'&&value==null)value=remote.year;
  if(f.type==='number')value=value===''||value==null?null:Number(value);
  if(f.type==='checkbox')value=value===true||value==='on'||value==='true';
  if(value!==undefined)output[f.key]=value;
 }
 for(const key of spec.extra||[])if(row[key]!==undefined)output[key]=row[key];
 if(row.district!==undefined&&!output.district)output.district=row.district==='전체 구역'?'지역':row.district;
 for(const derivedKey of derived[key]||[])delete output[derivedKey];
 if(key==='reports'&&output.kind!=='구역')output.reporterId=row.reporterId||remote.authority.userId;
 output.id=recordId(key,{...row,...output});
 return output;
}
function diff(before,candidate,reason){
 const operations=[];
 const movedIds=new Set((candidate.moves||[]).filter(m=>!(before.moves||[]).some(x=>x.id===m.id)).map(m=>m.memberId));
 for(const record of candidate.cases||[])if(record.stage==='사고처리'&&(before.cases||[]).find(c=>c.id===record.id)?.stage!=='사고처리')movedIds.add(record.memberId);
 for(const [key,spec] of Object.entries(entities)){
  if(key==='stageHistory')continue;
  const previous=key==='settings'?[{...before.settings,id:'global'}]:before[key]||[];
  const next=key==='settings'?[{...candidate.settings,id:'global'}]:candidate[key]||[];
  const byId=new Map(previous.map(r=>[recordId(key,{year:remote.year,...r}),r]));
  for(const row of next){
   const n=normalized(key,row),id=n.id,old=byId.get(id);
   if(key==='members'&&movedIds.has(id))continue;
   const oldN=old?normalized(key,old):{};
   const patch=Object.fromEntries(Object.entries(n).filter(([k,v])=>k!=='id'&&stable(v)!==stable(oldN[k])));
   if(Object.keys(patch).length)operations.push({collection:key,id,version:old?._version||0,action:'upsert',data:patch,reason});
  }
  const nextIds=new Set(next.map(r=>recordId(key,{year:remote.year,...r})));
  for(const row of previous)if(!nextIds.has(recordId(key,{year:remote.year,...row})))operations.push({collection:key,id:recordId(key,{year:remote.year,...row}),version:row._version,action:'delete',reason});
 }
 return operations;
}
function readableError(error){
 if(error.code==='23505')return '동일한 회원·주차·회차 등의 기록이 이미 있습니다. 새로고침 후 기존 기록을 수정하세요.';
 if(error.code==='23503')return '연결된 기록이 있어 처리할 수 없습니다. 연결 대상을 확인하세요.';
 if(error.code==='23514')return '필수 항목과 입력 형식을 확인하세요.';
 return error.message||'서버 요청에 실패했습니다.';
}
async function rpc(name,params={}){
 const {data,error}=await client.rpc(name,params);
 if(error)throw Object.assign(Error(readableError(error)),{code:error.code});
 return data;
}
export const remote={
 enabled:configured,client,today,year,calendarYear:year,currentWeek,baseline:null,busy:false,authority:null,recoveryPending:['invite','recovery'].includes(authFlow),
 async initialize(){
  if(!client)return null;
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(!data.session)return null;
  return this.refresh();
 },
 accept(state){this.baseline=structuredClone(state);this.authority=state.authority;return state},
 async refresh(){return this.accept(await rpc('app_bootstrap',{p_year:this.year}))},
 async signIn(email,password){
  const {error}=await client.auth.signInWithPassword({email,password});if(error)throw Error('이메일 또는 비밀번호를 확인하세요.');
  try{const result=await this.refresh();await rpc('app_log_access',{p_action:'로그인',p_collection:'accounts',p_ids:[],p_reason:''});return result}
  catch(err){await client.auth.signOut({scope:'local'});throw err}
 },
 async signOut(){const {error}=await client.auth.signOut();if(error)throw error;this.baseline=null;this.authority=null},
 async commit(candidate,{week,service,reason}){
  if(this.busy)throw Error('저장이 진행 중입니다. 잠시 후 다시 시도하세요.');
  this.busy=true;
  try{
   const ops=diff(this.baseline,candidate,reason);
   let result=ops.length?await rpc('app_commit',{changes:ops,p_year:this.year,p_week:week,p_service:service}):this.baseline;
   if(stable(candidate.profile)!==stable(this.baseline.profile))result=await rpc('app_save_profile',{p_phone:candidate.profile.phone||'',p_photo:candidate.profilePhotos?.[this.profileKey()]||candidate.profile.photo||'',p_version:result.profile._version,p_year:this.year});
   return this.accept(result);
  }finally{this.busy=false}
 },
 profileKey(){return this.authority.role==='district'?'district:'+this.authority.district:this.authority.role},
 async savePhoto(phone,photo){return this.accept(await rpc('app_save_profile',{p_phone:phone||'',p_photo:photo,p_version:this.baseline.profile._version,p_year:this.year}))},
 async memberDetail(id,reason,edit=false){return rpc('app_member_detail',{mid:id,reason_text:reason,for_edit:edit})},
 async prospectDetail(id,reason){return rpc('app_prospect_detail',{p_id:id,p_reason:reason})},
 async statistics(week,service,district){return rpc('app_statistics',{p_year:this.year,p_week:week,p_service:service,p_district:district==='전체 구역'?null:district})},
 async streaks(week,service){return rpc('app_absence_streaks',{p_year:this.year,p_week:week,p_service:service})},
 async registerAbsences(week,service){return this.accept(await rpc('app_register_absences',{p_year:this.year,p_week:week,p_service:service}))},
 async searchMembers(query){return rpc('app_search_members',{p_query:query})},
 async chatSearch(q){return rpc('app_chat_search',{p_category:q.category,p_term:q.term||'',p_district:q.district||null,p_month:q.month,p_year:q.year,p_week:q.week,p_service:q.service,p_status:q.status||'',p_offset:q.offset||0})},
 async mutation(collection,id,version,action,data,reason,week,service){return this.accept(await rpc('app_commit',{changes:[{collection,id,version,action,data,reason}],p_year:this.year,p_week:week,p_service:service}))},
 async trash(collection){return rpc('app_deleted_records',{c:collection})},
 async log(action,collection,ids,reason=''){return rpc('app_log_access',{p_action:action,p_collection:collection,p_ids:ids,p_reason:reason})},
 async resetPassword(email){const redirectTo=new URL(location.pathname,location.origin).href+'#CM-01';const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error},
 async changePassword(password){const {error}=await client.auth.updateUser({password});if(error)throw error},
 async createAccount(data){
  const {data:result,error}=await client.functions.invoke('manage-accounts',{body:{email:data.email,password:data.password,memberId:data.memberId||null,role:data.role,district:data.district,status:data.status,enforceAssignments:data.enforceAssignments}});
  if(error){let detail;try{detail=await error.context?.json()}catch{}throw Error(typeof detail?.error==='string'?detail.error:'계정 등록 서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.')}
  if(result?.error)throw Error(result.error);return this.refresh();
 },
};
client?.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')remote.recoveryPending=true});
export {diff,normalized};
