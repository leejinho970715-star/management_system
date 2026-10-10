const fs=require('node:fs');
const {chromium}=require('C:/Users/tlscj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:4174').replace(/\/$/,'');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/tlscj/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.prototype);const screens=await page.evaluate(()=>window.prototype.screens),roles=await page.evaluate(()=>Object.keys(window.prototype.roles));
 const views=[...screens.map(s=>({id:s.id,role:s.id==='AD-01'?'admin':s.id==='CM-01'?'district':s.allow[0]})),...roles.filter(r=>r!=='lead').map(role=>({id:'CM-02',role})),...['출결','심방','전도','교육','회계','사명','구역 이동'].map(tab=>({id:'MB-03',role:'lead',tab}))];
 const results=[];
 for(const width of [320,375,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  for(const s of views){const role=s.role;await page.goto(base+'/?role='+role+'#'+s.id);await page.waitForFunction(()=>window.prototype);if(s.tab)await page.locator(`[data-action="member-tab"][data-tab="${s.tab}"]`).click();await page.evaluate(()=>document.fonts.ready);
   const audit=await page.evaluate(()=>{
    const width=innerWidth;const overflow=[];const small=[];const checkbox=[];
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;while(node=walker.nextNode()){
     if(!node.textContent.trim())continue;const el=node.parentElement;if(!el||el.closest('script,style,option,.table-wrap,.subtabs'))continue;
     if(width<=720&&el.closest('.sidebar:not(.open)'))continue;
     const style=getComputedStyle(el);if(style.visibility==='hidden'||style.display==='none'||!el.getClientRects().length)continue;
     const range=document.createRange();range.selectNodeContents(node);const rects=[...range.getClientRects()];
     if(rects.some(r=>r.width&&((r.right>width+1)||(r.left< -1))))overflow.push({text:node.textContent.trim().slice(0,80),selector:el.className});
     if(parseFloat(style.fontSize)<16)small.push({text:node.textContent.trim().slice(0,40),size:style.fontSize});
    }
    for(const label of document.querySelectorAll('label:has(>input[type="checkbox"])')){
     if(!label.getClientRects().length)continue;const input=label.querySelector('input'),ir=input.getBoundingClientRect();
     const text=[...label.childNodes].find(n=>n.nodeType===3&&n.textContent.trim())||label.querySelector('span')?.firstChild;
     if(!text)continue;const range=document.createRange();range.selectNodeContents(text);const tr=range.getClientRects()[0];if(tr&&Math.abs((ir.top+ir.height/2)-(tr.top+tr.height/2))>6)checkbox.push(label.textContent.trim().slice(0,60));
    }
    return {pageOverflow:document.documentElement.scrollWidth>width,overflow,small,checkbox};
   });results.push({id:s.id,role,tab:s.tab,width,...audit});
   if(audit.pageOverflow||audit.overflow.length||audit.small.length||audit.checkbox.length)await page.screenshot({path:'output/qa/responsive-'+s.id+'-'+width+'.png',fullPage:true});
  }
 }
 const failures=results.filter(r=>r.pageOverflow||r.overflow.length||r.small.length||r.checkbox.length);fs.writeFileSync('output/qa/responsive-verification.json',JSON.stringify({results,failures,errors},null,2));console.log(JSON.stringify({views:results.length,failureCount:failures.length,examples:failures.slice(0,5),errors}));await browser.close();if(failures.length||errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
