import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {runtimeConfig} from './scripts/runtime-config.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'app');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon'};
const port=Number(process.argv[2]||4173);
const siteOrigin=process.env.SITE_URL||'http://127.0.0.1:'+port;
http.createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  if(pathname==='/app.js'||pathname==='/runtime-config.js'){
   try{
    const source=pathname==='/runtime-config.js'?runtimeConfig():(await build({entryPoints:[path.join(root,'app.js')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'})).outputFiles[0].text;
    res.writeHead(200,{'Content-Type':types['.js'],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(source);
   }catch(err){console.error(err.message);res.writeHead(500);res.end('Build failed')}
   return;
  }
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(path.extname(file)==='.html'?data.toString('utf8').replaceAll('__SITE_ORIGIN__',siteOrigin):data)});
}).listen(port,'127.0.0.1',()=>console.log('신도림 화면설계 시안: http://127.0.0.1:'+port));
