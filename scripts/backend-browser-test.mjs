// Isolated QA only: local Auth/REST transport around REAL PostgreSQL SQL routines.
// This server is never part of app/ or the deployed artifact.
import http from 'node:http';
import fs from 'node:fs';
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {testDatabase} from '../backend/local-test-db.mjs';
import {screens} from '../app/catalog.js';
import {createAccountHandler} from '../supabase/functions/manage-accounts/handler.js';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/tlscj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const db=await testDatabase();const secret=randomBytes(32);const users=[];let checks=0;
const testPasswords=new Map();let accountHandler;
const check=(v,title)=>{if(!v)throw Error(title);checks++;if(!title.startsWith('production '))console.log('PASS '+title)};
const q=(s,p=[])=>db.query(s,p);
const scalar=async(s,p=[])=>(await q(s,p)).rows[0]?.value;
function jwt(u){const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:u.id,session_id:u.session,role:'authenticated',email:u.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return h+'.'+p+'.'+createHmac('sha256',secret).update(h+'.'+p).digest('base64url')}
function verify(token){const [h,p,s]=token.split('.');if(!s)return null;const expected=createHmac('sha256',secret).update(h+'.'+p).digest();const got=Buffer.from(s,'base64url');if(got.length!==expected.length||!timingSafeEqual(got,expected))return null;const claims=JSON.parse(Buffer.from(p,'base64url'));return claims.exp>Date.now()/1000?claims:null}
for(const role of ['lead','district','finance','admin','visitor','evangelist','educator','tf']){
 const u={id:crypto.randomUUID(),session:crypto.randomUUID(),refresh:crypto.randomUUID(),email:role+'@qa.invalid',role,aud:'authenticated',user_metadata:{},app_metadata:{provider:'email'},created_at:new Date().toISOString()};
 users.push(u);await q('insert into auth.users(id,email) values($1,$2)',[u.id,u.email]);await q('insert into auth.sessions(id,user_id) values($1,$2)',[u.session,u.id]);await q('select public.app_provision_account($1,$2::jsonb)',[u.id,JSON.stringify({email:u.email,role,district:role==='district'?'1구역':'지역',status:'활동'})]);
}
const procedures=new Map((await q("select proname,proargnames,oidvectortypes(proargtypes) argtypes from pg_proc where pronamespace='public'::regnamespace and proname like 'app_%'")).rows.map(r=>[r.proname,r]));
const transport=http.createServer(async(req,res)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':appOrigin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version, content-profile, accept-profile, prefer, range','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'};
 const send=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data))};
 if(req.method==='OPTIONS'){send(200,{});return}
 try{
  const url=new URL(req.url,'http://localhost');let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};
  if(url.pathname==='/functions/v1/manage-accounts'){const result=await accountHandler(new Request(restOrigin+url.pathname,{method:req.method,headers:req.headers,body:raw}));send(result.status,await result.json());return}
  if(url.pathname==='/auth/v1/token'){
   const u=users.find(u=>url.searchParams.get('grant_type')==='refresh_token'?body.refresh_token===u.refresh:body.email===u.email&&body.password===(testPasswords.get(u.email)||'Qa-password-123!'));
   if(!u){send(400,{error:'invalid_grant',error_description:'Invalid credentials'});return}
   send(200,{access_token:jwt(u),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:u.refresh,user:u});return;
  }
  const claims=verify((req.headers.authorization||'').replace(/^Bearer /,''));
  if(!claims){send(401,{code:'unauthorized',message:'Invalid token'});return}
  if(url.pathname==='/auth/v1/user'){send(200,users.find(u=>u.id===claims.sub));return}
  if(url.pathname==='/auth/v1/logout'){send(200,{});return}
  const name=url.pathname.split('/').at(-1),proc=procedures.get(name);
  if(!url.pathname.startsWith('/rest/v1/rpc/')||!proc){send(404,{message:'Not found'});return}
  const types=proc.argtypes.split(', ');const args=(proc.proargnames||[]).map((n,i)=>['json','jsonb'].includes(types[i])?JSON.stringify(body[n]):body[n]??null);
  const data=await db.transaction(async tx=>{
   await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);await tx.exec('set local role authenticated');
   const result=await tx.query(`select public."${name}"(${args.map((_,i)=>'$'+(i+1)+'::'+types[i]).join(',')}) value`,args);return result.rows[0].value;
  });send(200,data);
 }catch(err){send(err.code==='42501'?403:400,{code:err.code||'error',message:err.message})}
});
await new Promise(r=>transport.listen(0,'127.0.0.1',r));
const restOrigin='http://127.0.0.1:'+transport.address().port;
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const appPort=reserve.address().port;await new Promise(r=>reserve.close(r));
const appOrigin='http://127.0.0.1:'+appPort;
accountHandler=createAccountHandler({env:n=>({SUPABASE_URL:restOrigin,SUPABASE_PUBLISHABLE_KEY:'public-qa',SUPABASE_SECRET_KEY:'server-qa',APP_ALLOWED_ORIGINS:appOrigin})[n],createClient:(url,key,options)=>{
 if(key==='server-qa')return {auth:{admin:{
  async createUser(input){const u={id:crypto.randomUUID(),session:crypto.randomUUID(),refresh:crypto.randomUUID(),email:input.email,aud:'authenticated',user_metadata:{},app_metadata:{provider:'email'},created_at:new Date().toISOString()};await q('insert into auth.users(id,email) values($1,$2)',[u.id,u.email]);await q('insert into auth.sessions(id,user_id) values($1,$2)',[u.session,u.id]);users.push(u);testPasswords.set(u.email,input.password);return {data:{user:u},error:null}},
  async deleteUser(id){await q('delete from auth.sessions where user_id=$1',[id]);await q('delete from auth.users where id=$1',[id]);return {error:null}},
 }},rpc:async(name,body)=>{try{const proc=procedures.get(name),types=proc.argtypes.split(', '),args=proc.proargnames.map((n,i)=>types[i]==='jsonb'?JSON.stringify(body[n]):body[n]);return {data:await db.transaction(async tx=>{await tx.exec('set local role service_role');return (await tx.query(`select public."${name}"(${args.map((_,i)=>'$'+(i+1)+'::'+types[i]).join(',')}) value`,args)).rows[0].value}),error:null}}catch(error){return {error}}}};
 const claims=verify(options.global.headers.Authorization.replace(/^Bearer /,''));
 return {auth:{getUser:async()=>({data:{user:claims&&users.find(u=>u.id===claims.sub)},error:claims?null:Error('Invalid token')})},rpc:async()=>{try{return {data:await db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);await tx.exec('set local role authenticated');return (await tx.query('select public.app_authority() value')).rows[0].value}),error:null}}catch(error){return {error}}}};
}});
const child=spawn(process.execPath,['server.mjs',String(appPort)],{cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_SUPABASE_URL:restOrigin,APP_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_local_qa'}});
let readyResolve;const ready=new Promise(r=>readyResolve=r);child.stdout.on('data',()=>readyResolve());child.stderr.on('data',d=>console.error(String(d).slice(0,500)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/tlscj/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
const errors=[];
async function login(role,password='Qa-password-123!'){
 const ctx=await browser.newContext({viewport:{width:1440,height:1080}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text())});
 await page.goto(appOrigin+'/?role=admin#AD-02');await page.locator('#production-login-form').waitFor();
 await page.locator('[name=email]').fill(role+'@qa.invalid');await page.locator('[name=password]').fill(password);await page.locator('#production-login-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.sidebar')||document.querySelector('#production-login-error:not([hidden])'));if(!await page.locator('.sidebar').count())throw Error(await page.locator('#production-login-error').innerText());
 return {ctx,page};
}
try{
 await ready;const lead=await login('lead'),page=lead.page;
 check((await page.locator('.profile-role').innerText())==='지역장 / 회장','real login derives role from DB, ignoring forged role query');
 check(await page.locator('[data-control=role]').count()===0,'production role switch removed');
 await page.goto(appOrigin+'/#MB-02');await page.locator('#member-form').waitFor();
 await page.locator('[name=name]').fill('통합테스트');await page.locator('[name=phone]').fill('010-1111-1234');await page.locator('[name=district]').selectOption('1구역');await page.locator('[name=consent]').check();await page.locator('#member-form button[type=submit]').click();
 await page.waitForURL('**/#MB-03');await page.locator('.member-hero').waitFor();
 const mid=await scalar("select id value from private.members where data->>'phone'='010-1111-1234'");check(!!mid,'browser member form inserts into PostgreSQL');
 await page.reload();await page.locator('.member-hero').waitFor();check(!(await page.locator('.member-hero h2').innerText()).includes('통합테스트'),'reloaded member data is masked by server');
 await page.getByRole('button',{name:'정보 수정',exact:true}).click();await page.locator('#member-form [name=address]').fill('테스트 주소');await page.locator('#member-form button[type=submit]').click();await page.waitForURL('**/#MB-03');
 check(await scalar('select data->>\'address\' value from private.members where id=$1',[mid])==='테스트 주소','browser update persists in PostgreSQL');
 check(!(await page.evaluate(()=>localStorage.getItem('sindorim-prototype-v2'))),'production member records never saved in browser demo store');
 await page.goto(appOrigin+'/#AT-01');await page.locator('#attendance-form').waitFor();await page.locator('.segmented input[value="출석"]').locator('..').click();await page.locator('#attendance-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('저장했습니다'));
 check(Number(await scalar('select count(*)::int value from private.attendance'))===1,'browser attendance reaches DB');
 const district=await login('district');await district.page.goto(appOrigin+'/#ED-01');await district.page.locator('#worship-form').waitFor();await district.page.locator('[name=conducted]').selectOption('false');await district.page.locator('#worship-form button[type=submit]').click();await district.page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('저장했습니다'));
 await district.page.goto(appOrigin+'/#WR-01');await district.page.locator('[name=opinion]').fill('서버 연동 주간보고');await district.page.locator('#report-form button[type=submit]').click();await district.page.waitForFunction(()=>document.querySelector('#report-form button[type=submit]')?.disabled===true);
 check(Number(await scalar("select (data->'snapshot'->>'present')::int value from private.reports limit 1"))===1,'report submission stores database-computed snapshot');
 await page.goto(appOrigin+'/#WR-02');await page.getByRole('button',{name:'확인하기',exact:true}).click();await page.getByRole('button',{name:'확인 완료',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('저장했습니다'));
 check(await scalar("select data->>'status' value from private.reports limit 1")==='확인','report confirmation persists');
 const finance=await login('finance');await finance.page.goto(appOrigin+'/#FN-01');await finance.page.locator('#finance-form').waitFor();await finance.page.locator('#finance-form [name=memberId]').selectOption(mid);await finance.page.locator('#finance-form [name=amount]').fill('25000');await finance.page.locator('#finance-form button[type=submit]').click();await finance.page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('저장했습니다'));
 await finance.page.goto(appOrigin+'/#FN-02');await finance.page.locator('.stat-value').first().waitFor();check((await finance.page.locator('.stat-value').first().innerText()).includes('25,000'),'finance UI displays persisted sum');
 await page.goto(appOrigin+'/#MB-01');await page.getByRole('button',{name:'기록 관리',exact:true}).click();await page.locator('#managed-record-list [data-action=record-delete]').first().click();await page.locator('#record-delete-form [name=reason]').fill('복원 검증을 위한 삭제');await page.locator('#record-delete-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('기록을 삭제'));
 check(Number(await scalar('select count(*)::int value from private.members where deleted_at is not null'))===1,'browser delete uses recoverable DB deletion');
 await page.getByRole('button',{name:'기록 관리',exact:true}).click();await page.getByRole('button',{name:'삭제한 기록',exact:true}).click();await page.getByRole('button',{name:'복원',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('복원했습니다'));
 check(Number(await scalar('select count(*)::int value from private.members where deleted_at is null'))===1,'browser restores deleted member');
 await page.setViewportSize({width:320,height:844});await page.goto(appOrigin+'/#CM-03');await page.locator('.profile-photo-summary').waitFor();
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'production mobile profile has no page overflow');
 await page.locator('.topbar [data-action=profile-photo]').click();await page.locator('#profile-photo-input').setInputFiles('app/assets/logo.jpg');await page.waitForFunction(()=>document.querySelector('#profile-photo-preview img')?.naturalWidth===256);await page.locator('[data-action=profile-photo-save]').click();await page.waitForFunction(()=>document.querySelector('.topbar .profile-avatar img')?.naturalWidth===256);
 await page.reload();await page.waitForFunction(()=>document.querySelector('.topbar .profile-avatar img')?.naturalWidth===256);check(true,'profile photo persists in database across reload');
 fs.mkdirSync('output/qa',{recursive:true});await page.screenshot({path:'output/qa/backend-mobile.png',fullPage:true});
 check(errors.length===0,'no production browser runtime errors');
 const creator=await login('admin');await creator.page.goto(appOrigin+'/#SY-02');await creator.page.locator('#generic-form [name=password]').waitFor();
 await creator.page.locator('#generic-form [name=email]').fill('created-educator@qa.invalid');await creator.page.locator('#generic-form [name=role]').selectOption('educator');
 await creator.page.locator('#generic-form [name=password]').fill('Direct-account-123!');await creator.page.locator('#generic-form [name=confirmPassword]').fill('Different-password-123!');await creator.page.getByRole('button',{name:'계정 등록',exact:true}).click();
 await creator.page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('일치하지'));check(!users.some(u=>u.email==='created-educator@qa.invalid'),'password confirmation blocks invalid registration');
 await creator.page.locator('#generic-form [name=confirmPassword]').fill('Direct-account-123!');await creator.page.getByRole('button',{name:'계정 등록',exact:true}).click();await creator.page.getByRole('cell',{name:'created-educator@qa.invalid',exact:true}).waitFor();
 check(await scalar("select data->>'role' value from private.accounts where data->>'email'='created-educator@qa.invalid'")==='educator','administrator form creates an Auth-linked account without email');
 check(await creator.page.locator('#generic-form [name=password]').inputValue()==='','successful registration clears password fields');
 const direct=await login('created-educator','Direct-account-123!');check(await direct.page.locator('.profile-role').innerText()==='교육 사명자','directly registered account signs in with its database role');await direct.ctx.close();await creator.ctx.close();
 const allScreens=new Set();
 for(const role of ['lead','district','finance','admin','visitor','evangelist','educator','tf']){
  const session=await login(role);
  for(const screen of screens.filter(s=>s.allow.includes(role)&&!['CM-01','AD-01'].includes(s.id))){
   await session.page.goto(appOrigin+'/#'+screen.id);await session.page.locator('.page-head h1').filter({hasText:role==='admin'&&screen.id==='CM-02'?'관리자 대시보드':screen.title}).waitFor();
   const text=await session.page.locator('.content').innerText();check(!text.includes('NaN')&&!text.includes('undefined'),'production '+role+' '+screen.id+' renders valid data');allScreens.add(screen.id);
  }
  await session.ctx.close();
 }
 check(allScreens.size===47,'all 47 non-login production screens rendered with real DB authorization');
 check(errors.length===0,'all production role pages have no runtime errors');
 fs.writeFileSync('output/qa/backend-browser-verification.json',JSON.stringify({checks,errors},null,2));console.log(`Browser + PostgreSQL: ${checks} checks passed`);
}catch(err){console.error('FAIL',err.message,errors);const page=browser.contexts().at(-1)?.pages().at(-1);if(page)console.error('PAGE',(await page.locator('body').innerText().catch(()=>'')).slice(-2000));process.exitCode=1}
finally{await browser.close();child.kill();await new Promise(r=>transport.close(r));await db.close()}
