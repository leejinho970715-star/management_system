// Real PostgreSQL validation/provisioning with a test-only Auth transport.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {testDatabase} from '../backend/local-test-db.mjs';
import {createAccountHandler} from '../supabase/functions/manage-accounts/handler.js';
const db=await testDatabase(),actors={},created=[],deleted=[];let checks=0,forceLinkFailure=false,forceRollbackFailure=false,afterCreate=null;
const check=(value,name)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0]?.value;
async function asActor(actor,sql,args=[]){return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor.id,session_id:actor.session,role:'authenticated'})]);await tx.exec('set local role authenticated');return (await tx.query(sql,args)).rows[0]?.value})}
for(const role of ['admin','tf','lead']){
 const id=randomUUID(),session=randomUUID();actors[role]={id,session};
 await db.query('insert into auth.users(id,email) values($1,$2)',[id,role+'@test.invalid']);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[session,id]);
 await db.query('select public.app_provision_account($1,$2::jsonb)',[id,JSON.stringify({email:role+'@test.invalid',role,district:'지역',status:'활동'})]);
}
await asActor(actors.lead,"select public.app_commit($1::jsonb,2026,42,'주일') value",[JSON.stringify([{collection:'members',id:'member-one',version:0,action:'upsert',data:{id:'member-one',name:'테스트회원',phone:'010-0000-0000',district:'1구역',status:'활동',consent:true,consentAt:'2026-10-15'}}])]);
const env=n=>({SUPABASE_URL:'https://test.invalid',SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'server-test'})[n];
function createClient(url,key,options){
 if(key==='server-test')return {
  rpc:async(name,params)=>{
   if(forceLinkFailure&&name==='app_provision_account')return {error:{message:'test linkage failure'}};
   try{const data=name==='app_validate_account_registration'?await scalar('select public.app_validate_account_registration($1::jsonb,$2::uuid) value',[JSON.stringify(params.p_data),params.p_inviter]):await scalar('select public.app_provision_account($1::uuid,$2::jsonb) value',[params.p_auth_id,JSON.stringify(params.p_data)]);return {data,error:null}}
   catch(error){return {error:{code:error.code,message:error.message}}}
  },
  auth:{admin:{
   async createUser(input){const id=randomUUID();await db.query('insert into auth.users(id,email) values($1,$2)',[id,input.email]);created.push({id,...input});if(afterCreate)await afterCreate();return {data:{user:{id,email:input.email}},error:null}},
   async deleteUser(id){if(forceRollbackFailure)return {error:{message:'test rollback failure'}};deleted.push(id);await db.query('delete from auth.users where id=$1',[id]);return {error:null}},
   inviteUserByEmail(){throw Error('Direct registration must never send mail')},
  }},
 };
 const token=options.global.headers.Authorization.replace(/^Bearer /,''),actor=actors[token];
 return {auth:{getUser:async()=>actor?{data:{user:{id:actor.id}},error:null}:{data:{user:null},error:{message:'invalid token'}}},rpc:async()=>{try{return {data:await asActor(actor,'select public.app_authority() value'),error:null}}catch(error){return {error}}}};
}
const handler=createAccountHandler({createClient,env});
const input={email:'new-user@test.invalid',password:'Registration-test-123!',role:'lead',district:'지역',status:'활동'};
async function request(body=input,token='admin',extra={}){return handler(new Request('https://test.invalid/manage-accounts',{method:'POST',headers:{Origin:'https://management-system-six-omega.vercel.app','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...extra},body:typeof body==='string'?body:JSON.stringify(body)}))}
try{
 check((await request(input,null)).status===401,'missing JWT is denied');
 check((await request(input,'forged')).status===401,'forged JWT is denied');
 check((await request(input,'lead')).status===403,'business role cannot register accounts');
 check((await request({...input,role:'admin'},'tf')).status===403,'TF cannot create an administrator');
 check((await request({...input,password:''})).status===400,'missing initial password is denied');
 check((await request({...input,password:'short'})).status===400,'short initial password is denied');
 check((await request('{invalid')).status===400,'malformed JSON is denied');
 check((await request(input,'admin',{Origin:'https://untrusted.invalid'})).status===403,'unapproved origin is denied');
 check((await request({...input,memberId:'missing-member'})).status===400&&created.length===0,'invalid member is rejected before Auth creation');
 check((await request({...input,role:'district',district:'1구역'})).status===400,'district role requires a linked member');
 check((await request({...input,role:'district',district:'2구역',memberId:'member-one'})).status===400,'member and assigned district must match');
 const result=await request();check(result.status===201,'administrator creates an account without SMTP');
 check(created.length===1&&created[0].email_confirm===true,'new Auth identity is immediately usable without email confirmation');
 const linked=await scalar("select data value from private.accounts where auth_user_id=$1",[created[0].id]);
 check(linked.role==='lead'&&linked.email===input.email,'new identity is linked to the actual DB role');
 check(!JSON.stringify(linked).includes(input.password)&&!JSON.stringify(await result.json()).includes(input.password),'password never appears in app data or response');
 const count=created.length;check((await request()).status===400&&created.length===count,'duplicate email never overwrites an existing identity');
 check((await request({...input,email:'finance@test.invalid',role:'finance'},'tf')).status===201,'TF can create an allowed business role');
 forceLinkFailure=true;
 check((await request({...input,email:'rollback@test.invalid'})).status===409,'link failure is reported');
 check(deleted.length===1&&await scalar("select count(*)::int value from auth.users where email='rollback@test.invalid'")===0,'link failure removes only the identity created by that request');
 check(await scalar('select count(*)::int value from auth.users where id=$1',[actors.admin.id])===1,'existing administrator is never removed by compensation');
 forceRollbackFailure=true;
 const orphan=await request({...input,email:'unlinked@test.invalid'});check(orphan.status===409&&(await orphan.json()).error.includes('연결 복구'),'failed compensation reports the remaining unlinked identity');
 forceLinkFailure=false;forceRollbackFailure=false;
 afterCreate=()=>db.query("update private.members set deleted_at=now() where id='member-one'");
 check((await request({...input,email:'race@test.invalid',role:'district',district:'1구역',memberId:'member-one'})).status===409,'membership is rechecked when linking the new account');afterCreate=null;
 check(await scalar("select count(*)::int value from auth.users where email='race@test.invalid'")===0,'concurrent member deletion leaves no new Auth identity');
 await db.exec('set role authenticated');let forbidden=false;try{await db.query('select public.app_validate_account_registration($1::jsonb,$2::uuid)',[JSON.stringify(input),actors.admin.id])}catch{forbidden=true}finally{await db.exec('reset role')}
 check(forbidden,'registration validation RPC is service-only');
 await db.query("update private.accounts set data=data||'{\"status\":\"비활성\"}'::jsonb where auth_user_id=$1",[actors.admin.id]);
 check((await request({...input,email:'blocked@test.invalid'})).status===403,'deactivated administrator cannot register another account');
 console.log(`Direct account registration: ${checks} checks passed`);
}finally{await db.close()}
