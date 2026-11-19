# EUNGARAGE 2.0 — 새 차고 아트 제작 지시서 · 구현 계획 (2026-11-19)

상태: **레이아웃 시안 완료 · 아트 생성 대기(ElevenLabs 크레딧 입고 + 사용 한도 승인 후)**.
11-19 첫 디자인(낡은 펠트 차고에 핑크 필터 + 핑크 테마)은 반려되어 브랜치에서 되돌렸다(f9824de, 푸시 안 함).
레이아웃 시안 PNG: `~/Desktop/EUNGARAGE_2.0_QA/시안_레이아웃_1119/` (생성기: `~/Developer/eungarage-qa/spec/build.py`).

## 1. 원칙 (사용자 지시 그대로)
- 기존 배경 색만 바꾸지 않는다. 벽·바닥·가구·셔터·간판·창문·소품을 새로 그린다.
- 크림 벽, 파스텔 가구, 연핑크 소파, 귀여운 PC·키보드, 캐릭터별 작은 작업 공간, 하트·별 조명, 스티커 냉장고, 리본·폴라로이드, 작은 아케이드, 망원경, 밤하늘이 보이는 큰 창.
- 밤은 창밖 하늘과 조명으로만. 실내는 밝고 따뜻하게. 화면 전체 분홍/보라 오버레이 금지.
- 색 비율: 크림·아이보리 50% / 연핑크 25% / 민트·하늘·라벤더 15% / 야간·네온 10%.
- 캐릭터 6인 원화는 그대로(재생성 금지). 배경이 캐릭터 화풍(부드러운 파스텔, 둥근 외곽선, 말랑한 음영)에 맞춘다.
- 기존 기능 유지: 셔터 연출, 차고 탐험, 크루 이동, 게임 세계 진입, 미니게임, 밤하늘·별 보기.
- 승인 전 전체 사이트 적용 금지: 차고 내부 실제 렌더링(PC·모바일 스크린샷) → 승인 → 나머지 확장.

## 2. 화면 구조 (시안 A~D)
| 시안 | PC (1440×900) | 모바일 (390×844) |
|---|---|---|
| A 셔터 외관 | 위 1/3 밤하늘, 크림 건물 + 핑크/화이트 줄무늬 차양, 민트 셔터(클릭=입장), 네온 간판 EUNGARAGE ♡ / 은가라지, 우편함(클릭=연락), 별 조명, ENTER | 같은 구성 세로 |
| B 차고 내부 | 미니홈피 가운데 차고 + ⤢ 크게 보기(전체 화면 탐험) | 같은 그림을 높이에 맞춰 좌우로 밀어서 이동 |
| C 미니홈피 메인 | 왼쪽 프로필(폴라로이드·상태 메시지·BGM·방문자) / 가운데 차고 / 오른쪽 바로가기(게임하기·별 보기·방명록·미니게임·라디오·후원 준비 중) / 아래 카드 4개(게임 소개·개발일지·크루·방명록 미리보기) | 프로필 띠 → 차고 → 바로가기 칩 → 카드 세로 |
| D 별빛 서버 | 왼쪽 밤하늘 패널(별 클릭=카드), 오른쪽 검색·별 카드·안내·"응원의 별 달기 준비 중", 아래 오늘 뜬 별 | 하늘 위, 카드 시트 아래 |

상단 메뉴: **HOME · GARAGE · GAMES · CREW · DIARY · GUESTBOOK · STARS · MORE▾** (15px, 알약 탭).
MORE: PHOTO · ARCADE · RADIO · CONTACT · SETTINGS · STUDIO · SUPPORT · PRESS. 푸터에도 Studio·Support 유지.
방문자 수는 서버가 실제 숫자를 줄 때만 표시(연결 전 칸 숨김). 방명록·별빛 서버는 Supabase 연결 전 "준비 중".

## 3. 생성할 이미지 (캐릭터 없이, 글자 없이 — 간판 글씨는 코드로 올림)
| # | 파일 | 비율·크기 | 내용 | 비고 |
|---|---|---|---|---|
| 1 | `garage/v2/room.webp` | 21:9, 2940×1260 | 차고 내부 전체(아래 배치표) | 핵심. 캐릭터·사람·글자 없음 |
| 2 | `alley/v2/exterior_desktop.webp` | 16:9, 2560×1440 | 외관, 문 열린 상태(안쪽 따뜻한 빛) | 셔터는 3번을 위에 얹음 |
| 3 | `alley/v2/exterior_mobile.webp` | 9:16, 1170×2080 | 같은 외관 세로 | 문 위치 비율 고정 |
| 4 | `alley/v2/shutter.webp` | 1100×1211, 투명 | 닫힌 민트 셔터 정면 + 위 롤 케이스 | 위 17.5% = 롤(움직이지 않음) |
| 5 | `alley/v2/props_*.webp` | 투명 컷아웃 | 파스텔 택배 상자·물·간식 바구니 | 실제 상표 금지 |
| 6 | (선택) `stars/v2/sky_frame.webp` | 16:9 | 별 보기 패널 테두리(망원경 렌즈 느낌) | 하늘 자체는 기존 코드 그대로 |

