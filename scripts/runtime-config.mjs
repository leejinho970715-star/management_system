import fs from 'node:fs';
export function runtimeConfig(){
 const source=fs.readFileSync(new URL('../app/runtime-config.js',import.meta.url),'utf8');
 const saved=JSON.parse(source.match(/window\.APP_CONFIG\s*=\s*(\{[\s\S]*\})\s*;?\s*$/)?.[1]||'{}');
 const hasEnvironment=!!(process.env.APP_SUPABASE_URL||process.env.APP_SUPABASE_PUBLISHABLE_KEY);
 if(!hasEnvironment&&saved.mode==='demo'&&!saved.supabaseUrl&&!saved.supabaseKey)return 'window.APP_CONFIG={"mode":"demo","supabaseUrl":"","supabaseKey":""};\n';
 const url=hasEnvironment?process.env.APP_SUPABASE_URL:saved.supabaseUrl,key=hasEnvironment?process.env.APP_SUPABASE_PUBLISHABLE_KEY:saved.supabaseKey;
 if(!hasEnvironment&&saved.mode!=='supabase')throw Error('Set runtime-config mode to supabase before adding connection keys');
 if(!url||!key)throw Error('Set both APP_SUPABASE_URL and APP_SUPABASE_PUBLISHABLE_KEY');
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&['127.0.0.1','localhost'].includes(parsed.hostname)))throw Error('Supabase URL must use HTTPS');
 if(!key.startsWith('sb_publishable_')){
  let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'))}catch{}
  if(claims?.role!=='anon')throw Error('Only a public publishable/anon key may be sent to the browser');
 }
 return 'window.APP_CONFIG='+JSON.stringify({mode:'supabase',supabaseUrl:parsed.origin,supabaseKey:key}).replaceAll('<','\\u003c')+';\n';
}
