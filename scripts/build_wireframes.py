from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SHOTS=ROOT/'tmp/pdfs/screens'
OUT=ROOT/'output/pdf/신앙관리시스템_화면설계_와이어프레임_v1.pdf'
pdfmetrics.registerFont(TTFont('KR',str(ROOT/'tmp/pdfs/fonts/Pretendard-Regular.ttf')))
pdfmetrics.registerFont(TTFont('KRB',str(ROOT/'tmp/pdfs/fonts/Pretendard-Bold.ttf')))
W,H=landscape(A3)
INK=HexColor('#173f3c'); MUTED=HexColor('#718985'); LINE=HexColor('#dbece6'); GREEN=HexColor('#0D9488')
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('신도림 신앙관리 시스템 - 기획 분석 및 47개 화면설계 와이어프레임')
c.setAuthor('화면설계 시안 / 2026-10-10')
page=0
roles={'lead':'지역장 / 회장','district':'구역장','evangelist':'전도 사명자','visitor':'심방 사명자','educator':'교육 사명자','finance':'회계 사명자','tf':'시스템 TF','admin':'관리자'}
meta=json.loads((SHOTS/'metadata.json').read_text(encoding='utf-8-sig'))
extras=json.loads((SHOTS/'extras.json').read_text(encoding='utf-8-sig'))
groups=[('CM','공통'),('OR','조직관리'),('SY','시스템관리'),('MB','회원관리'),('EV','전도관리'),('AT','출결관리'),('VS','심방관리'),('ED','교육관리'),('FN','회계관리'),('WR','주간보고'),('MT','회의관리')]
def txt(x,y,text,size=11,bold=False,color=INK):
 c.setFillColor(color);c.setFont('KRB' if bold else 'KR',size);c.drawString(x,y,str(text))
def wrap(text,width,size=11):
 lines=[]
 for para in str(text).split('\n'):
  line=''
  for ch in para:
   if pdfmetrics.stringWidth(line+ch,'KR',size)>width and line:
    lines.append(line);line=ch
   else:line+=ch
  lines.append(line)
 return lines
def paragraph(x,y,text,width,size=11,leading=19,color=INK):
 for line in wrap(text,width,size):txt(x,y,line,size,color=color);y-=leading
 return y
def new(title,kicker='설계 분석',sub=''):
 global page
 page+=1;c.setFillColor(HexColor('#fafbf9'));c.rect(0,0,W,H,fill=1,stroke=0)
 txt(48,H-45,'SINDORIM  /  FAITH & COMMUNITY',9,True,MUTED)
 txt(48,H-87,title,25,True)
 txt(48,H-112,sub or '기획서 2026.10.09 기준 · 화면설계 v1.0 · 2026.10.10',10,color=MUTED)
 c.setStrokeColor(LINE);c.line(48,H-133,W-48,H-133)
 txt(W-220,H-45,kicker,9,True,MUTED)
 c.line(48,48,W-48,48);txt(48,29,'신도림지역 신앙관리 시스템 / 가상 데이터 화면 시안 / A3 가로',8,color=MUTED)
 txt(W-110,29,f'{page:02d}',9,True)
 c.bookmarkPage('page'+str(page));c.addOutlineEntry(title,'page'+str(page),level=0,closed=False)
def end():c.showPage()
def box(x,y,w,h,title,body):
 c.setStrokeColor(LINE);c.setFillColor(HexColor('#ffffff'));c.roundRect(x,y,w,h,8,fill=1,stroke=1)
 txt(x+23,y+h-35,title,16,True);paragraph(x+23,y+h-65,body,w-46,12,22)
