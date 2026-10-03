# SITE UPGRADE — PHASE D REPORT (GARAGE INTERACTION)

브랜치 `site-upgrade` · 라이브 배포 없음. 캡처: `docs/shots/phaseD/before/`(라이브 = PHASE D 전 차고) · `after/`(브랜치), desktop 1440×900 · mobile 390×844 · landscape 844×390.

## D-0. 기준선 — 차고 물건 지도 (변경 전)

15개 물건 모두 `<button class="thing">`. Tab 순서는 데스크톱·모바일 같다: shelf → poster ×4 → picture-rubato → cabinet → pc → workbench → fridge → tv → outside-door → radio → parcel → secret-door → 도깨비 → 메뉴. 마우스는 hover에 라벨·들림, 터치는 첫 탭 = 바로 열림, 키보드는 focus-visible에 라벨·Enter로 열림. 골목에는 ENTER 하나뿐이었다.

| 물건 | 위치(데스크톱 화면) | 전에 하던 일 | PHASE D 후 |
|---|---|---|---|
| shelf (Archive cabinet) | 왼쪽 끝 책장 | 보관 선반 — 지난 짐과 메모 | 그대로 |
| poster ×4 · picture-rubato | 왼쪽 벽 · TV 위 액자 | 작품 포스터 → "PC에서 자세히 보기" | 그대로(PC 상세로 이어짐) |
| cabinet (Records) | 왼쪽 아래 서랍장 | 약관·개인정보·가이드·계정 삭제 서류 | + **LIMINAL 사건 파일** 탭 → VIEW LIMINAL |
| pc (Works) | 가운데 책상 모니터 | 작품 5개 목록(글자 줄) | **바탕화면**: 작품 아이콘 5 + ARCHIVE · MAIL · TRASH |
| workbench | 가운데 오른쪽 | 만드는 중인 것 | 그대로 |
| fridge | 오른쪽 | 간식 | 그대로 |
| tv | 오른쪽 | CH01 뉴스 · CH02 캠 · CH03 PROJECT TEASER · CH04 연락 · CH05 NO SIGNAL | **CH01–05 작품 채널** · CH06 뉴스 · CH07 캠 · CH08 연락 · CH00 NO SIGNAL |
| outside-door | 오른쪽 끝 | 밖(달 · 공개 보관소 장면) | 그대로 · 모바일 첫 방문 반짝임 |
| radio | 바닥 왼쪽 | 밤 라디오 | 그대로 |
| parcel | 바닥 오른쪽 | MOMO가 가져오는 이번 주 장보기 | 그대로 + 소식 구조(현재 0건) |
| secret-door | 책장 아래 | 별 3개 → 비밀 창고 | 그대로(LIMINAL과 무관) |
| 도깨비 5 | 걸어다님 | 반응 | 그대로 |

## 바꾼 것

### 골목 (D-1 · D-6)
- 셔터 아래 한 줄: **게임을 만드는 도깨비들의 밤 작업실** · 작은 영문 `Games made after dark`. ENTER 위(가로) / 아래(세로), 셔터를 가리지 않음. 문이 열리기 시작하면 사라짐.
- 그림 속 우편함 = 실제 링크 `/contact.html`. 마우스 hover·키보드 focus에 "편지 쓰기 · CONTACT" 꼬리표와 은은한 빛. 터치는 바로 이동. 최소 44×44.

### 모바일 발견성 (D-2)
- 터치 기기 첫 방문 1회(LocalStorage `eungarage:garageHinted`, 전에는 탭마다): "반짝이는 물건을 눌러보세요." 4.2초.
- 그 동안 PC · TV · 바깥 문만 2번 부드럽게 들썩이고 멈춤(동작 줄이기면 없음). 상시 핫스팟 표시 없음.
- 탭하면 라벨, 키보드 포커스면 이름 — 기존 동작 유지.

