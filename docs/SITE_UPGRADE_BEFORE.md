# EUNGARAGE SITE UPGRADE — PHASE A BEFORE REPORT

조사일 2026-10-02. 기준: 라이브 eungarage.com = `main` `5eff866`.
코드·라이브·자산을 실제로 열어 확인한 내용만 적었다. 이 단계에서 사이트는 바꾸지 않았다.
현재 화면 캡처: `docs/shots/before/` (desktop 1440×900, mobile 390×844, 각 8장).

---

## 1. CURRENT SITE MAP

빌드는 Vite 다중 페이지. 저장소 루트의 `*.html`과 `works/*.html`이 각각 하나의 URL이다. 호스팅은 GitHub Pages(`CNAME` eungarage.com), `main` 푸시가 곧 배포.

| URL | 역할 | 비고 |
|---|---|---|
| `/` (`index.html`) | 골목 입구 → 차고(포인트&클릭) → 놀이터 · 비밀 보관소 | 사이트의 핵심. 해시 `#playground`, `#archive`로 세계 이동 |
| `/works.html` | 전체 작품 목록(5개) | 카드형, 중앙 데이터 `src/data/projects.ts`에서 렌더 |
| `/works/lunai.html` · `liminal` · `wormup` · `lumiora` · `rubato` | 작품 상세 | HERO → FACTS → ABOUT → CORE → WORLD → FEATURES → GALLERY → LINKS |
| `/games.html` | `/works.html`로 즉시 이동(meta refresh, noindex) | 예전 주소 보존용 |
| `/studio.html` | 스튜디오 소개 | 한 줄 소개 + 작품 5줄 + 크루 5줄 + 이메일 |
| `/support.html` | LUNAI 고객지원 | 4개 항목 + 이메일 |
| `/privacy.html` · `/terms.html` · `/community-guidelines.html` · `/account-deletion.html` | LUNAI 법적 문서 | 앱 심사용으로 유지 필요 |
| `/404.html` | 없는 주소 | 예전 LUNAI 시절 화면 |
| `robots.txt` · `sitemap.xml` · `manifest.webmanifest` · `apple-touch-icon.png` | 크롤·아이콘 | sitemap 12개 URL |

없는 것: 독립 ARCHIVE 페이지, PRESS KIT, CONTACT 페이지(스튜디오 페이지의 이메일 한 줄과 TV 채널이 대신함).

## 2. CURRENT INTERACTIVE OBJECTS

### 골목(입구)
- `ENTER` 버튼 → 셔터가 올라가며 차고로(약 2초). 연출 중에만 `건너뛰기` 표시. 소품(택배·라면·생수·계란·콜라)은 장식이며 클릭 대상 아님.

### 차고 (`src/data/world.ts`, 가로/세로 판 각각 좌표)
| 물건 | 하는 일 |
|---|---|
| PC (`pc`) | EUNGARAGE OS 패널: 작품 5개 목록 → 상세 페이지 |
| 포스터 4장 (LUNAI · LIMINAL · WORM UP! · LUMIORA) | 펠트 액자, 클릭 → 해당 작품 포스터 패널 → 상세 |
| TV 위 액자 (RUBATO) | RUBATO 포스터 패널 → 상세 |
| TV (`tv`) | EUNGARAGE BROADCAST 5채널: 차고 뉴스 · DOKKA CAM(방의 다른 구석) · 작품 티저 · 연락처 · 무신호 |
| 라디오 (`radio`) | 자체 전원 + 4개 방송(GARAGE 차고곡 · NIGHT · DOKKA NEWS 사연 · STATIC). 음악은 한 번에 하나(WORLD 2.4) |
| 냉장고 (`fridge`) | 문이 열리고 오늘의 먹거리·메모(날짜 고정 시드) |
| 택배 (`parcel`) | 상자가 열리고 무작위 물건 하나(라면·계란·RUKI 부품…) |
| 기록 서랍 (`cabinet`) | 문서 한 장(작품 기록·법적 폴더) |
| 보관 선반 (`shelf`) | 실제 작품 물건이 놓인 아카이브 진열장 |
| 작업대 (`workbench`) | 지금 만드는 중인 것(WIP) |
| 바깥 문 (`outside-door`) | 문이 열리고 → 도깨비 놀이터 |
| 비밀문 (`secret-door`, 책장 아래) | 별 소켓 3개. 세 게임에서 별을 하나씩 얻으면 열림 → 비밀 보관소 |
| 크루 5명 (MOMO · RUKI · YOMI · POKO · NUNU) | 각자 돌아다니며 일함. 클릭하면 멈추고 돌아봄 |