def rows(x,y,width,heads,data,colwidths=None,size=11):
 widths=colwidths or [width/len(heads)]*len(heads)
 c.setFillColor(HexColor('#eaf0e9'));c.rect(x,y-34,width,34,fill=1,stroke=0)
 xx=x
 for j,h in enumerate(heads):txt(xx+12,y-22,h,10,True);xx+=widths[j]
 y-=34
 for row in data:
  lines=[wrap(cell,widths[j]-24,size) for j,cell in enumerate(row)];height=max(42,max(len(l) for l in lines)*18+20)
  c.setFillColor(HexColor('#ffffff'));c.rect(x,y-height,width,height,fill=1,stroke=0);xx=x
  for j,cell in enumerate(row):paragraph(xx+12,y-24,cell,widths[j]-24,size,18);xx+=widths[j]
  c.setStrokeColor(LINE);c.line(x,y-height,x+width,y-height);y-=height
 return y

new('한 사람의 기록을, 함께 이어가는 화면','01 / 기획서 분석 및 화면설계')
txt(52,H-210,'신앙관리 시스템',40,True)
txt(52,H-266,'화면설계 · 와이어프레임 시안',31,True)
paragraph(54,H-321,'회원 중심 통합 이력, 주차별 업무와 자동 집계,\n역할 및 구역 범위에 따른 접근을 화면과 코드에 연결했습니다.',650,17,31)
box(54,140,330,170,'47개 정의 화면','11개 메뉴의 모든 화면 ID 유지\n각 화면의 입력 항목과 처리 규칙\n원문 근거 페이지와 설계 판단 연결')
box(406,140,330,170,'14개 보완 시안','회원 카드 7개 상세 탭\n구역장 대시보드 및 설정 상세\n핵심 모바일 화면 5개')
box(758,140,378,170,'실행 가능한 로컬 웹 시안','가상 데이터 입력과 저장\n현황 연계, 제출 스냅샷, 이월 처리\n운영용 인증·DB·배치는 별도 구축')
txt(54,95,'읽는 법: 2~8쪽 분석 / 9~55쪽 전체 화면 / 56~64쪽 변형 / 65~69쪽 모바일 / 70~73쪽 디자인 / 74~77쪽 관리자',11,color=MUTED)
end()

new('기획의 방향과 화면 설계의 대응','02 / 목적과 범위','원문 p.3~4, 17, 19 · 아래 내용은 기획 요구를 화면으로 해석한 설계안입니다.')
rows(48,H-165,W-96,['기획의 문제','설계 목적','화면의 대응','검토 포인트'],[
 ['분산 자료로 회원 상태 파악이 늦음','회원 중심 통합 관리','MB-03: 기본정보와 8개 이력 탭','다른 업무로 이동하지 않고 핵심 상태 확인'],
 ['장기결석·어려움 발견과 조치 지연','조치 대상 조기 발견','CM-02, AT-03, VS-02, EV-05','미입력과 결석 구분, 담당자·기한·처리 상태'],
 ['매주 수작업 집계 부담','보고 업무 자동화','AT-01 / ED-01 / VS → WR-01','수치 재입력 없이 소견·계획 작성'],
 ['사명자 교체 시 기록 단절','회원 및 임기 이력 보존','OR-04, MB-03, SY-04','상태 변경과 이력 저장, 물리 삭제 제한'],
 ['전도 단계별 이탈 지점 불명확','이동 이력 기반 가시성','EV-03, EV-06, EV-07','현재 재적과 기간 전환 건수, 분모 구분']
 ],[240,210,330,W-96-780])
box(48,98,(W-114)/2,180,'유지한 설계 원칙','지역 > 구역 > 회원, 회원 ID 중심의 기록 연결\n일요일~토요일 주차를 업무 공통 축으로 사용\n한 번 입력한 데이터를 대시보드와 보고에 재사용\n모바일 접근과 마스킹 표기를 기본으로 적용')
box(66+(W-114)/2,98,(W-114)/2,180,'이번 구현의 범위','화면과 업무 흐름 검토를 위한 프런트엔드 시안\n기획서 47개 + 관리자 2개 / 가상 데이터 저장\n실제 이메일 인증·DB 행 보안·회계 스키마는 미연결\n정식 서비스의 자동 배치·개인정보 파기는 수행하지 않음')
end()

