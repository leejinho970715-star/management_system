import {chatCategories,parseChatQuery} from './chat-query.js';
import {roles} from './catalog.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');
const readable=v=>String(v??'').replace(/\b(lead|district|visitor|evangelist|educator|finance|tf|admin)\b/g,key=>roles[key]);
const robot='<img src="assets/robot-assistant.png" alt="" width="56" height="56">';
export function createChatbot({remote,allowed,isAuthenticated}){
 let identity='',generation=0,busy=false,available=[],category='',lastRequest=null;
 const host=document.createElement('div');host.id='chatbot';host.hidden=true;document.body.append(host);
 const el=s=>host.querySelector(s);
 function close(){el('dialog')?.close();el('.chat-launcher')?.setAttribute('aria-expanded','false');el('.chat-launcher')?.focus()}
 function redraw(){
  const own=remote.authority?.role==='district'?remote.authority.district:'';
  host.innerHTML=`<button class="chat-launcher" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="chat-dialog">${robot}<span>도림 도우미</span><span class="chat-launcher-arrow" aria-hidden="true">↗</span></button>
  <dialog id="chat-dialog" class="chat-dialog" aria-labelledby="chat-title"><div class="chat-layout">
   <header class="chat-head">${robot}<div><h2 id="chat-title">도림 도우미</h2><p><span class="chat-live-dot"></span>우리 업무를 찾는 DB 챗봇</p></div><button type="button" class="chat-close" aria-label="챗봇 닫기">×</button></header>
   <div class="chat-scroll"><section class="chat-welcome"><p class="chat-eyebrow">무엇을 찾아드릴까요?</p><h3>필요한 정보를<br>편하게 물어보세요.</h3><p>항목을 누르거나 질문을 입력하면<br>내 권한에 맞는 DB 기록을 찾아드려요.</p></section>
   <nav class="chat-categories" aria-label="챗봇 조회 항목">${available.map(c=>`<button type="button" data-chat-category="${c.id}" aria-pressed="${c.id===category}">${c.label}</button>`).join('')}</nav>
   <details class="chat-filters"><summary>조회 범위와 기간</summary><div class="chat-filter-grid">
    <label>구역<select name="chat-district">${own?`<option>${esc(own)}</option>`:'<option value="">허용된 전체 범위</option>'+Array.from({length:10},(_,i)=>`<option>${i+1}구역</option>`).join('')}</select></label>
    <label>연월 <span>(납부·심방)</span><input name="chat-month" type="month" min="2020-01" max="2100-12" value="${remote.today.slice(0,7)}" required></label>
    <label>연도 <span>(출결·보고)</span><input name="chat-year" type="number" min="2020" max="2100" value="${remote.year}" required></label>
    <label>주차 <span>(출결·보고)</span><input name="chat-week" type="number" min="1" max="54" value="${remote.currentWeek}" required></label>
    <label>예배 <span>(출결)</span><select name="chat-service">${(remote.baseline?.settings?.services||['주일','수요','금요']).map(s=>`<option>${esc(s)}</option>`).join('')}</select></label>
   </div><p>질문에 구역·연월·주차를 쓰면 선택값보다 우선 적용됩니다.</p></details>
   <p class="chat-example">예: <button type="button" class="chat-example-button">${esc(available.find(c=>c.id===category)?.example||'구역 현황')}</button><br>이름·이메일·과정명도 검색할 수 있어요.</p>
   <div class="chat-messages" role="log" aria-label="조회 대화" aria-live="polite" aria-relevant="additions"></div>
   </div><form class="chat-form"><label class="sr-only" for="chat-question">조회할 질문</label><div class="chat-input-row"><input id="chat-question" name="question" maxlength="200" autocomplete="off" placeholder="질문이나 검색어를 입력하세요"><button type="submit" aria-label="질문 보내기">↑</button></div><p>현재 DB 기준 · 개인정보 마스킹 · 대화는 이 화면에서만 유지</p><div class="chat-status" role="status"></div></form>
  </div></dialog>`;
  el('.chat-launcher').onclick=()=>{el('dialog').showModal();el('.chat-launcher').setAttribute('aria-expanded','true');el('#chat-question').focus()};
  el('.chat-close').onclick=close;el('dialog').addEventListener('cancel',()=>el('.chat-launcher').setAttribute('aria-expanded','false'));
  el('.chat-form').onsubmit=e=>{e.preventDefault();e.stopPropagation();send(el('#chat-question').value)};
  el('.chat-example-button').onclick=()=>send(available.find(c=>c.id===category)?.example||'구역 현황');
  el('.chat-categories').onclick=e=>{const b=e.target.closest('[data-chat-category]');if(b)send('',b.dataset.chatCategory)};
 }
 function defaults(){return {category,district:el('[name=chat-district]').value||null,month:el('[name=chat-month]').value,year:Number(el('[name=chat-year]').value),week:Number(el('[name=chat-week]').value),service:el('[name=chat-service]').value}}
 function message(text,type='assistant'){const node=document.createElement('div');node.className='chat-message '+type;node.textContent=text;el('.chat-messages').append(node);return node}
 function trim(){while(el('.chat-messages').children.length>12)el('.chat-messages').firstElementChild.remove()}
 function scroll(){el('.chat-scroll').scrollTop=el('.chat-scroll').scrollHeight}
 async function send(text,selected=null,offset=0,base=null){
  if(busy)return;
  let request;
  try{
   request=offset?{...(base||lastRequest),offset}:parseChatQuery(text,{...defaults(),...(selected?{category:selected}:{})});
   if(!available.some(c=>c.id===request.category))throw Error('현재 역할에서 조회할 수 없는 항목입니다. 위에 표시된 항목을 선택해 주세요.');
   for(const i of host.querySelectorAll('.chat-filters input'))if(!i.checkValidity())throw Error('조회 범위의 연월·연도·주차를 확인해 주세요.');
  }catch(error){message(error.message);scroll();return}
  category=request.category;
  host.querySelectorAll('[data-chat-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chatCategory===category)));
  el('.chat-example-button').textContent=available.find(c=>c.id===category).example;
  message(offset?'다음 결과 보기':text||available.find(c=>c.id===category).label+' 조회','user');trim();
  el('#chat-question').value='';busy=true;const current=++generation;
  el('.chat-status').textContent='DB에서 확인하고 있어요…';el('.chat-form').setAttribute('aria-busy','true');el('.chat-form button').disabled=true;scroll();
  try{
   const data=await remote.chatSearch(request);
   if(current!==generation||host.hidden)return;
   lastRequest=request;
   const label=available.find(c=>c.id===category).label;
   const period=['attendance','reports'].includes(category)?`${request.year}년 ${request.week}주차${category==='attendance'?' · '+request.service:''}`:['visits','finance'].includes(category)?request.month:'전체 기간';
   const row=message('');row.classList.add('chat-result');
   row.innerHTML=`<div class="chat-result-meta">${esc(label)} · ${esc(data.scope)}<br>${esc(period)}${request.term?' · 검색: '+esc(request.term):''}${request.status?' · 상태: '+esc(request.status):''}</div><h3>${number(data.total)}건을 찾았어요.</h3>
   ${category==='finance'?`<p class="chat-total">납부 합계 <strong>${number(data.amount)}원</strong></p>`:''}
   ${data.attendance?`<p class="chat-total">출석률 <strong>${data.attendance.total?number(data.attendance.rate)+'%':'집계 대상 없음'}</strong></p><p>대상 ${number(data.attendance.total)}명 · 출석/온라인 ${number(data.attendance.present)}명 · 미입력 ${number(data.attendance.missing)}명</p>`:''}
   ${data.total?`<p class="chat-summary">${Object.entries(data.statuses).map(([s,n])=>esc(s)+' '+number(n)+'건').join(' · ')}</p><ul class="chat-result-list">${data.items.map(r=>`<li><div><strong>${esc(readable(r.title))}</strong><span>${esc(readable(r.detail))}</span></div><div class="chat-result-end"><span class="chat-badge">${esc(r.status)}</span>${r.amount!==null?`<strong>${number(r.amount)}원</strong>`:''}</div></li>`).join('')}</ul><p>${number(data.offset+1)}–${number(data.offset+data.items.length)} / ${number(data.total)}건</p>`:'<p>조건에 맞는 기록이 없습니다.<br>기간·구역·검색어를 확인하거나 업무 화면에서 첫 기록을 등록해 주세요.</p>'}
   <div class="chat-result-actions"><a href="#${esc(data.screen)}" class="chat-open-screen">업무 화면 열기 ↗</a>${data.total>data.offset+data.items.length?'<button type="button" class="chat-next">다음 20건</button>':''}</div><p class="chat-time">DB 확인 ${esc(new Date(data.queriedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))}</p>`;
   row.querySelector('.chat-open-screen').onclick=close;
   const next=row.querySelector('.chat-next');if(next)next.onclick=()=>{if(!busy)send('',null,data.offset+data.limit,request)};
  }catch(error){if(current===generation&&!host.hidden)message(error.code==='42501'?'조회 권한이 변경되었거나 로그인이 만료되었습니다. 새로고침 후 다시 로그인해 주세요.':'DB 조회를 완료하지 못했습니다. '+error.message)}
  finally{if(current===generation){busy=false;el('.chat-status').textContent='';el('.chat-form').removeAttribute('aria-busy');el('.chat-form button').disabled=false;trim();scroll()}}
 }
 return {sync(){
  const active=remote.enabled&&isAuthenticated()&&remote.authority&&!['#CM-01','#AD-01'].includes(location.hash);
  const key=active?JSON.stringify([remote.authority.userId,remote.authority.role,remote.authority.district,remote.authority.menus,remote.authority.menuRestricted]):'';
  if(key!==identity){generation++;busy=false;identity=key;el('dialog')?.close();host.innerHTML='';lastRequest=null;
   if(active){available=chatCategories.filter(c=>allowed(c.id==='reports'&&remote.authority.role==='lead'?'WR-02':c.screen));category=available[0]?.id||'';redraw()}}
  host.hidden=!active;
 }};
}