### 도깨비 놀이터 (`#playground`)
- POKO 사무실 → 미니게임 「요미의 과자 몰래 먹기」, 간식 노점 → 「야식 심부름」, 택배 사무소 → 「모모의 택배 배달」, 이정표, 차고 문(복귀). 건물 간판에 별 소켓.

### 비밀 보관소 (`#archive`)
- 망원경(전용 밤하늘), 별 항아리, 오르골(전용 곡), 기억 상자, 작은 등, 방석(Healing Mode), 폴라로이드(제작 과정 사진), 복귀문.

### 공통
- 상단 내비: WORKS · STUDIO · SUPPORT · CONTACT + 소리 스위치. WORKS는 차고 안에서는 PC를 열고, CONTACT는 TV 연락처 채널.
- 키보드: 모든 물건이 `<button>`, Tab·Enter·Space·Escape, 화살표로 카메라 이동, 포커스 표시 있음.
- 저장(localStorage `eungarage:save` v3): 방문 수, 만진 물건, 냉장고 날짜, 소리 설정, 라디오 상태, 미니게임 점수·별(`eungarage.progress.*`), 비밀문 진행.
- 시간대: 사용자 시계 기준 아침·낮·저녁·밤·심야(`src/systems/clock.ts`)로 방 분위기 변화.
- 동작 줄이기(`prefers-reduced-motion`) 대응 있음.

## 3. CURRENT ASSET MANIFEST

| 종류 | 개수 | 용량 | 비고 |
|---|---|---|---|
| 이미지 webp | 869 | 약 46 MB | 크루 스프라이트 2벌(`dokkaebi/` 구버전, `dokkaebi-v2/` 현재 사용) |
| 이미지 png/jpg | 7 | — | 파비콘·apple-touch·OG(`og-image.jpg`) |
| 오디오 m4a | 37 | 약 10.9 MB | 음악 7 · 공간음 3 · 효과음 27 |
| 영상 | 0 | — | 사이트에 영상 파일·임베드 없음 |
| 웹폰트 | 0 | — | 시스템 글꼴 스택만 사용 |
| 3D 모델 | 0(빈 폴더) | — | |

폴더별 주요 자산: 차고 판 2장(가로 3600×1200 · 세로 1100×2619) + 소품 19 · 골목 11 · 보관소 10 · 놀이터 8 · 작품 원화 10 · 작품별 상세 이미지 10~12장씩 · 펠트 액자 4 · 브랜드 5.

오디오 목록: 음악 `garage` `archive` `playground` `parcel` `poko` `snack` `music_box` · NIGHT 방송 `ambient` · 공간음 `alley` `playground_night` · 효과음 27(pc_on, pc_click, tv_channel, fridge_open, drawer_open, paper, radio_tune, door_open, shutter_open, broom, crew_step_01, game_start, game_fail, star_get, secret_unlock, lantern, stall_bell, eat, eat_soft, poko_turn, poko_step, momo_jump, momo_run_1~3, radio_static, radio_static_bed).

## 4. CURRENT PROBLEMS

| 기준 | 판정 | 문제 |
|---|---|---|
| 브랜드 | 부분 실패 | 차고·골목·보관소는 펠트 미니어처로 통일됐지만, `/studio` `/support` `/404`는 예전 LUNAI 시절의 검은 기업형 화면. 404에 "EUNGARAGE · LUNAI", "다시 궤도로 돌아가기" 같은 옛 문구가 남음. OG 이미지가 전 페이지 하나. |
| UX | 부분 실패 | 골목 첫 화면에 "게임을 만드는 도깨비들의 밤 작업실" 같은 설명이 보이지 않음(탭 제목에만 있음). 차고에 들어가도 무엇을 눌러야 하는지 알려 주는 단서가 hover 라벨뿐이라 모바일에서는 거의 없음. |
| 정보 전달 | 부분 실패 | 10초 안에 "게임 스튜디오"임을 알 수 있는 문장이 첫 화면에 없음. 작품 상태가 5개 모두 IN DEVELOPMENT라 출시작이 없다는 사실은 정직하지만, 어디서 받을 수 있는지(스토어 링크)가 하나도 없음. |
| 게임 소개 | 실패(1건) | **WORM UP!이 예전 모바일 러너 기준**: "횡스크롤 등산 러너 · iOS · 200개 스테이지", 갤러리도 러너 화면. 실제 프로젝트는 2026-09-29에 Steam 내러티브판(정본 v6 「봄은 모두에게 같은 날 오지 않았다」)으로 전환됨. 스튜디오 페이지도 "Mobile Runner / Action". |
| 모바일 | 양호 | 세로 전용 판·터치 44px·별도 레이아웃 있음. 다만 첫 방문 단서 부족(위 UX와 같음). |
| 성능 | 양호/주의 | 아래 기준값. 홈은 ENTER 전 약 2 MB, ENTER 뒤 크루 스프라이트로 +3.5 MB / 128요청. LCP는 양호. |
| SEO | 부분 | canonical·OG·Twitter·파비콘은 모든 페이지에 있음. 구조화 데이터는 홈의 Organization뿐(VideoGame·BreadcrumbList 없음). 게임별 OG 이미지 없음. `/` 와 `/index.html` 중복은 canonical로 정리돼 있음. 404에 noindex 없음. |
| 접근성 | 양호 | 키보드·포커스·Escape·reduced motion·터치 크기 기존 테스트로 검증. 음량 조절은 없음(켜기/끄기만). |
| 오디오 | 양호 | WORLD 2.4에서 음악 단일 소유자·전원음 1회·숨긴 탭 정지까지 정리. 게임별 음악(LIMINAL·WORM UP·LUNAI) 방송은 사이트에 자산이 없음. |
| 세계관 | 양호 | 크루 5명·놀이터·미니게임 3개·비밀 보관소·Healing Mode까지 이미 깊음. 오히려 첫 방문자에게 많을 수 있음. |
| 재방문성 | 양호 | 냉장고 날짜별 변화, 택배·라디오 사연·TV 뉴스 무작위, 시간대별 분위기, 별 수집과 비밀문. 날씨·별똥별 수집은 없음. |