new('정보 구조와 화면 탐색','03 / 47개 화면 지도','원문 p.5, 8~15 · 공통·기반, 목양 업무, 운영·보고를 유지합니다.')
data=[]
for g,title in groups:
 ss=[s for s in meta if s['group']==g]
 data.append([g+' / '+title,str(len(ss)), ' · '.join(s['id']+' '+s['title'] for s in ss)])
rows(48,H-165,W-96,['메뉴','화면 수','정의 화면'],data,[175,75,W-346],10)
txt(48,76,'탐색: 좌측 업무 메뉴 → 상단 하위 화면 탭 → 목록/입력/상세. 모바일은 접히는 메뉴와 단일 열 배치.',11,color=MUTED)
end()

new('권한과 개인정보를 화면에 적용하는 기준','04 / 역할 및 범위','원문 p.6, 9, 11, 14~15, 18 · 상충하는 항목에는 상세 기능과 최소 권한을 우선 적용했습니다.')
rows(48,H-165,W-96,['시안 역할','조회 범위와 업무','화면 제한'],[
 ['지역장 / 회장','지역 전체, 회원·업무 현황·면담 배정·보고 확인','회계 조회 전용. 상세 정의상 시스템 설정/계정은 TF 담당.'],
 ['구역장','담당 구역 회원·출석·심방·전도·구역예배·보고 작성','다른 구역 제외. FN-04 권한 확정 대기. 면담 상태만 확인.'],
 ['전도 사명자','지역 전도 대상자·단계·접촉·통계 및 기능 소견 보고','일반 회원 상세와 다른 기능 데이터 제외.'],
 ['심방 사명자','심방에 필요한 회원·출결 및 심방 기록','피드백과 상담 내용은 작성자 또는 지역장/회장만.'],
 ['교육 사명자','교육 과정·회차 참석·시험·결과','회원은 입력 선택을 위한 마스킹 표시만.'],
 ['회계 사명자','월별 납부 등록·현황·미납','다른 업무 이력·민감 기록 제외. 회원 선택만 제공.'],
 ['시스템 TF','조직 기준·회원·계정·권한·개인정보·감사 로그','출석·전도·심방·교육·회계 업무 내용 제외.']
 ],[185,410,W-691],11)
paragraph(48,200,'마스킹: 2글자 김*(5678), 3글자 홍*동(5678), 4글자 남**수(5678). 목록, 보고 및 Excel 다운로드에 적용. 전체 이름은 권한 범위의 회원을 개별 선택하고 사유를 남겨 열람합니다.',W-96,12,23)
paragraph(48,128,'중요: 메뉴 숨김과 브라우저 필터는 시안 동작입니다. 서버에서 사용자·역할·직책·구역을 검증하고 PostgreSQL RLS로 강제해야 운영 보안이 성립합니다.',W-96,12,23)
end()

new('현장 입력이 보고와 후속조치로 연결되는 흐름','05 / 업무 및 상태 흐름','원문 p.10~16 · 화면을 이동해도 동일 회원과 기록을 재사용합니다.')
flows=[
 ('01  출석과 장기결석','AT-01 주차·예배 선택 → 일괄 입력 → AT-02 실시간 현황\n연속 결석 N주 → AT-03 등재 → 담당 배정 → 접촉 → 심방 → 단계향상 / 사고처리'),
 ('02  심방과 면담','VS-01 심방·후속조치·기한 → VS-02 미완료/기한 경과 목록\nVS-03 요청 → VS-04 배정 → 일정확정 → 완료 / 취소. 구역장은 상태만 확인'),
 ('03  전도와 전환 이력','EV-02 등록 → 찾기 → 정파 → 상담 → 복음방 → 센터 → 입교\n중단은 별도 상태. EV-03 이동 이력과 현재 단계 갱신 → EV-06 기간별 흐름'),
 ('04  자동 집계 주간보고','출석·심방·전도·면담·구역예배·교육 → WR-01 실시간 집계 + 소견\n작성중 → 제출 시 스냅샷 → WR-02 확인 → WR-03 제출 자료 기준 비교'),
 ('05  회의와 미결 이월','MT-01 회의록 → MT-02 담당자·기한 결정사항 → 진행 / 완료 / 취소\n기한 경과 + 진행 → MT-03 다음 회의 이월, 원본 ID 연결, 동일 회의 중복 방지')]