### PC (D-3)
- EUNGARAGE OS 바탕화면. 작품 아이콘(차고 벽 액자 그림 재사용) 5개 → `/works/<id>.html`. 누르면 CRT가 꺼지듯 닫히고 이동(동작 줄이기·새 탭 클릭은 바로).
- MAIL → `/contact.html`. ARCHIVE → "자료 정리 중."(공개 보관소 페이지는 PHASE G, 죽은 링크 없음). TRASH → "그건 진짜 버린 거야."
- 아이콘에 마우스를 올리거나 포커스하면 그 작품의 색으로 차고 조명이 바뀜(기존 world wash).
- 포스터·선반·작업대에서 오는 "PC에서 자세히 보기"는 그대로 작품 상세 카드로 열림.

### TV (D-4)
- CH01 LUNAI · CH02 LIMINAL · CH03 WORM UP! · CH04 LUMIORA · CH05 RUBATO. 각 채널 = 사이트에 이미 있는 그 작품의 그림 2~3장, 이름 · 장르 · 상태, **VIEW PROJECT**.
- 3.5초마다 다음 장(동작 줄이기면 멈춤, 점으로 넘김). 그림은 채널을 볼 때 한 장씩만 받음.
- `TvFrame.kind: 'image' | 'video'` — 영상이 생기면 데이터만 추가. 가짜 트레일러 없음, PROJECT TEASER 채널 삭제.
- 채널 번호가 9개라 휴대폰에서는 번호판이 옆으로 밀리게 했다(번호 하나 44px, 켜진 채널이 가운데로). 데스크톱은 한 줄에 다 들어감.

### 기록 서랍 · LIMINAL (D-5)
- 서랍 폴더에 "사건 파일 · LIMINAL" 탭 「두 개의 이름표」 → 경계관리국 사건 기록 한 장(사진: 경계관리국 앞, 줄거리 한 줄은 게임 자료의 손님 설정) → **VIEW LIMINAL** `/works/liminal.html`.
- 사건 번호는 쓰지 않음(게임 스크립트마다 번호가 다름). 비밀문은 그대로 별 3개 비밀 창고.

### 택배 (D-7)
- `src/data/news.ts` 구조만: 실제 소식이 쓰이면 아직 안 본 최신 1건을 가져옴(날짜·제목·본문·링크). 지금은 0건이라 기존 장보기 그대로. 가짜 뉴스 없음.

## D-10 · D-11 히트 영역 · 모바일

| 크기 | 물건 15개 가운데 → 자기 자신 | 겹침 | 가장 작은 히트 |
|---|---|---|---|
| 1440×900 | 15/15 | 0 | radio 105×95 |
| 390×844 | 15/15 | 0 | radio 48×44 · shelf 47×47 |
| 844×390 | 15/15 | 0 | radio 49×44 · picture-rubato 66×44 |

모달(세 크기): 닫기 버튼 화면 안, PC 바탕화면·TV 화면·사건 서류·VIEW 링크 화면 안·44px 이상·그 자리에서 눌림(elementFromPoint). PC 아이콘 44px 이상. TV 번호 44×44(휴대폰은 밀기).

기존 문제(PHASE D 전부터, 변경 없음): 가로 844×390에서 기록 서랍 그림이 아래로 51px 넘침 — 사건 탭과 VIEW LIMINAL은 화면 안. PHASE I(모바일)에서 다룸.

## NEW_ASSET_REQUIRED

필수 0건. 전부 기존 자산(작품 그림 · 벽 액자 · 경계관리국 그림 · CSS 아이콘).

## PERFORMANCE

<!--perf-->

## TEST

<!--tests-->

## NEXT — PHASE E (LIVING GARAGE)

도깨비 크루와 차고 생활감. 크루 스프라이트 시스템은 건드리지 않고(우선순위 D는 PHASE K), TV를 열 때 도깨비 반응으로 요청 ~112건이 생기는 점은 PHASE K 성능 분석에서 다룸.