## 5. PERFORMANCE BASELINE (라이브, 2026-10-02)

| 페이지 | 기기 | 전송량 | 요청 | LCP | CLS |
|---|---|---|---|---|---|
| `/` ENTER 전 | 데스크톱 | 약 1.8–2.1 MB | 16 | 628 ms | 0 |
| `/` ENTER 후 추가 | 데스크톱 | +3.5 MB | +128 | — | — |
| `/` ENTER 전 | 모바일 | 약 1.8–2.1 MB | 16 | 104 ms | 0 |
| `/` ENTER 후 추가 | 모바일 | +3.0 MB | +98 | — | — |
| `/works.html` | 데스크톱 / 모바일 | 1.1 / 1.2 MB | 11 | 496 / 104 ms | 0 |
| `/works/liminal.html` | 데스크톱 / 모바일 | 1.1 / 1.2 MB | 11 | 580 / 128 ms | 0 |
| `/studio.html` | 데스크톱 / 모바일 | 0.22 MB | 5 | 1,420 / 1,124 ms | 0 |

JS 88 KB(gzip 전 261 KB) · CSS 115 KB · 웹폰트 없음. 홈의 0.7 MB는 ENTER 전 1초 뒤 차고 판을 미리 받는 의도된 동작. 측정 방법은 Playwright Chromium, 캐시 없음.

## 6. KEEP / MODIFY / REMOVE / ADD

### KEEP (그대로 둠)
- 골목 입구·셔터 연출, 차고 판 2장, 펠트 액자·포스터, 크루 5명과 행동 시스템, 놀이터와 미니게임 3개, 비밀 보관소 전체(망원경 하늘·폴라로이드·오르골·Healing Mode), 라디오·음악 단일 소유 오디오 구조, 시간대 시스템, 키보드·reduced motion 대응, 법적 문서 4개, 중앙 작품 데이터 `projects.ts`, 정직한 상태 표기(ReleaseState).

### MODIFY (고침)
- 골목 첫 화면: 스튜디오 한 줄 소개를 화면에 보이게, 재방문자 빠른 입장.
- 차고 첫 진입: 클릭할 수 있는 물건을 처음 한 번 알려 주는 가벼운 단서(모바일 포함).
- PC 패널: 작품 목록에 ARCHIVE · MAIL 같은 입구 추가 여부(아래 결정 필요).
- WORM UP! 정보 전체(상세·목록·스튜디오·PC·메타): Steam 내러티브판으로 교체(문구 확인 필요).
- `/studio` · `/support` · `/404`: 차고와 같은 시각 언어로 재구성, 404의 옛 문구 제거.
- SEO: 게임별 OG 이미지(기존 원화를 1200×630으로 재구성, 생성 없이), VideoGame·BreadcrumbList 구조화 데이터, 404 noindex.
- 지원 페이지: 게임별 구분(현재 서비스가 있는 LUNAI만 실제 FAQ).

### REMOVE (지움)
- 404의 "LUNAI · 궤도" 문구. 쓰이지 않는 구버전 크루 스프라이트 `dokkaebi/`는 `?newCrew=off` 되돌리기용이라 지금은 남겨 두고, 지울지는 확인 후 결정.

### ADD (새로 만듦)
- PRESS KIT 페이지(기존 원화·로고·사실 정보만).
- CONTACT 페이지(GAME SUPPORT · BUSINESS · PRESS · OTHER, mailto 제목 자동).
- 독립 ARCHIVE 페이지(아래 결정 필요).
- 차고 404 화면.
- (선택) 음량 조절, 별똥별 수집, 날씨 이벤트.