for i,(title,body) in enumerate(flows):box(48,H-285-i*122,W-96,108,title,body)
end()

new('상충하거나 미확정인 항목의 설계 판단','06 / 결정 기록','원문의 내용을 임의로 확정하지 않았습니다. 아래 적용은 시안 검토를 위한 판단입니다.')
rows(48,H-165,W-96,['항목 / 근거','원문의 상충 또는 미확정','시안에서의 적용','운영 전 확정 사항'],[
 ['임기 종료 권한 / p.6·8·18','수동 회수와 자동 회수 혼재','종료 → 권한 회수 대기 → 수동 회수','자동/수동 방식과 서버 처리'],
 ['구역장 회계 / p.6·14·18','불가 vs 본인/담당 회원 납부 조회','FN-04 화면은 유지, 데이터는 차단','본인만/담당회원/불가'],
 ['피드백 / p.9·11·18','작성자 제한 vs 담당 구역장 조회','작성자 + 지역장/회장만 열람','작성자/구역장/교체 사명자 권한'],
 ['전도 단계 / p.10','5단계 기술, 도식은 입교 포함 6단계','진행 5단계 + 입교 완료 + 중단','단계 명칭과 완료·중단 처리'],
 ['자동화 수 / p.16','4개로 기술, 실제 A~C 3개','A~C + 접촉/후속조치 알림 분리','배치 주기, 판정 기준값'],
 ['결석·사고 / p.16·21','N주 및 사고처리 등재 기준 미확정','N=8주 시안, 사고처리는 수동 결정','사유결석/미입력 판정, 사고 기준'],
 ['인교섬강전 / p.7·11·21','member_check5 / member_tree 불일치','관계 구분과 동의 확인용 입력 시안','항목 정의, 테이블 및 동의 요건'],
 ['보존·익명화 / p.15·18·21','보관기간과 익명화 여부 미확정','후보 목록만 제공, 파기 실행 잠금','기간·동의문·승인·익명화 방식'],
 ['역할과 화면권한 / p.6·8·15','4종 로그인과 7역할, 상세 권한 차이','7역할 사용. TF 조직·회원 허용','역할+직책 교집합과 범위 승인']
 ],[190,300,310,W-896],10)
end()

new('계산·입력·빈 상태에 대한 설계 기준','07 / 데이터 규칙','원문이 수식을 정의하지 않은 항목은 아래처럼 검토안으로 명시합니다.')
rows(48,H-165,W-96,['항목','설계 기준','화면 동작'],[
 ['주차 정의','1월 1일을 포함하는 일~토 주를 1주로 사용. 2026년 41주 = 10.04~10.10.','OR-05 연도 생성. 연말 중첩·연도 경계는 운영 DB에서 보완.'],
 ['출석률 / 미입력','(출석 + 온라인) / 활동·장기결석 회원. 사유결석은 분모에 포함하는 검토안.','미입력은 별도 표시. 해당 키가 없으면 결석으로 만들지 않음.'],
 ['연속 결석','선택한 예배유형으로 최근 주차부터 역산. 미입력·사유결석·출석이면 중단.','동일 회원의 미종결 장기결석 사건 중복 등재 방지.'],
 ['교육 이수','참석 회차 / 총 회차. 시험 미응시 점수는 null, 0점과 구분.','교육 참여의 주간 단위/과정 이수 집계 기준은 추가 확정 필요.'],
 ['납부 / 미납','회원·구분·연월당 1건 갱신. 활동·장기결석 회원 중 해당 납부 기록 없음.','시안은 모든 대상 회원이 선택 구분의 납부 대상이라는 가정. 면제 기준 필요.'],
 ['전환율','선택 월에 이전 단계에 진입한 고유 대상자 중 다음 단계 도달 비율.','현재 재적과 기간 이동 건수 구분. 월말 재적·코호트 정의 정식 구현 필요.'],
 ['보고','제출 순간 자동 수치 복사. 원본 업무 수정과 독립.','미제출은 0이 아니라 미제출. 지역 합계는 제출 구역 기준.'],
 ['미접촉 / 기한 경과','시안 기준 14일 미접촉. 후속조치는 완료 전이고 기한이 기준일보다 이전.','정식 배치와 달리 버튼 또는 화면 조회로 시연. 기준일 2026.10.10 고정.']
 ],[150,515,W-761],11)
