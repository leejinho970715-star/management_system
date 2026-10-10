const fs=require('node:fs');
const {chromium}=require('C:/Users/tlscj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const base=(process.argv[2]||'http://127.0.0.1:4174').replace(/\/$/,'');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/tlscj/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
 const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name)};
 await page.goto(base+'/?role=district#AD-01');await page.waitForFunction(()=>window.prototype);await page.evaluate(()=>window.prototype.reset());
 check(await page.locator('h2').innerText()==='관리자 로그인','dedicated administrator login');
 await page.locator('[data-action="toggle-admin-password"]').click();check(await page.locator('input[name="password"]').getAttribute('type')==='text','password visibility toggle');
 await page.locator('[data-action="toggle-admin-password"]').click();await page.locator('input[name="password"]').fill('wrong');await page.locator('#admin-login-form button[type="submit"]').click();check(await page.locator('#admin-login-error').isVisible(),'incorrect demo login shows inline error');
 await page.locator('input[name="password"]').fill('demo1234');await page.locator('input[name="remember"]').check();await page.locator('#admin-login-form button[type="submit"]').click();await page.waitForSelector('.admin-context');
 check(await page.locator('h1').innerText()==='관리자 대시보드','admin login opens admin dashboard');
 check(await page.locator('.sidebar .nav-item').count()===9,'nine administrator navigation entries');check(!await page.locator('.sidebar a[href="#FN-01"]').count(),'administrator has no finance write navigation');
 check(await page.evaluate(()=>window.prototype.getState().audit.some(a=>a.action==='관리자 시안 접속')),'admin login is recorded in audit');
 await page.locator('.admin-shortcuts a[href="#SY-02"]').click();await page.waitForSelector('#generic-form');
 await page.locator('#generic-form input[name="email"]').fill('qa-admin-user@example.test');await page.locator('#generic-form select[name="memberId"]').selectOption('m20');await page.locator('#generic-form select[name="role"]').selectOption('district');await page.locator('#generic-form select[name="district"]').selectOption('4구역');await page.locator('#generic-form button[type="submit"]').click();
 check(await page.evaluate(()=>window.prototype.getState().accounts.some(a=>a.email==='qa-admin-user@example.test'&&a.district==='4구역')),'admin registers a scoped account');
 const accountRow=page.locator('tbody tr').filter({hasText:'qa-admin-user@example.test'});await accountRow.locator('button').click();await page.locator('#edit-record-form select[name="status"]').selectOption('비활성');await page.locator('#edit-record-form button[type="submit"]').click();
 check(await page.evaluate(()=>window.prototype.getState().accounts.find(a=>a.email==='qa-admin-user@example.test').status)==='비활성','admin can deactivate an ordinary account');
 const adminRow=page.locator('tbody tr').filter({hasText:'admin@example.test'});await adminRow.locator('button').click();await page.locator('#edit-record-form select[name="status"]').selectOption('비활성');await page.locator('#edit-record-form button[type="submit"]').click();check(await page.evaluate(()=>window.prototype.getState().accounts.filter(a=>a.role==='admin'&&a.status==='활동').length)===1,'last active administrator stays enabled');await page.locator('#modal [data-action="close"]').click();
 await page.locator('.sidebar a[href="#SY-01"]').click();await page.waitForSelector('#settings-form');await page.locator('input[name="absenceWeeks"]').fill('12');await page.locator('#settings-form button[type="submit"]').click();check(await page.evaluate(()=>window.prototype.getState().settings.absenceWeeks)===12,'admin saves operating settings');
 await page.locator('.sidebar a[href="#SY-04"]').click();await page.waitForFunction(()=>document.querySelector('h1')?.textContent==='변경·조회 이력');check((await page.locator('.content').innerText()).includes('기록 수정'),'admin can inspect modification audit');
 await page.locator('[data-action="logout"]').click();await page.waitForSelector('#admin-login-form');check(await page.evaluate(()=>sessionStorage.getItem('demo-role'))===null,'logout clears demo role');
 await page.goto(base+'/?role=district#AD-02');await page.waitForFunction(()=>window.prototype);check(await page.locator('.lockbox').count()===1,'ordinary role cannot use admin dashboard');
 await page.evaluate(()=>window.prototype.reset());
 for(const id of ['AD-01','AD-02']){await page.goto(base+'/?role=admin#'+id);await page.waitForFunction(()=>window.prototype);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'output/qa/'+id+'-color.png'});}
 await page.setViewportSize({width:390,height:844});
 for(const id of ['AD-01','AD-02']){await page.goto(base+'/?wireframe=1&role=admin#'+id);await page.waitForFunction(()=>window.prototype);check(await page.evaluate(()=>document.documentElement.scrollWidth)<=390,id+' mobile layout has no overflow');await page.screenshot({path:'tmp/pdfs/screens/'+id+'-mobile.png'});}
 check(errors.length===0,'no administrator runtime errors');fs.writeFileSync('output/qa/admin-verification.json',JSON.stringify({base,checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
