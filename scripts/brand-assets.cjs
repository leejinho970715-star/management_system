const fs=require('node:fs');
const path=require('node:path');
const sharp=require('C:/Users/tlscj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=path.resolve('app/assets');
(async()=>{
 await sharp(path.join(dir,'og-image-generated.png')).resize(1200,630,{fit:'fill'}).png().toFile(path.join(dir,'og-image.png'));
 const entries=[];for(const size of [16,32,48,64]){const data=await sharp(path.join(dir,'logo.jpg')).resize(size,size).png().toBuffer();entries.push({size,data});if(size===32)fs.writeFileSync(path.join(dir,'favicon-32.png'),data)}
 await sharp(path.join(dir,'logo.jpg')).resize(180,180).png().toFile(path.join(dir,'apple-touch-icon.png'));
 const header=Buffer.alloc(6);header.writeUInt16LE(1,2);header.writeUInt16LE(entries.length,4);let offset=6+entries.length*16;const dirs=entries.map(({size,data})=>{const d=Buffer.alloc(16);d[0]=size;d[1]=size;d.writeUInt16LE(1,4);d.writeUInt16LE(32,6);d.writeUInt32LE(data.length,8);d.writeUInt32LE(offset,12);offset+=data.length;return d});fs.writeFileSync(path.join(dir,'favicon.ico'),Buffer.concat([header,...dirs,...entries.map(e=>e.data)]));
 console.log('Original logo, multi-size favicon, touch icon and 1200x630 OG image ready');
})().catch(e=>{console.error(e);process.exit(1)});