## 7. 이전에 승인된 결정과 충돌하는 지점 (확인 필요)

브리프 일부가 지난 작업에서 사용자가 정한 내용과 맞지 않는다. 임의로 고르지 않고 여기 적는다.

1. **작품 수**: 브리프는 LUNAI · LIMINAL · WORM UP 3개. 사이트는 사용자가 정한 대로 5개(LUMIORA · RUBATO 포함). 5개 유지 권장.
2. **"OUR GAMES" 문구**: WORKS 재구성 때 "OUR GAMES"를 은퇴시키고 WORKS로 바꿨다. 브리프는 다시 "OUR GAMES"를 쓴다.
3. **주소 구조**: 브리프 예시는 `/games/<id>/`. 현재는 `/works/<id>.html`이고 `/games.html`은 리다이렉트. 브리프도 "현재 구조에 맞게"를 허용하므로 유지 권장.
4. **비밀문**: 현재는 세 게임의 별로 여는 비밀 보관소 입구. 브리프는 비밀문을 LIMINAL 연출 → LIMINAL 상세로 쓴다. 보관소 입구를 바꾸면 별 수집 구조가 무너진다.
5. **ARCHIVE**: 현재 아카이브는 차고 안 비밀 보관소(별로 해금)와 보관 선반. 브리프는 독립 ARCHIVE 페이지와 카테고리(콘셉트아트·프로토타입·삭제된 것…)를 원한다. 둘 다 둘지, 독립 페이지는 해금된 사람만 볼지.
6. **TV 채널**: 현재 5채널(뉴스·DOKKA CAM·티저·연락처·무신호). 브리프는 게임별 채널+개발 영상. 사이트에 영상이 하나도 없어서 게임별 채널은 이미지 슬라이드가 된다.
7. **라디오 방송**: 브리프는 게임별 음악 방송(LIMINAL · WORM UP · LUNAI). 사이트에 그 음악 파일이 없다. 각 프로젝트의 음악을 가져와도 되는지, 어떤 곡인지 지정이 필요하다.
8. **새 이미지**: 브리프의 REQUIRED NEW IMAGE MANIFEST(차고 마스터·창문 3종·물건 상태 이미지·OG 4종·404 그림 등). 기존 규칙상 새 AI 이미지는 승인 후에만 만든다. 대부분은 기존 판·원화의 crop/mask/CSS로 해결 가능해 보인다(PHASE 36 원칙). 생성이 꼭 필요한 항목만 따로 목록으로 올려 승인받겠다.
9. **WORM UP! 공개 문구**: 정본 v6에는 "지렁이는 계속 앞으로 간다", 부제 「봄은 모두에게 같은 날 오지 않았다」, Steam판이 있다. 사이트 공개 문구·장르·플랫폼 표기(Steam · PC), 갤러리 교체(현재 러너 화면 10장)를 무엇으로 할지 승인 필요. Steam 상점 페이지는 아직 없다(가짜 링크 금지).
10. **분석 도구**: 현재 없음. 브리프대로 외부 추적은 넣지 않고 이벤트 구조만 설계하는 것으로 이해했다.

## 8. 제안 진행 순서

브리프 PHASE 34 순서를 따르되, 위 7번 결정에 영향받지 않는 작업부터 한다.

1. **B 정보 구조**: 내비 정리(HOME · WORKS · STUDIO · SUPPORT, CONTACT는 페이지로), 새 페이지 골격(CONTACT · PRESS · 차고 404), sitemap.
2. **C WORKS/상세**: WORM UP! 정보 교체(9번 승인 후), 상세 페이지 공통 구조 점검, 구조화 데이터.
3. **D 차고**: 첫 화면 소개 문장, 재방문 빠른 입장, 첫 진입 단서, PC 입구 정리.
4. **E 크루**: 이미 있는 행동 체인 점검, SLEEP·CARRY가 기존 스프라이트로 가능한지 판단(새 프레임은 승인 후).
5. **F 오디오**: 음량 조절·기억, 게임별 방송은 7번 결정 후.
6. **G 아카이브** · **H PRESS/CONTACT/SUPPORT** · **I 모바일/접근성** · **J SEO** · **K 성능**(ENTER 후 스프라이트 지연 로딩) · **L 최종 QA**.

각 단계마다 BEFORE/PROBLEM/IMPLEMENTED/FILES/NEW ASSETS/REMOVED/PERFORMANCE/MOBILE/TEST/SCREENSHOTS/NEXT 형식으로 보고하고, 배포는 사용자 확인 뒤에만 한다.