paragraph(48,91,'공통 상태: 빈 목록은 안내 문구, 미확정 권한은 잠금, 필수값 누락은 입력 검증, 저장 성공은 알림. 서버 오류·동시 수정·복구는 정식 서비스에서 추가합니다.',W-96,11,20)
end()

new('화면 코드와 단계적 도입의 연결','08 / 구현 및 검증','이 PDF의 화면은 실제 로컬 웹 구현을 흑백 와이어프레임 모드로 캡처한 것입니다.')
box(48,450,530,215,'1단계 / 핵심 업무 검증','OR 조직·주차·계정 기준정보\nMB 회원 등록·카드·구역 이동\nAT-01~02 출석 입력과 현황\nWR-01~02 집계·제출·확인\n시범 2~3개 구역으로 운영 기준 확인')
box(602,450,540,215,'2~3단계 / 업무 확장과 본 구축','전도, 심방·면담, 교육, 후속조치, 회의 추가\n회계 별도 스키마와 권한 도입\n서버 인증, RLS, 조회 이력, 배치, 보존·파기 정식화\n회원 ID 중심의 테이블과 집계 뷰 연결\n프런트 시안에서 확정한 항목을 API·DB에 매핑')
box(48,177,530,245,'코드 구조와 실행','app/catalog.js: 기획 47개 + 관리자 2개 화면 메타데이터\napp/app.js: 화면, 폼, 업무 흐름 및 시안 제어\napp/domain.js: 마스킹·집계·중복 갱신·이월 규칙\napp/store.js: 가상 데이터 / app/export.js: Excel 출력\nserver.mjs: 로컬 정적 서버, npm start 또는 node server.mjs\n127.0.0.1:4173 / 검토용 서버는 4174로도 실행 가능')
box(602,177,540,245,'검증과 실제 운영의 경계','47개 정의 화면 렌더와 주요 모바일 5개 화면 검사\n출석 저장·보고 스냅샷·확인·단계 이동·이월 검증\n동의 기반 회원 등록, 수정, 마스킹 Excel 파일 검증\n10개 도메인 테스트와 관리자·업무 흐름 검증\n브라우저 저장은 시안용. 정식 계정·배치·DB는 미연결\n전체 화면은 세로 스크롤 / 넓은 모바일 표는 가로 스크롤')
paragraph(48,107,'이후 화면별 페이지: 왼쪽은 실제 동작하는 와이어프레임, 오른쪽은 목적·역할·입력·처리 규칙·검토 사항입니다. 화면 밖 하단 내용은 웹에서 스크롤로 이어집니다.',W-96,11,20)
end()

