import {entities,recordId} from './entities.js';
const writers={members:['lead','district','tf'],attendance:['lead','district','visitor'],prospects:['lead','district','evangelist'],contacts:['lead','district','evangelist'],visits:['lead','district','visitor'],feedback:['lead','district','visitor'],interviews:['lead','district'],cases:['lead','district'],worship:['lead','district'],courses:['lead','educator'],courseAttendance:['lead','educator'],exams:['lead','educator'],examResults:['lead','educator'],contributions:['finance'],regions:['lead','tf','admin'],districts:['lead','tf','admin'],positions:['lead','tf','admin'],appointments:['lead','tf','admin'],relationships:['lead','district'],meetings:['lead'],actions:['lead','district','evangelist','visitor','educator','finance']};
const writeScreens={members:'MB-02',attendance:'AT-01',prospects:'EV-02',contacts:'EV-04',visits:'VS-01',feedback:'AT-05',interviews:'VS-03',cases:'AT-03',worship:'ED-01',courses:'ED-02',courseAttendance:'ED-03',exams:'ED-04',examResults:'ED-05',contributions:'FN-01',regions:'OR-01',districts:'OR-02',positions:'OR-03',appointments:'OR-04',relationships:'AT-04',meetings:'MT-01',actions:'MT-02'};
export function editableCollections(group,role,authority){return Object.entries(entities).filter(([k,e])=>e.group===group&&writers[k]?.includes(role)&&(!authority?.menuRestricted||authority.menus?.some(m=>m===(k==='interviews'&&role==='lead'?'VS-04':writeScreens[k])||m===e.group))).map(([key,e])=>[key,e.title])}
export function managementList(collection,state,h){
 const e=entities[collection],rows=state[collection]||[];
 const columns=e.fields.filter(f=>!['textarea','checkbox'].includes(f.type)).slice(0,4);
 return `<div class="filter-row">${(collection==='actions'&&h.role!=='lead')||['districts','regions'].includes(collection)?'':h.btn('새 기록','record-new',true,`data-collection="${collection}"`)}${['districts','regions'].includes(collection)?'':h.btn('삭제한 기록','record-trash',false,`data-collection="${collection}"`)}</div>`+h.table([...columns.map(f=>f.label),'처리'],rows.map(row=>[...columns.map(f=>h.esc(f.ref==='members'?h.label(row[f.key]):(h.roles[row[f.key]]||row[f.key])??'-')),`${h.btn('수정','record-edit',false,`data-collection="${collection}" data-id="${h.esc(row.id||recordId(collection,row))}"`)} ${['districts','regions'].includes(collection)?'':h.btn('삭제','record-delete',false,`data-collection="${collection}" data-id="${h.esc(row.id||recordId(collection,row))}"`)}`]));
}
export function managementForm(collection,row,state,h){
 const e=entities[collection],editing=!!row;
 const inputs=e.fields.filter(f=>!['createdAt','createdBy','updatedAt','updatedBy'].includes(f.key)&&(collection!=='actions'||h.role==='lead'||f.key==='status')).map(f=>{
  const identity=editing&&e.unique?.includes(f.key);
  let value=row?.[f.key];
  if(value==null)value=f.key==='year'?h.year:f.key==='week'?h.week:f.key==='service'?state.settings.services[0]:f.key==='district'?h.district==='전체 구역'?'1구역':h.district:f.type==='date'&&f.required?h.today:f.type==='month'?h.today.slice(0,7):f.values?.[0]??'';
  const extra=`${f.required?'required':''} ${identity?'disabled':''}`;
  if(f.type==='checkbox')return `<label class="checkline field"><input type="checkbox" name="${f.key}" ${value?'checked':''}><span>${h.esc(f.label)}</span></label>`;
  if(f.ref)return h.sf(f.key,f.label,[['','선택하세요'],...(state[f.ref]||[]).map(r=>[r.id,f.ref==='members'?h.label(r.id):r.name||r.title||r.id])],value,extra);
  if(f.type==='select')return h.sf(f.key,f.label,f.values.map(v=>[v,h.roles[v]||v]),value,extra);
  if(f.type==='districtScope')return h.sf(f.key,f.label,['지역',...state.districts.map(d=>d.id)],value,extra);
  return h.field(f.key,f.label,f.type,value,extra+(f.type==='number'?` min="${f.min}" max="${f.max}"`:' maxlength="'+(f.type==='textarea'?10000:500)+'"'));
 }).join('');
 return `<p class="muted">${h.esc(e.title)} 정보를 ${editing?'수정':'등록'}합니다.</p><form id="record-editor-form"><input type="hidden" name="collection" value="${collection}"><input type="hidden" name="recordId" value="${h.esc(row?.id||'')}"><div class="form-grid">${inputs}</div><div class="form-actions">${h.btn('취소','close')}<button class="btn primary" type="submit">저장</button></div></form>`;
}
