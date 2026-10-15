const roles=['lead','district','evangelist','visitor','educator','finance','tf','admin'];
function environmentKey(env,dictionary,single,legacy){
 const raw=env(dictionary);if(raw){try{const keys=JSON.parse(raw);const key=keys.default||Object.values(keys).find(v=>typeof v==='string');if(typeof key==='string')return key}catch{}}
 return env(single)||env(legacy)||'';
}
export function createAccountHandler({createClient,env}){
 const allowedOrigins=new Set(['https://management-system-six-omega.vercel.app','https://leejinho970715-star.github.io',...(env('APP_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean)]);
 return async(req)=>{
  const origin=req.headers.get('origin')||'';
  const cors={'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
  const respond=(status,body)=>Response.json(body,{status,headers:cors});
  if(origin&&!allowedOrigins.has(origin))return respond(403,{error:'허용되지 않은 사이트입니다.'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return respond(405,{error:'지원하지 않는 요청입니다.'});
  const authorization=req.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))return respond(401,{error:'로그인이 필요합니다.'});
  const url=env('SUPABASE_URL'),publicKey=environmentKey(env,'SUPABASE_PUBLISHABLE_KEYS','SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY'),serviceKey=environmentKey(env,'SUPABASE_SECRET_KEYS','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!publicKey||!serviceKey)return respond(503,{error:'서버 연결 설정을 확인하세요.'});
  const caller=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
   // Verify the actual JWT, then the current DB account, role, activation, and session.
   const {data:identity,error:authError}=await caller.auth.getUser(authorization.slice(7));
   if(authError||!identity?.user)return respond(401,{error:'로그인 상태를 확인하세요.'});
   const {data:actor,error:actorError}=await caller.rpc('app_authority');
   if(actorError||!actor||!['admin','tf'].includes(actor.role))return respond(403,{error:'계정 관리 권한이 없습니다.'});
   if(Number(req.headers.get('content-length')||0)>10000)return respond(413,{error:'요청이 너무 큽니다.'});
   const raw=await req.text();if(raw.length>10000)return respond(413,{error:'요청이 너무 큽니다.'});
   let input;try{input=JSON.parse(raw)}catch{return respond(400,{error:'입력 형식을 확인하세요.'})}
   if(!input||Array.isArray(input)||typeof input!=='object')return respond(400,{error:'입력 형식을 확인하세요.'});
   const email=typeof input.email==='string'?input.email.trim().toLowerCase():'',password=typeof input.password==='string'?input.password:'',role=String(input.role||''),district=String(input.district||'지역');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!roles.includes(role)||!['활동','비활성'].includes(input.status))return respond(400,{error:'이메일과 계정 정보를 확인하세요.'});
   if(password.length<12||password.length>128)return respond(400,{error:'초기 비밀번호는 12~128자로 입력하세요.'});
   if(role==='admin'&&actor.role!=='admin')return respond(403,{error:'관리자 계정은 관리자만 등록할 수 있습니다.'});
   const account={email,memberId:input.memberId||null,role,district,status:input.status,enforceAssignments:input.enforceAssignments===true||input.enforceAssignments==='true'};
   const {error:validationError}=await admin.rpc('app_validate_account_registration',{p_data:account,p_inviter:actor.userId});
   if(validationError)return respond(400,{error:validationError.code==='42501'?'현재 계정 등록 권한이 없습니다.':validationError.message||'회원과 담당 구역을 확인하세요.'});
   // Creates a NEW identity only. Never overwrite/confirm/reset an existing user's identity.
   // Admin-managed email_confirm avoids SMTP; all requests passed the Auth and DB checks above.
   const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true});
   if(createError||!created?.user)return respond(createError?.status===429?429:400,{error:createError?.status===429?'요청이 많습니다. 잠시 후 다시 시도하세요.':createError?.code==='weak_password'?'더 안전한 초기 비밀번호를 입력하세요.':'이미 등록된 이메일인지 확인하세요. 기존 계정의 비밀번호는 변경되지 않습니다.'});
   const {error:linkError}=await admin.rpc('app_provision_account',{p_auth_id:created.user.id,p_data:{...account,_invitedBy:actor.userId}});
   if(linkError){
    // Roll back ONLY the identity from this request's successful createUser, never an existing user.
    const {error:rollbackError}=await admin.auth.admin.deleteUser(created.user.id);
    return respond(409,{error:rollbackError?'인증 계정은 생성됐지만 업무 연결에 실패했습니다. 관리자에게 계정 연결 복구를 요청하세요.':'계정 연결에 실패해 이번 등록을 취소했습니다. 회원·소속과 기존 계정을 확인하세요.'});
   }
   return respond(201,{id:created.user.id,message:'계정을 등록했습니다. 설정한 비밀번호로 바로 로그인할 수 있습니다.'});
  }catch{return respond(500,{error:'계정 등록 처리에 실패했습니다. 잠시 후 다시 시도하세요.'})}
 };
}