### 3-1. 차고 내부 배치표 (세계 좌표 2940×1260, 왼→오)
벽은 y 0–960, 바닥은 y 960–1260(크루가 걷는 띠 y 960–1220). **가구 앞면 아래 끝 = y 960 선**에 맞춘다(크루가 가구를 통과하거나 떠 보이지 않게 하는 기준선).

| x 범위 | 물건 | 연결 기능 |
|---|---|---|
| 40–240 | 바깥문(민트, 둥근 창) | 셔터로 나가기 |
| 250–360 | 파스텔 택배 상자(바닥) | 택배 열기 |
| 370–560 | 작은 아케이드 게임기(라벤더, 네온 화면) | 미니게임(신규) |
| 580–860 | 루키의 책장 + 빈백 | 작업 기록(진열장) |
| 885–1005 | 별 세 개 자물쇠가 달린 작은 문 | 비밀 보관소(★3) |
| 1030–1420 | 리본 줄에 걸린 액자·폴라로이드 4개(y 230–390) | LUNAI·LIMINAL·WORM UP!·LUMIORA(실제 키아트를 코드로 끼움) |
| 1060–1350 | 포코의 이야기 서랍장 + 작은 책상 | 기록·문서(캐비닛) |
| 1460–1740 | 모모의 기획 테이블 + 코르크보드 | 지금 만드는 것(작업대) |
| 1770–2060 | 누누의 PC 책상(둥근 모니터·키보드) / 위 RUBATO 액자(1820–1990, y 330–440) | 게임 목록(PC) / RUBATO |
| 2090–2520 | 큰 창(밤하늘·달, y 120–640) + 앞에 연핑크 소파 | 창=별 효과, 소파=휴식·임레븐 자리 |
| 2505–2600 | 망원경(창 옆) | 별빛 서버(STARS) |
| 2620–2790 | 작은 TV(y 420–570) / 요미의 라디오·카세트 선반(y 720–870) | 연락 / BGM |
| 2800–2930 | 스티커 냉장고 | 오늘의 냉장고 |
| 천장 | 하트·별 전구 줄 | 조명(밤 분위기) |

크기 기준: 캐릭터 화면 높이 ≈ 210(세계 단위, 바닥 기준). 책상 상판 높이 ≈ 캐릭터 가슴(바닥에서 170–200), 소파 좌석 ≈ 120.

### 3-2. 프롬프트 초안 (1번 차고 내부)
> Wide 21:9 interior illustration of a tiny, cozy game studio inside a garage at night, in the same soft pastel kawaii style as the attached mochi character sheets: rounded shapes, soft clean outlines, gentle airbrushed shading, warm indoor light. Cream and ivory walls, light warm wooden floor, pastel furniture (mint, sky blue, lavender, light pink). Left to right: a mint round-window door; a pastel parcel box on the floor; a small lavender arcade cabinet with a glowing screen; a mint bookshelf with a beanbag; a tiny door with three star-shaped locks; a ribbon string with four empty picture frames and polaroids; a pink drawer cabinet with a small desk; a yellow planning table with a cork board; a cute rounded computer desk with a pastel keyboard, an empty landscape frame above it; a large window showing a deep navy night sky with a moon and stars, a light pink sofa in front of it; a telescope beside the window; a small TV and a radio-cassette shelf; a refrigerator covered in cute stickers. Heart and star string lights along the ceiling. Bright, warm, uncluttered floor across the bottom fifth so small characters can walk. No characters, no people, no animals, no text, no logos. The furniture fronts all end on one straight floor line about 76% down the image.

외관(2·3번), 셔터(4번)는 같은 화풍 문장 + 각 내용. 생성 후 크롭 확대로 깨진 부분·글자 혼입 확인.

## 4. 그림이 들어온 뒤 구현 순서 (코드)
1. `src/data/world.ts` — 새 세계 2940×1260, 오브젝트 13 + 액자 5 좌표를 배치표·실제 그림에서 다시 측정. 신규 오브젝트 3개(arcade→ARCADE, telescope→STARS, sofa=휴식 자리) 추가. 모바일도 같은 그림 사용(세로 3층 그림 폐기) → 차고 맞춤을 "높이 맞춤 + 좌우 이동"으로.
2. `src/data/navigation.ts` — 걷는 점·가구 앞 점·앉는 점(소파) 다시 측정. `src/data/occlusion.ts` — 앞에 서는 가구(소파 등받이, 책상 다리 등) 가림 영역.
3. 크루: 바닥 접촉 그림자, 크기 210 기준, 소파 위 임레븐 앉기 자리.
4. 미니홈피 레이아웃(C), 메뉴 7+MORE, 별빛 서버 화면(D), 셔터 외관(A) 교체.
5. 검증: 클릭 좌표(모든 오브젝트 정중앙 터치 = 그 패널), 크루 경로(가구 통과·공중 부양 0 — 걷는 점이 전부 y 960 이상), e2e 전체 3브라우저, PC·모바일 스크린샷과 녹화 → **승인** → 나머지 페이지 확장.

## 5. 비용·승인
- 유료 생성은 사용자가 정한 크레딧 한도 안에서만(메모리 paid-credit-cap-rule). 1~4번 각 1~3회 시도 예상.
- Higgsfield 크레딧 0(11-19 확인).
