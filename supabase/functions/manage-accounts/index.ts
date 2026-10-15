import {createClient} from 'npm:@supabase/supabase-js@2.117.3';

const allowedOrigins=new Set([
 'https://management-system-six-omega.vercel.app',
 'https://leejinho970715-star.github.io',
 ...(Deno.env.get('APP_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean),
]);
const roles=['lead','district','evangelist','visitor','educator','finance','tf','admin'];
function environmentKey(dictionary:string,single:string,legacy:string){
 const raw=Deno.env.get(dictionary);if(raw){try{const keys=JSON.parse(raw);const value=keys.default||Object.values(keys).find(v=>typeof v==='string');if(typeof value==='string')return value}catch{}}
 return Deno.env.get(single)||Deno.env.get(legacy)||'';
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const cors={'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers:cors});
 if(origin&&!allowedOrigins.has(origin))return respond(403,{error:'허용되지 않은 사이트입니다.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond(405,{error:'지원하지 않는 요청입니다.'});
 const token=req.headers.get('Authorization')||'';
 if(!token.startsWith('Bearer '))return respond(401,{error:'로그인이 필요합니다.'});
 const url=Deno.env.get('SUPABASE_URL')!;
 const publicKey=environmentKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY');
 const serviceKey=environmentKey('SUPABASE_SECRET_KEYS','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!publicKey||!serviceKey)return respond(503,{error:'서버의 Supabase 연결 설정을 확인하세요.'});
 const caller=createClient(url,publicKey,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  // Verify the actual user with Auth, then re-read current DB role/session/activation.
  const {data:user,error:authError}=await caller.auth.getUser(token.slice(7));
  if(authError||!user.user)return respond(401,{error:'로그인 상태를 확인하세요.'});
  const {data:actor,error:actorError}=await caller.rpc('app_authority');
  if(actorError||!actor||!['admin','tf'].includes(actor.role))return respond(403,{error:'계정 관리 권한이 없습니다.'});
  if(Number(req.headers.get('content-length')||0)>10000)return respond(413,{error:'요청이 너무 큽니다.'});
  const raw=await req.text();if(raw.length>10000)return respond(413,{error:'요청이 너무 큽니다.'});
  const input=JSON.parse(raw);
  const email=String(input.email||'').trim().toLowerCase();
  const role=String(input.role||'');
  const district=String(input.district||'지역');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!roles.includes(role)||!['활동','비활성'].includes(input.status))return respond(400,{error:'이메일과 계정 정보를 확인하세요.'});
  if(role==='admin'&&actor.role!=='admin')return respond(403,{error:'관리자 계정은 관리자만 등록할 수 있습니다.'});
  if(role==='district'&&!/^(10|[1-9])구역$/.test(district))return respond(400,{error:'담당 구역을 선택하세요.'});
  if(role==='district'&&!input.memberId)return respond(400,{error:'구역장 계정에 연결할 회원을 선택하세요.'});
  const redirectTo=Deno.env.get('APP_AUTH_REDIRECT_URL')||'https://management-system-six-omega.vercel.app/#CM-03';
  const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo});
  if(inviteError||!invited.user)return respond(400,{error:'이미 등록된 이메일인지 확인하세요. 초대 메일 발송 설정도 확인해야 합니다.'});
  const {error:linkError}=await admin.rpc('app_provision_account',{p_auth_id:invited.user.id,p_data:{email,memberId:input.memberId||null,role,district,status:input.status,enforceAssignments:input.enforceAssignments===true||input.enforceAssignments==='true',_invitedBy:actor.userId}});
  if(linkError){
   // Auth may return a previously invited identity. Never delete it on a partial failure.
   // An unlinked identity has no app access because private.actor() requires an active account.
   return respond(400,{error:'초대 후 회원·계정 연결에 실패했습니다. 관리자에게 인증 사용자와 기존 계정 연결 확인을 요청하세요.'});
  }
  return respond(201,{id:invited.user.id,message:'초대 메일을 발송했습니다.'});
 }catch{return respond(500,{error:'계정 초대 처리에 실패했습니다. 잠시 후 다시 시도하세요.'})}
});
