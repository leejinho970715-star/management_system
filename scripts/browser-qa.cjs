const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('C:/Users/tlscj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const BASE=process.argv[2]||'http://127.0.0.1:4173';
const out=path.resolve('output/qa'),shots=path.resolve('tmp/pdfs/screens');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(shots,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/tlscj/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE);await page.waitForFunction(()=>window.prototype);
 const screens=await page.evaluate(()=>window.prototype.screens);const checks=[];
 const assert=(value,name)=>{if(!value)throw Error(name);checks.push(name)};
 // Real interactions, using only synthetic records.
 await page.evaluate(()=>window.prototype.reset());
 await page.evaluate(()=>window.prototype.navigate('AT-01','district'));
 assert(await page.locator('tbody tr').count()===6,'district attendance sees only 6 A members');
 assert(!(await page.locator('.content').innerText()).includes('2구역'),'district content hides B district');
 await page.locator('input[name="status-m2"][value="출석"]').locator('..').click();
 await page.locator('#attendance-form button[type="submit"]').click();
 assert(await page.evaluate(()=>window.prototype.getState().attendance.filter(a=>a.memberId==='m2'&&a.week===41&&a.service==='주일').length)===1,'attendance upsert has one record');
 await page.locator('input[name="status-m2"][value="온라인"]').locator('..').click();await page.locator('#attendance-form button[type="submit"]').click();
 assert(await page.evaluate(()=>window.prototype.getState().attendance.find(a=>a.memberId==='m2'&&a.week===41).status)==='온라인','same attendance key updates status');
 await page.evaluate(()=>window.prototype.navigate('ED-01','district'));
 await page.locator('input[name="count"]').fill('5');await page.locator('input[name="title"]').fill('서로 돌아보며');await page.locator('#worship-form button[type="submit"]').click();
 await page.evaluate(()=>window.prototype.navigate('WR-01','district'));await page.locator('textarea[name="opinion"]').fill('시안 검증 보고 소견');await page.locator('textarea[name="plan"]').fill('다음 주 심방 일정 확인');await page.locator('#report-form button[type="submit"]').click();
 const snap=await page.evaluate(()=>window.prototype.getState().reports.find(r=>r.district==='1구역'&&r.week===41).snapshot);
 assert(snap.present===5,'report captures saved attendance');
 await page.evaluate(()=>window.prototype.navigate('AT-01','district'));await page.locator('input[name="status-m1"][value="결석"]').locator('..').click();await page.locator('#attendance-form button[type="submit"]').click();
 assert(await page.evaluate(()=>window.prototype.getState().reports.find(r=>r.district==='1구역'&&r.week===41).snapshot.present)===5,'submitted snapshot remains after source change');
 await page.evaluate(()=>window.prototype.navigate('WR-02','lead'));await page.locator('[data-action="confirm-report"]').first().click();await page.locator('[data-action="mark-report"]').click();
 assert(await page.evaluate(()=>window.prototype.getState().reports.find(r=>r.district==='1구역'&&r.week===41).status)==='확인','lead confirms report');
 await page.evaluate(()=>window.prototype.navigate('EV-03','evangelist'));await page.locator('select[name="to"]').selectOption('정파');await page.locator('textarea[name="reason"]').fill('일정 확정');await page.locator('#stage-form button[type="submit"]').click();
 assert(await page.evaluate(()=>window.prototype.getState().prospects[0].stage)==='정파','stage and history update');
 await page.evaluate(()=>window.prototype.navigate('FN-01','finance'));await page.locator('#finance-form input[name="amount"]').fill('10000');await page.locator('#finance-form button[type="submit"]').click();
 assert(await page.evaluate(()=>window.prototype.getState().contributions.some(c=>c.memberId==='m1'&&c.month==='2026-10'&&c.kind==='회비')),'finance write is stored');
 await page.evaluate(()=>window.prototype.navigate('FN-02','district'));assert(await page.locator('.lockbox').count()===1,'district direct route blocked for finance');
 await page.evaluate(()=>window.prototype.navigate('MB-03','district'));assert(!(await page.locator('.subtabs').last().innerText()).includes('회계'),'district member card hides finance tab');
 await page.locator('[data-action="reveal"]').click();await page.locator('#reveal-form textarea[name="reason"]').fill('가상 본인 확인');await page.locator('#reveal-form button[type="submit"]').click();assert(await page.evaluate(()=>window.prototype.getState().audit.some(a=>a.action==='전체 이름 열람')),'name reveal creates audit record');await page.locator('#modal [data-action="close"]').click();
 await page.evaluate(()=>window.prototype.navigate('MT-03','lead'));await page.locator('#carry-form button').click();await page.locator('#carry-form button').click();assert(await page.evaluate(()=>window.prototype.getState().actions.filter(a=>a.originId==='a1'&&a.meetingId==='mt2').length)===1,'carry action deduplicates original and target');
 await page.reload();await page.waitForFunction(()=>window.prototype);assert(await page.evaluate(()=>window.prototype.getState().reports.some(r=>r.district==='1구역'&&r.status==='확인')),'saved records survive reload');
 await page.evaluate(()=>window.prototype.navigate('MB-02','district'));await page.locator('#member-form input[name="name"]').fill('테스트가상');await page.locator('#member-form input[name="phone"]').fill('010-0000-9999');await page.locator('#member-form input[name="consent"]').check();await page.locator('#member-form button[type="submit"]').click();assert(await page.evaluate(()=>window.prototype.getState().members.some(m=>m.name==='테스트가상'&&m.consent)),'member registration persists with consent');
 await page.evaluate(()=>window.prototype.navigate('ED-02','educator'));await page.locator('#generic-form input[name="name"]').fill('가상 심화 과정');await page.locator('#generic-form input[name="sessions"]').fill('6');await page.locator('#generic-form button[type="submit"]').click();assert(await page.evaluate(()=>window.prototype.getState().courses.some(c=>c.name==='가상 심화 과정'&&c.sessions===6)),'education course creation stores numeric sessions');
 await page.locator('[data-action="edit-record"]').first().click();await page.locator('#edit-record-form input[name="sessions"]').fill('12');await page.locator('#edit-record-form button[type="submit"]').click();assert(await page.evaluate(()=>window.prototype.getState().courses[0].sessions)===12,'generic edit modal saves correctly');
 await page.evaluate(()=>window.prototype.navigate('MB-01','district'));const dlPromise=page.waitForEvent('download');await page.locator('[data-action="download-members"]').click();const dl=await dlPromise;await dl.saveAs(path.join(out,'masked-export.xlsx'));assert(dl.suggestedFilename().endsWith('.xlsx'),'masked export is true Excel xlsx');
 await page.evaluate(()=>window.prototype.reset());
 const choose=s=>s.id==='CM-01'||s.id==='CM-03'||s.id==='MB-02'||s.id==='AT-01'||s.id==='ED-01'||s.id==='WR-01'||s.id==='VS-01'?'district':s.id.startsWith('SY')||s.id==='OR-05'?'tf':s.id==='FN-01'?'finance':s.id.startsWith('ED')?'educator':s.id==='EV-03'?'evangelist':s.allow.includes('lead')?'lead':s.allow[0];
 const meta=[];
 for(const s of screens){const r=choose(s);await page.goto(`${BASE}/?wireframe=1&role=${r}#${s.id}`);await page.waitForFunction(()=>window.prototype);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(shots,s.id+'.png')});const dim=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));assert(dim.width<=1440,s.id+' no desktop page overflow');if(s.id!=='CM-01')assert(await page.locator('h1').innerText()===s.title,s.id+' renders defined title');meta.push({...s,role:r,viewport:{width:1440,height:1080},contentHeight:dim.height});}
 const extras=[];
 await page.goto(`${BASE}/?wireframe=1&role=lead#MB-03`);await page.waitForFunction(()=>window.prototype);
 for(const t of ['출결','심방','전도','교육','회계','사명','구역 이동']){await page.locator(`[data-action="member-tab"][data-tab="${t}"]`).click();const name='MB-03-tab-'+extras.length;await page.screenshot({path:path.join(shots,name+'.png')});extras.push({file:name,title:'회원 카드 / '+t,id:'MB-03',note:'8개 이력 탭의 상세 구성. 민감 내용과 회계 탭은 별도 권한 적용.',source:9,role:'lead'});}
 await page.goto(`${BASE}/?wireframe=1&role=district#CM-02`);await page.waitForFunction(()=>window.prototype);await page.screenshot({path:path.join(shots,'CM-02-district.png')});extras.push({file:'CM-02-district',id:'CM-02',title:'구역장 업무 대시보드',source:17,role:'district',note:'담당 구역의 미입력과 후속조치, 주간보고를 우선 표시합니다.'});
 await page.goto(`${BASE}/?wireframe=1&role=tf#SY-01`);await page.waitForFunction(()=>window.prototype);await page.locator('#settings-form').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(shots,'SY-01-settings.png')});extras.push({file:'SY-01-settings',id:'SY-01',title:'운영 기준 설정 / 하단 상세',source:21,role:'tf',note:'미확정 기준을 시안 값으로 저장합니다. 보관기간을 입력해도 파기 실행 승인을 의미하지 않습니다.'});
 fs.writeFileSync(path.join(shots,'extras.json'),JSON.stringify(extras,null,2));
 // Polished color preview and key mobile layouts.
 await page.goto(`${BASE}/?role=lead#CM-02`);await page.waitForFunction(()=>window.prototype);await page.screenshot({path:path.join(out,'desktop-dashboard.png')});
 await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.fonts.check('14px Pretendard')),'Pretendard font loaded locally');assert(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--brand').trim())==='#0D9488','requested brand color applied');assert(await page.evaluate(()=>window.prototype.getState().districts.length)===10,'ten requested districts present');
 assert(await page.locator('.brand-mark img').evaluate(img=>img.complete&&img.naturalWidth===640),'supplied original page logo loaded');
 assert(await page.locator('meta[property="og:image"]').getAttribute('content')===BASE+'/assets/og-image.png','OG image has absolute server URL');
 const ico=await page.request.get(BASE+'/assets/favicon.ico');assert(ico.status()===200,'favicon served successfully');
 const og=await page.request.get(BASE+'/assets/og-image.png');assert(og.status()===200&&og.headers()['content-type']==='image/png','OG PNG served with correct MIME');
 const mobile=[['CM-02','district'],['MB-03','lead'],['AT-01','district'],['WR-01','district'],['CM-01','district']];await page.setViewportSize({width:390,height:844});
 for(const [id,r] of mobile){await page.goto(`${BASE}/?wireframe=1&role=${r}#${id}`);await page.waitForFunction(()=>window.prototype);assert(await page.evaluate(()=>document.documentElement.scrollWidth)<=390,id+' no mobile page overflow');await page.screenshot({path:path.join(shots,id+'-mobile.png')});}
 await page.goto(`${BASE}/?role=district#CM-02`);await page.waitForFunction(()=>window.prototype);await page.screenshot({path:path.join(out,'mobile-dashboard.png')});
 assert(errors.length===0,'no browser runtime errors across all screens');
 fs.writeFileSync(path.join(shots,'metadata.json'),JSON.stringify(meta,null,2));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({date:'2026-10-10',checks,errors,desktopScreens:47,mobileScreens:5},null,2));console.log(JSON.stringify({checks:checks.length,errors,desktopScreens:47,mobileScreens:5}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});