def screenshot_page(s,file=None,title=None,note=None,mobile=False):
 id=s['id'];new(f"{id}  /  {title or s['title']}", 'MOBILE / 390px' if mobile else 'WIREFRAME / 1440px',s.get('description','상세 변형 및 핵심 업무 흐름 확인'))
 file=file or id
 imgpath=SHOTS/(file+'.png')
 if mobile:
  x=90;y=83;h=H-235;w=h*390/844
  c.setStrokeColor(LINE);c.roundRect(x-9,y-9,w+18,h+18,15,fill=0,stroke=1)
  c.drawImage(str(imgpath),x,y,width=w,height=h,mask='auto')
  rx=440;rw=W-rx-55
 else:
  x=48;w=838;h=w*1080/1440;y=H-164-h
  c.setStrokeColor(LINE);c.rect(x-1,y-1,w+2,h+2,fill=0,stroke=1)
  c.drawImage(str(imgpath),x,y,width=w,height=h,mask='auto');rx=915;rw=W-rx-48
 ry=H-184
 entries=[('01 / 화면 목적',s.get('description',note or '회원 기록의 상세 구성 확인')),('02 / 시안 역할',roles[s.get('role','lead')]),('03 / 핵심 정보',s.get('fields',note or '탭 또는 하위 영역의 기록과 처리 상태')),('04 / 처리 규칙',s.get('rule',note or '기록을 회원 ID에 연결하고 범위별로 표시합니다.')),('05 / 원문 근거',f"기획서 p.{s.get('source',9)} / {id}" if s.get('source') else f"추가 사용자 요청 / {id}")]
 if note:entries.append(('06 / 검토 메모',note))
 elif s.get('type') in ['ownFinance','permissions','privacy','relationships','appointments','evStats']:entries.append(('06 / 검토 메모','미확정 또는 상충 항목은 분석 6~7쪽 참고. 시안에서 정책 승인을 대신하지 않습니다.'))
 else:entries.append(('06 / 화면 동작','저장과 조회는 가상 데이터 기준. 실제 운영에는 서버 인증·권한 검증과 DB 연동이 필요합니다.'))
 if mobile:entries.append(('07 / 모바일 규칙','메뉴는 접어서 제공. 카드·폼은 단일 또는 2열로 재배치. 넓은 표는 내부 가로 스크롤로 이름과 출석 상태를 확인합니다.'))
 for heading,body in entries:
  txt(rx,ry,heading,10,True,MUTED);ry-=24;ry=paragraph(rx,ry,body,rw,11,19);ry-=22
 txt(48,65,'첫 화면 viewport 시안 / 하단 목록과 입력은 웹에서 스크롤로 계속 / 표시 수치는 가상 값',8,color=MUTED)
 end()

for s in meta:
 if s['group']!='AD':screenshot_page(s)
for s in extras:
 base=next(m for m in meta if m['id']==s['id']).copy();base.update(s)
 screenshot_page(base,file=s['file'],title=s['title'],note=s['note'])
for id,r,title in [('CM-02','district','구역장 대시보드'),('MB-03','lead','회원 카드'),('AT-01','district','주간 출석 입력'),('WR-01','district','주간보고 작성'),('CM-01','district','로그인')]:
 s=next(m for m in meta if m['id']==id).copy();s['role']=r
 screenshot_page(s,file=id+'-mobile',title=title+' / 모바일',mobile=True)
new('Teal, Pretendard, 그리고 평면 디자인','DESIGN / 사용자 지정 가이드','추가 요청 반영: #0D9488 · Pretendard · 1~10구역 · 그림자·입체 효과 없는 평면 스타일')
swatches=[('#0D9488','주 색상 / 지표와 강조'),('#0f766e','상호작용 / 높은 대비'),('#103e3b','탐색 영역 / 깊은 청록'),('#e6f7f3','보조 배경 / 밝은 민트'),('#f3f8f6','화면 배경 / 부드러운 바탕')]
for i,(col,label_) in enumerate(swatches):
 x=48+i*221;c.setFillColor(HexColor(col));c.roundRect(x,490,201,165,12,fill=1,stroke=0);txt(x,464,col,16,True);txt(x,441,label_,11,color=MUTED)
