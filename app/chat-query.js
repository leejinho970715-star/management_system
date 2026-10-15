// A transparent intent parser for supported DB searches; no external model or free-form SQL.
export const chatCategories=[
 {id:'members',label:'회원',screen:'MB-01',example:'1구역 회원 현황'},
 {id:'attendance',label:'출결',screen:'AT-01',example:'이번 주 출석률'},
 {id:'prospects',label:'전도',screen:'EV-01',example:'전도 대상자 현황'},
 {id:'visits',label:'심방',screen:'VS-02',example:'이번 달 심방 현황'},
 {id:'education',label:'교육 과정',screen:'ED-02',example:'진행 중 교육 과정'},
 {id:'finance',label:'납부',screen:'FN-02',example:'이번 달 납부 합계'},
 {id:'reports',label:'주간보고',screen:'WR-01',example:'이번 주 주간보고'},
 {id:'actions',label:'결정사항',screen:'MT-02',example:'진행 중 결정사항'},
 {id:'organization',label:'구역',screen:'OR-02',example:'구역 현황'},
 {id:'accounts',label:'계정',screen:'SY-02',example:'활동 계정 현황'},
];
export function parseChatQuery(text,defaults){
 const input=text.trim();if(input.length>200)throw Error('질문은 200자 이내로 입력해 주세요.');
 if(/삭제|수정|등록해|변경해|비밀번호|주소|전화번호|상담내용|상담 내용|미납|장기결석 연속|지난주|지난 주|지난달|지난 달|어제|내일/.test(input))throw Error('이 요청은 채팅 조회에서 지원하지 않습니다. 업무 화면을 이용하거나 조회 항목과 기간을 직접 선택해 주세요.');
 const matches=[[/계정|로그인|관리자/,'accounts'],[/납부|회계|회비|십일조|서포터즈/,'finance'],[/주간보고|보고서|보고/,'reports'],[/출석|출결|결석|온라인/,'attendance'],[/심방/,'visits'],[/교육|과정/,'education'],[/전도|대상자|정파|복음방|입교/,'prospects'],[/결정사항|액션|할 일/,'actions'],[/회원|교인/,'members'],[/구역|조직/,'organization']];
 const category=matches.find(([rx])=>rx.test(input.replace(/(?:10|[1-9])\s*구역/g,'')))?.[1]||defaults.category;
 if(!category)throw Error('조회 항목을 선택하거나 “회원 현황”, “이번 주 출석률”처럼 입력해 주세요.');
 let rest=input;const out={...defaults,category,term:'',status:'',offset:0};
 const district=input.match(/(?:^|\s)(10|[1-9])\s*구역/);if(district){out.district=district[1]+'구역';rest=rest.replace(district[0],' ')}
 const date=input.match(/(20\d{2})\s*[-년./]\s*(1[0-2]|0?[1-9])(?:월|(?=\s|$))/);
 if(date){out.month=date[1]+'-'+date[2].padStart(2,'0');out.year=+date[1];rest=rest.replace(date[0],' ')}
 else {const month=input.match(/(?:^|\s)(1[0-2]|0?[1-9])월/);if(month){out.month=String(out.year)+'-'+month[1].padStart(2,'0');rest=rest.replace(month[0],' ')}}
 const year=input.match(/(20\d{2})년/);if(year){out.year=+year[1];rest=rest.replace(year[0],' ')}
 const week=input.match(/(?:^|\s)([1-9]|[1-4]\d|5[0-4])주차/);if(week){out.week=+week[1];rest=rest.replace(week[0],' ')}
 const statusOptions={members:['장기결석','사고처리','활동','이명','제적'],attendance:['사유결석','온라인','결석'],prospects:['찾기','정파','상담','복음방','센터','입교','중단'],visits:['진행','완료'],education:['비활성','진행','완료'],reports:['작성중','제출','확인'],actions:['진행','완료','취소'],accounts:['비활성','활동'],organization:['비활성','활동']};
 out.status=(statusOptions[category]||[]).find(s=>rest.includes(s))||'';if(out.status)rest=rest.replace(out.status,' ');
 if(category==='attendance'&&/출석자|출석 명단/.test(rest)){out.status='출석';rest=rest.replace(/출석자|출석 명단/g,' ')}
 const quoted=rest.match(/[“"']([^“”"']{1,100})[”"']/);
 if(quoted)out.term=quoted[1];
 else out.term=rest.replace(/이번\s*(주|달)|전체|현재|지금|진행\s*중|회원|교인|현황|명단|목록|조회|검색|찾아줘|알려줘|보여줘|찾아주세요|알려주세요|보여주세요|몇\s*명|몇\s*건|계정|로그인|관리자|납부|회계|합계|총액|주간보고|보고서|보고|출석률|출결|출석|심방|교육|과정|전도|대상자|결정사항|액션|할\s*일|구역|조직|정보|예배|주일|수요|금요|[?？.!]/g,' ').replace(/\s+/g,' ').trim();
 if(/수요|금요|주일/.test(input))out.service=input.match(/수요|금요|주일/)[0];
 if(out.term.length>100)throw Error('검색어는 100자 이내로 입력해 주세요.');
 out.term=out.term.replace(/^(중|이야|인가요|인가|이니|좀|를|을)\s*|\s+(중|이야|인가요|인가|이니|좀|를|을)$/g,'').trim();
 return out;
}
