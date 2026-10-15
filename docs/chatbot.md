# 도림 도우미

로그인한 사용자가 우측 하단 로봇 버튼으로 여는 DB 조회 챗봇입니다. 외부 AI 모델·메일·별도 비밀 키 없이 Supabase RPC를 호출합니다. 버튼 선택과 한국어 검색 규칙으로 지원하는 질문을 해석하며, 일반 대화나 인터넷 검색을 생성하는 모델은 아닙니다.

지원 항목은 회원, 출결, 전도 대상자, 심방, 교육 과정, 납부, 주간보고, 결정사항, 구역, 계정입니다. 역할과 직책 메뉴 권한에 따라 버튼이 표시되고 서버에서 다시 검증합니다. 교육은 과정 목록 조회이며 개별 시험 점수 조회는 해당 업무 화면을 이용합니다. 계정은 이메일 일부를 마스킹한 역할·상태 요약입니다.

예: `1구역 회원 현황`, `김하늘 회원 찾아줘`, `2026년 9월 납부 합계`, `2026년 41주차 결석 현황`, `진행 중 교육 과정`, `활동 계정 현황`. 따옴표로 검색어를 감싸면 해당 문구를 그대로 검색합니다. 출결·보고는 연도/주차, 납부·심방은 월 조건을 사용합니다. 기본값은 로그인 시점의 한국 날짜와 공통 일요일 주차입니다. 조건 펼치기에서 기간·구역·예배 유형을 직접 바꿀 수 있습니다. 지원하지 않는 상대 기간·미납 계산·수정·삭제 요청은 업무 화면 이용을 안내합니다.

`public.app_chat_search` → `private.chat_search`는 현재 DB 계정·유효 Auth 세션·역할·직책·구역과 기존 행별 권한을 확인합니다. 허용 목록의 테이블만 식별자로 구성하고 모든 검색값은 SQL 파라미터로 전달합니다. 조회 결과는 안전한 필드만 구성하며 이름을 마스킹하고 주소·전화·상담/면담 내용·소견·비밀번호는 반환하지 않습니다. 출석률은 활동/장기결석 회원의 출석+온라인 / 대상 회원 수이며, 상태 필터와 분모를 분리합니다. 납부 합계는 선택한 월과 검색 조건의 실제 기록 합계입니다.

응답은 총 건수·상태별 건수·20개 결과와 다음 페이지, DB 확인 시각을 제공합니다. 삭제된 업무 기록은 제외합니다(납부 기록에 연결된 삭제 회원의 납부 이력은 유지). 챗봇에서 업무 데이터는 수정하지 않으며 조회 감사 이력만 저장합니다. 감사 이력에는 검색 원문이나 이름을 저장하지 않습니다. 대화는 메모리/현재 화면에만 보관하고 새로고침·로그아웃·권한 변경 시 비웁니다. Supabase 서버 세션은 기존 로그인 정책을 사용합니다.

검증: `npm run test:chat` 및 `npm run test:integration`. 로컬 실제 PostgreSQL 엔진의 별도 가상 Auth 세션으로 권한·마스킹·계산·인젝션·페이지네이션과 브라우저 흐름을 검증합니다. 운영 DB에 테스트 자료를 만들지 않습니다.

## 로봇 이미지 제작

- 도구: 내장 imagegen (CLI 사용 안 함)
- 최종 사용 파일: `app/assets/robot-assistant.png` (투명 PNG)
- 원본 생성 파일은 생성 이미지 폴더에 보존했습니다.
- 최종 프롬프트:

> Create one premium friendly 3D robot assistant HEAD avatar as a transparent PNG cutout for a Korean community administration web app. Centered front view with a very slight three-quarter angle, large compact rounded ivory ceramic head, rich teal #0D9488 panels, dark teal glass face with two cheerful soft mint eyes and a small friendly smile, small symmetric ear discs and tiny short antenna. Beautiful refined rounded 3D product illustration, clean soft studio illumination, restrained material highlights, polished but approachable, very legible at 56 pixels. Head only, no neck or body, no text, no logo, no scene, no background, no ground shadow. Fill 85 percent of a square frame, fully contained silhouette with clear edges, tasteful elegant proportions.