box(48,133,345,245,'Pretendard / 가독성과 일관성','웹과 PDF에 Pretendard 적용\n제목 24~27px / 큰 지표 30~32px\n웹 본문·입력·버튼·표는 최소 16px\n굵기 400 / 600 / 700~750\n공식 글꼴 파일 로컬 포함, 외부 CDN 의존 제거')
box(414,133,345,245,'일관된 평면 컴포넌트','카드·버튼은 균일한 1px 테두리\n그림자·입체 테두리·버튼 이동 제거\n호버·선택 배경의 텍스트와 아이콘 흰색\n탭의 네 모서리 반경은 모두 8px\n로고 테두리 없음 / 모바일 메뉴 닫기 지원')
box(780,133,362,245,'구역 항목과 화면 적용','1구역부터 10구역까지 기본 생성\n구역장 역할의 담당 구역 선택\n지역장의 전체 또는 개별 구역 필터\n구역별 지표를 2열로 비교\n보고 제출 현황은 10개 구역 기준')
txt(48,91,'글꼴 출처: github.com/orioncactus/pretendard / SIL Open Font License / 라이선스 파일 코드에 포함',10,color=MUTED)
end()
import shutil
for source,target in [('desktop-dashboard.png','color-desktop.png'),('mobile-dashboard.png','color-mobile.png')]:shutil.copyfile(ROOT/'output/qa'/source,SHOTS/target)
cs=next(m for m in meta if m['id']=='CM-02').copy()
screenshot_page(cs,file='color-desktop',title='지역장 대시보드 / 컬러 디자인',note='사용자 지정 #0D9488 기반 청록, Pretendard, 10개 구역, 그림자·입체 효과 없는 평면 스타일을 반영한 실행 화면입니다.')
cs['role']='district'
screenshot_page(cs,file='color-mobile',title='구역장 대시보드 / 컬러 모바일',note='최소 16px 본문, 체크박스 가로 정렬과 평면 스타일을 모바일에서도 유지합니다. 담당 구역 필터는 1~10구역입니다.',mobile=True)
new('페이지 로고, favicon, Open Graph 이미지','DESIGN / 브랜드 자산','사용자 제공 이미지를 로고와 favicon의 원본으로 사용하고, 동일 로고를 활용한 공유 이미지를 제작했습니다.')
c.drawImage(str(ROOT/'app/assets/og-image.png'),48,235,width=810,height=810*630/1200,mask='auto')
txt(48,207,'공유용 og:image / 1200 x 630 PNG',12,True)
paragraph(48,174,'신도림 로고, 청록색 계열과 가벼운 블록 효과로 구성. 이미지 제작은 built-in image_gen을 사용했습니다.',810,11,19)
c.drawImage(str(ROOT/'app/assets/logo.jpg'),910,490,width=190,height=190)
txt(910,463,'페이지 로고 / 제공 원본',12,True)
paragraph(910,423,'favicon: ICO 16/32/48/64px\nPNG 32px / 터치 아이콘 180px\nOG: 제목·설명·이미지·크기·alt\nTwitter: summary_large_image\n배포 시 실제 도메인 URL 적용',230,11,22)
paragraph(48,91,'로고: app/assets/logo.jpg / favicon: app/assets/favicon.ico / 공유 이미지: app/assets/og-image.png. 로컬 미리보기 주소로는 외부 서비스의 공유 크롤러가 접속할 수 없습니다.',W-96,10,18)
end()
for id in ['AD-01','AD-02']:
 s=next(m for m in meta if m['id']==id).copy()
 screenshot_page(s,note='추가 관리자 역할. 계정·조직·시스템 운영 범위로 구성하고 실제 서버 인증은 미연결입니다.')
for id in ['AD-01','AD-02']:
 s=next(m for m in meta if m['id']==id).copy()
 screenshot_page(s,file=id+'-mobile',title=s['title']+' / 모바일',mobile=True,note='모바일 메뉴는 닫기 버튼·배경 클릭·Escape를 지원합니다. 입력과 계정 관리 흐름은 데스크톱과 같습니다.')
c.save()
print(json.dumps({'pdf':str(OUT),'pages':page,'screens':len(meta),'variants':len(extras),'mobile':5},ensure_ascii=False))
