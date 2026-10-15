import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {recordId} from '../app/entities.js';
const db=new PGlite();let count=0;
const ok=(value,label)=>{assert.ok(value,label);console.log('PASS '+label);count++};
const query=(s,p=[])=>db.query(s,p);
const scalar=async(s,p=[]) => (await query(s,p)).rows[0]?.value;
async function rejected(fn,label){let error;try{await fn()}catch(e){error=e}ok(!!error,label);return error}
const ids={};const sessions={};
async function actor(role,district='지역',key=role){
 if(!ids[key]){
  ids[key]=crypto.randomUUID();sessions[key]=crypto.randomUUID();
  await query('insert into auth.users(id,email) values($1,$2)',[ids[key],key+'@example.test']);
  await query('insert into auth.sessions(id,user_id) values($1,$2)',[sessions[key],ids[key]]);
  await query('select public.app_provision_account($1,$2::jsonb)',[ids[key],JSON.stringify({email:key+'@example.test',role,district,status:'활동'})]);
 }
 await db.exec('reset role');
 await query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[key],session_id:sessions[key],role:'authenticated'})]);
 await db.exec('set role authenticated');
}
const boot=async()=>scalar('select public.app_bootstrap(2026) value');
const commit=async(ops)=>scalar('select public.app_commit($1::jsonb,2026,41,\'주일\') value',[JSON.stringify(ops)]);
const put=(collection,data,version=0)=>({collection,id:recordId(collection,data),action:'upsert',version,data});
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text unique);create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;grant execute on all functions in schema auth to authenticated,anon,service_role;`);
 for(const file of fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort()){
  try{await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'))}catch(err){console.error('MIGRATION ERROR '+file,err.message,err.detail,err.position);throw err}
 }
 ok(true,'all SQL migrations execute on PostgreSQL');
 await actor('lead');
 ok((await boot()).districts.length===10,'10 districts seeded without demo members');
 await rejected(()=>query('select * from private.members'),'direct table access denied');
 let s=await commit([put('members',{id:'m1',name:'김하늘',phone:'010-1111-1234',district:'1구역',status:'활동',consent:true,consentAt:'2026-10-01'}),put('members',{id:'m2',name:'이서준',phone:'010-2222-5678',district:'2구역',status:'활동',consent:true,consentAt:'2026-10-01'})]);
 ok(s.members.length===2&&s.members[0].name!=='김하늘','member creation and server-side masking');
 ok((await scalar("select public.app_member_detail('m1','수정 내용 확인',true) value")).name==='김하늘','audited member detail for edit');
 await db.exec('reset role');await actor('district','1구역');
 ok((await boot()).members.length===1,'district cannot read another district');
 ok((await scalar("select public.app_search_members('김하늘') value")).includes('m1'),'full-name search happens on server and returns scoped IDs');
 ok((await scalar("select public.app_search_members('이서준') value")).length===0,'search does not reveal another district member');
 await rejected(()=>commit([put('attendance',{memberId:'m2',year:2026,week:41,service:'주일',status:'출석'})]),'cross-district writes rejected');
 s=await commit([put('attendance',{memberId:'m1',year:2026,week:41,service:'주일',status:'출석'})]);
 ok(s.attendance.length===1,'attendance saved');
 let a=s.attendance[0];s=await commit([put('attendance',{...a,status:'결석'},a._version)]);
 ok(s.attendance.length===1&&s.attendance[0].status==='결석','same attendance key updates instead of duplicating');
 await rejected(()=>commit([put('attendance',{...a,status:'출석'},a._version)]),'stale version rejected');
 await rejected(()=>commit([put('contributions',{memberId:'m1',kind:'회비',month:'2026-10',amount:10000,date:'2026-10-10'})]),'district cannot write finance');
 s=await commit([put('worship',{district:'1구역',year:2026,week:41,conducted:false,count:0,note:'일정 조정'})]);
 s=await commit([put('reports',{district:'1구역',year:2026,week:41,kind:'구역',status:'제출',opinion:'이번 주 보고',snapshot:{present:999}})]);
 let report=s.reports[0];ok(report.snapshot.present===0&&report.snapshot.total===1,'report snapshot recalculated by database');
 await rejected(()=>commit([put('reports',{...report,opinion:'조작'},report._version)]),'submitted report immutable');
 await db.exec('reset role');await actor('lead');
 s=await commit([put('reports',{...report,status:'확인'},report._version)]);report=s.reports[0];ok(report.status==='확인'&&report.snapshot.total===1,'lead confirms report without changing snapshot');
 s=await commit([put('courses',{id:'course1',name:'교육',start:'2026-10-01',end:'2026-10-30',sessions:3,status:'진행'})]);
 await rejected(()=>commit([put('courseAttendance',{memberId:'m1',courseId:'course1',session:4,attended:true})]),'invalid course session rejected');
 s=await commit([put('exams',{id:'exam1',courseId:'course1',name:'시험',date:'2026-10-10',status:'완료'})]);
 await rejected(()=>commit([put('examResults',{memberId:'m1',examId:'exam1',attended:true,score:101})]),'score bounds enforced by SQL');
 await rejected(()=>commit([put('members',{id:'rollback-member',name:'트랜잭션',phone:'010-1234-9999',district:'1구역',status:'활동',consent:true,consentAt:'2026-10-01'}),put('examResults',{memberId:'m1',examId:'exam1',attended:true,score:101})]),'a failed multi-record mutation rejects the entire batch');
 ok(!(await boot()).members.some(m=>m.id==='rollback-member'),'failed batch leaves no partial member record');
 await rejected(()=>commit([put('members',{id:'bad"onclick',name:'악성 입력',phone:'010-1234-9999',district:'1구역',status:'활동',consent:true,consentAt:'2026-10-01'})]),'HTML attribute injection through record IDs rejected');
 s=await commit([put('examResults',{memberId:'m1',examId:'exam1',attended:false,score:null})]);ok(s.examResults[0].score===null,'nonattendance differs from zero score');
 s=await commit([put('prospects',{id:'p1',name:'대상자',phone:'010-3333-1111',age:'30대',path:'지인 소개',guideId:'m1',leaderId:'m1',stage:'찾기',enteredAt:'2026-10-01'})]);
 ok(s.stageHistory.length===1,'initial prospect stage history generated by database');
 let prospect=await scalar("select data||jsonb_build_object('id',id,'_version',version) value from private.prospects where false").catch(()=>null);
 await db.exec('reset role');prospect=await scalar("select data||jsonb_build_object('id',id,'_version',version) value from private.prospects where id='p1'");await db.exec('set role authenticated');
 s=await commit([put('prospects',{...prospect,stage:'정파',reason:'상담 진행',enteredAt:'2026-10-15'},prospect._version)]);ok(s.stageHistory.length===2,'stage update preserves transition history');
 s=await commit([put('contacts',{id:'c1',prospectId:'p1',date:'2026-10-10',method:'전화',content:'일정 확인'})]);ok(s.prospects[0].lastContact==='2026-10-10','contact updates latest contact date');
 const contact=s.contacts[0];s=await commit([{collection:'contacts',id:contact.id,version:contact._version,action:'delete',reason:'중복 기록 정리'}]);
 ok(s.contacts.length===0&&s.prospects[0].lastContact===null,'soft delete recalculates latest contact date');
 let trash=await scalar("select public.app_deleted_records('contacts') value");ok(trash.length===1,'deleted record listed for restore');
 s=await commit([{collection:'contacts',id:contact.id,version:trash[0]._version,action:'restore',reason:'실수로 삭제하여 복원'}]);ok(s.contacts.length===1,'restore recovers the record');
 await db.exec('reset role');await actor('finance');
 s=await commit([put('contributions',{memberId:'m1',kind:'회비',month:'2026-10',amount:10000,date:'2026-10-10'})]);
 ok(s.contributions.length===1&&s.feedback.length===0,'finance writes are isolated from sensitive records');
 let totals=await scalar("select public.app_finance_summary('2026-10','회비') value");ok(totals.amount===10000&&totals.unpaid===1&&totals.rate===50,'database calculates finance totals and unpaid rate');
 await rejected(()=>commit([put('contributions',{memberId:'m2',kind:'회비',month:'2026-10',amount:-10,date:'2026-10-10'})]),'negative finance values rejected');
 await db.exec('reset role');await actor('visitor','지역','visitor1');
 s=await commit([put('feedback',{id:'f1',memberId:'m1',date:'2026-10-10',content:'민감 기록'})]);ok(s.feedback.length===1,'author can read own sensitive feedback');
 s=await commit([put('reports',{district:'지역',year:2026,week:41,kind:'visitor',status:'작성중',opinion:'첫 담당자',reporterId:ids.visitor1})]);const firstDraft=s.reports.find(r=>r.kind==='visitor');
 await db.exec('reset role');await actor('visitor','지역','visitor2');ok((await boot()).feedback.length===0,'same role cannot read another author sensitive feedback');
 await rejected(()=>commit([put('reports',{...firstDraft,opinion:'다른 사람의 초안 수정'},firstDraft._version)]),'same-role user cannot change another author draft');
 s=await commit([put('reports',{district:'지역',year:2026,week:41,kind:'visitor',status:'작성중',opinion:'둘째 담당자',reporterId:ids.visitor2})]);ok(s.reports.length===1&&s.reports[0].opinion==='둘째 담당자','functional reports are separate for each authenticated reporter');
 const reveal=await scalar("select public.app_member_detail('m1','방문 전 이름 확인',false) value");ok(reveal.name==='김하늘'&&!('phone' in reveal)&&!('address' in reveal),'name reveal does not expose full contact or address');
 await db.exec('reset role');await actor('educator','지역','restrictedTeacher');await db.exec('reset role');
 await query("update private.accounts set data=data||jsonb_build_object('memberId','m2','enforceAssignments',true) where auth_user_id=$1",[ids.restrictedTeacher]);await db.exec('set role authenticated');
 ok((await boot()).authority.menuRestricted===true&&(await boot()).authority.menus.length===0,'position restriction without an active assignment grants no business menus');
 await rejected(()=>commit([put('examResults',{memberId:'m2',examId:'exam1',attended:true,score:88})]),'unassigned restricted educator cannot write exam results');
 await db.exec('reset role');await actor('lead');
 s=await commit([put('positions',{id:'pos-restricted',name:'시험 담당',scope:'지역',menus:'ED-05'}),put('appointments',{id:'ap-restricted',memberId:'m2',positionId:'pos-restricted',district:'지역',start:'2026-01-01',end:'',revoked:false})]);
 await db.exec('reset role');await actor('educator','지역','restrictedTeacher');s=await commit([put('examResults',{memberId:'m2',examId:'exam1',attended:true,score:88})]);const teacherResult=s.examResults.find(r=>r.memberId==='m2');
 ok(s.authority.menus.includes('ED-05')&&teacherResult.score===88,'role and active position menu intersect for permitted writes');
 await rejected(()=>commit([put('courses',{id:'denied-course',name:'허용되지 않은 과정',start:'2026-10-01',end:'2026-10-30',sessions:3,status:'진행'})]),'a limited position cannot use other menus allowed by its base role');
 await db.exec('reset role');await actor('lead');const appointment=(await boot()).appointments.find(r=>r.id==='ap-restricted');await commit([put('appointments',{...appointment,revoked:true},appointment._version)]);
 await db.exec('reset role');await actor('educator','지역','restrictedTeacher');await rejected(()=>commit([put('examResults',{...teacherResult,score:90},teacherResult._version)]),'revoking the position immediately removes its write permissions');
 await db.exec('reset role');await actor('admin');s=await boot();ok(s.feedback.length===0&&s.contributions.length===0,'administrator has no business-sensitive access');
 await rejected(()=>query('select public.app_provision_account($1,$2::jsonb)',[ids.admin,JSON.stringify({email:'admin@example.test',role:'admin',district:'지역',status:'활동'})]),'ordinary user cannot provision privileged accounts');
 const ownAccount=s.accounts.find(x=>x.id===ids.admin);await rejected(()=>commit([put('accounts',{...ownAccount,status:'비활성'},ownAccount._version)]),'last active administrator cannot be disabled');
 await rejected(()=>query("delete from private.audit_log"),'server audit log cannot be deleted by an app account');
 s=await scalar("select public.app_save_profile('010-1234-5678','',1,2026) value");ok(s.profile.phone==='010-1234-5678','profile is persisted per authenticated user');
 await rejected(()=>query("select public.app_save_profile('010-0000-0000','',1,2026)"),'profile rejects stale versions');
 await rejected(()=>query("select public.app_save_profile('010-0000-0000','',null,2026)"),'profile version cannot be omitted to bypass conflict detection');
 await db.exec('reset role');await query('delete from auth.sessions where id=$1',[sessions.admin]);await db.exec('set role authenticated');await rejected(()=>boot(),'revoked session loses access immediately');
 await db.exec('reset role');await db.exec('set role anon');await rejected(()=>boot(),'anonymous RPC access denied');
 console.log(`Backend SQL: ${count} checks passed`);
}catch(err){console.error('FAIL',err.message,err.detail||'',err.where||'');process.exitCode=1}finally{await db.close()}
