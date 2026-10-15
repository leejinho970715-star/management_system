// Shared field contract. SQL validation is generated from this contract; authorization lives in SQL.
const f=(key,label,type='text',extra={})=>({key,label,type,...extra});
const ref=(key,label,to,required=true)=>f(key,label,'reference',{ref:to,required});
const choice=(key,label,values,required=true)=>f(key,label,'select',{values,required});
const date=(key,label,required=true)=>f(key,label,'date',{required});
const num=(key,label,min,max,required=true)=>f(key,label,'number',{min,max,required});
const text=(key,label,required=true)=>f(key,label,'text',{required});
const memo=(key,label,required=false)=>f(key,label,'textarea',{required});
const flag=(key,label)=>f(key,label,'checkbox');
const status=['활동','장기결석','이명','제적','사고처리'];
const stages=['찾기','정파','상담','복음방','센터','입교','중단'];
const roleNames=['lead','district','evangelist','visitor','educator','finance','tf','admin'];
const district=()=>ref('district','소속 구역','districts');
const member=()=>ref('memberId','회원','members');
const weekly=()=>[num('year','연도',2020,2100),num('week','주차',1,54)];
const model=(table,title,group,fields,options={})=>({table,title,group,fields,...options});
export const entities={
 districts:model('districts','구역','OR',[text('name','구역명'),ref('leaderId','구역장','members',false),choice('status','상태',['활동','비활성'])]),
 regions:model('regions','지역','OR',[text('name','지역명'),ref('leaderId','지역장','members',false),choice('status','상태',['활동','비활성'])]),
 members:model('members','회원','MB',[text('name','이름'),f('phone','연락처','tel',{required:true}),district(),choice('status','회원 상태',status),date('birthday','생년월일',false),text('address','주소',false),flag('consent','정보 수집 동의 확인'),date('consentAt','동의 확인일'),date('incidentAt','사고처리일',false),memo('reason','변경 사유')]),
 positions:model('positions','직책','OR',[text('name','직책명'),choice('scope','적용 범위',['지역','구역']),text('menus','허용 메뉴')]),
 accounts:model('accounts','계정','SY',[f('email','이메일','email',{required:true}),ref('memberId','연결 회원','members',false),choice('role','역할',roleNames),f('district','담당 구역','districtScope',{required:true}),choice('status','상태',['활동','비활성']),flag('enforceAssignments','직책 메뉴 제한 적용')],{managed:true}),
 attendance:model('attendance','출결','AT',[member(),...weekly(),text('service','예배 유형'),choice('status','출석 상태',['출석','온라인','결석','사유결석']),memo('reason','결석 사유')],{unique:['memberId','year','week','service']}),
 prospects:model('prospects','전도 대상자','EV',[text('name','이름'),f('phone','연락처','tel'),choice('age','연령대',['20대','30대','40대','50대','60대 이상']),choice('path','만난 경로',['지인 소개','모임','직장','기타']),ref('guideId','담당 인도자','members'),ref('leaderId','구역장','members'),choice('stage','단계',stages),date('enteredAt','단계 진입일'),memo('reason','단계 변경 사유'),memo('note','비고'),date('lastContact','최근 연락일',false)]),
 contacts:model('contacts','접촉 기록','EV',[ref('prospectId','대상자','prospects'),date('date','접촉일'),choice('method','방법',['대면','전화','문자']),memo('content','내용',true)]),
 stageHistory:model('stage_history','단계 이력','EV',[ref('prospectId','대상자','prospects'),choice('from','이전 단계',stages,false),choice('to','이후 단계',stages),date('date','변경일'),memo('reason','사유',true)],{managed:true}),
 visits:model('visits','심방 기록','VS',[member(),ref('visitorId','심방자','members'),date('date','심방일'),...weekly(),choice('type','심방 유형',['전화','대면']),memo('content','내용',true),text('action','후속조치',false),date('deadline','완료 기한',false),choice('status','처리 상태',['진행','완료']),flag('sensitive','민감 상담'),date('completedAt','완료일',false)]),
 feedback:model('feedback','인원별 피드백','AT',[member(),date('date','작성일'),memo('content','내용',true)]),
 interviews:model('interviews','면담 요청','VS',[member(),district(),choice('target','요청 대상',['지역장','회장']),memo('reason','요청 사유',true),choice('status','처리 상태',['요청','배정','일정확정','완료','취소']),date('requested','요청일'),choice('assignee','면담자',['지역장','회장'],false),date('date','면담일',false),memo('result','면담 결과')]),
 cases:model('absence_cases','장기결석 후속조치','AT',[member(),num('weeks','연속 결석 주수',1,5400),ref('ownerId','담당자','members',false),choice('stage','처리 단계',['등재','배정','접촉','심방','단계향상','사고처리']),memo('result','처리 결과'),date('closedAt','종결일',false)]),
 worship:model('worship','구역예배','ED',[district(),...weekly(),flag('conducted','진행 여부'),date('date','진행일',false),num('count','참석 인원',0,10000,false),text('title','말씀 제목',false),memo('note','특이사항')],{unique:['district','year','week']}),
 courses:model('courses','교육 과정','ED',[text('name','과정명'),date('start','시작일'),date('end','종료일'),num('sessions','총 회차',1,1000),choice('status','상태',['진행','완료','비활성'])]),
 courseAttendance:model('course_attendance','교육 참석','ED',[member(),ref('courseId','교육 과정','courses'),num('session','회차',1,1000),flag('attended','참석'),date('date','교육일',false)],{unique:['memberId','courseId','session']}),
 exams:model('exams','시험','ED',[text('name','시험명'),ref('courseId','교육 과정','courses'),date('date','시행일'),choice('status','상태',['예정','완료','취소'])]),
 examResults:model('exam_results','시험 결과','ED',[member(),ref('examId','시험','exams'),flag('attended','응시'),num('score','점수',0,100,false)],{unique:['memberId','examId']}),
 contributions:model('contributions','납부','FN',[member(),choice('kind','납부 구분',['십일조','회비','서포터즈']),f('month','납부 연월','month',{required:true}),num('amount','금액 (원)',1,100000000),date('date','납부일')],{schema:'finance',unique:['memberId','kind','month']}),
 reports:model('reports','주간보고','WR',[f('district','구역','districtScope',{required:true}),...weekly(),choice('kind','보고 종류',['구역',...roleNames]),choice('status','상태',['작성중','제출','확인']),memo('opinion','소견',true),memo('note','특이사항'),memo('plan','다음 주 계획')],{managed:true,extra:['snapshot','submittedAt','confirmedAt','confirmedBy','service','reporterId'],unique:['district','year','week','kind']}),
 meetings:model('meetings','회의록','MT',[text('title','회의 제목'),date('date','회의일'),memo('agenda','안건',true),memo('content','회의 내용',true)],{extra:['attendees']}),
 actions:model('actions','결정사항','MT',[ref('meetingId','회의','meetings'),text('title','결정사항'),choice('owner','담당 역할',roleNames),date('deadline','완료 기한'),choice('status','처리 상태',['진행','완료','취소']),date('completedAt','완료일',false)],{extra:['originId','sourceMeetingId']}),
 appointments:model('appointments','사명자 배정','OR',[member(),ref('positionId','직책','positions'),f('district','소속','districtScope',{required:true}),date('start','시작일'),date('end','종료일',false),flag('revoked','권한 회수')]),
 relationships:model('relationships','관계 및 동의','AT',[member(),choice('type','관계 구분',['인교','섬강','전도','친분자']),ref('relatedId','연결 회원','members'),choice('consent','동의 상태',['확인'])]),
 moves:model('moves','구역 이동','MB',[member(),choice('type','이동 유형',['구역 이동','신규 편입','제적 / 사고처리']),ref('from','이전 구역','districts',false),ref('to','이후 구역','districts',false),date('date','처리일'),memo('reason','이동 사유',true)],{managed:true}),
 weeks:model('weeks','주차','OR',[num('year','연도',2020,2100),num('number','주차',1,54),date('start','시작일'),date('end','종료일')],{unique:['year','number']}),
 settings:model('settings','운영 기준','SY',[num('absenceWeeks','장기결석 기준 (주)',1,52),num('contactDays','연락 필요 기준 (일)',1,365),num('retentionMonths','보관기간 (개월)',1,120,false)],{managed:true,extra:['services','confirmed']}),
};
export const collectionKeys=Object.keys(entities);
function identity(key,parts){
 const bytes=new TextEncoder().encode(JSON.stringify(parts.map(v=>String(v??''))));
 const encoded=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 return key+':'+encoded;
}
export function recordId(key,row){
 if(key==='reports'&&row.kind!=='구역')return identity(key,[row.district||'지역',row.year,row.week,row.kind,row.reporterId]);
 if(entities[key]?.unique)return identity(key,entities[key].unique.map(k=>row[k]));
 return row.id;
}
