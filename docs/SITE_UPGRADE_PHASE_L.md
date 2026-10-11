# SITE UPGRADE — PHASE L REPORT (FINAL QA)

브랜치 `phase-l-final-qa` (main `e98a466` = PHASE K production에서). 새 기능 없음. A–K로 만든 사이트 전체를 처음 온 사람처럼 다시 돌고, 남은 문제를 찾는다. merge SHA · run · 최종 tag는 merge 뒤 release 노트에 적는다.

## 1. 기준

| | |
|---|---|
| production (QA 대상) | `e98a466` — PHASE K, run 38118167112, `main-CJAmBQqF.js` · `main-D9Lej7H9.css` · 홈 `world-BXByOmgr.js` |
| PHASE J | PR #28 → `ef5e5fd`, run 38108557936 (508/508) |
| PHASE K | PR #29 → `e98a466`, run 38118167112 (515/515) |

## 2. L-1 route 정본

정본은 sitemap(16개)과 저장소의 HTML 파일(18개)에서 나왔다.

| 종류 | route |
|---|---|
| 색인 대상 (16) | `/` · `/works.html` · `/works/{lunai,liminal,wormup,lumiora,rubato}.html` · `/archive.html` · `/studio.html` · `/support.html` · `/contact.html` · `/press.html` · `/privacy.html` · `/terms.html` · `/community-guidelines.html` · `/account-deletion.html` |
| noindex (2) | `/404.html` (모르는 주소에 Pages가 보여 줌, 404 응답) · `/games.html` (옛 주소 → `/works.html`로 넘김, 고정 URL이라 유지) |
| 죽은 HTML · 고아 | 없음. 모든 색인 페이지가 다른 페이지에서 링크됨(`e2e/seo-j.spec.ts`) |

`e2e/final-l.spec.ts` L-1 — 16개 + 404, Chromium · Firefox · WebKit 모두 확인:
- 200, 이름에 EUNGARAGE, canonical = 자기 주소(404는 없음)
- nav · main 1 · h1 1 · footer(홈은 방 전체 화면이라 footer 대신 nav와 숨은 페이지 목록) · 가로 넘침 0
- console error · uncaught error · 실패한 first-party 요청 0

## 3. L-2 · L-3 여정과 브라우저

`e2e/final-l.spec.ts`, **Chromium · Firefox · WebKit 30/30** (10개 × 3엔진, 로컬):

| 여정 | 방법 | 내용 |
|---|---|---|
| A 처음 방문 | 마우스 | 골목 ENTER → 차고 → TV → nav WORKS(방 안에서는 PC가 열림) → 데스크톱 LIMINAL → 작품 페이지 → WORKS → LUNAI → 차고로 |
| B 세계 탐색 | 마우스 + 키보드로 물건 열기 | TV → 라디오(방송국) → 냉장고 → 서랍 → LIMINAL 사건 파일 → 놀이터 왕복 → 비밀문 → 비밀 보관소 (Linux WebKit만 비밀문 전까지, 아래) |
| B′ 덜 움직이게 | reduced motion | 별 3개 → 놀이터 왕복 → 비밀문 → 비밀 보관소 |
| C 작품 · 기록 | 마우스 | 작품 5개 각각 갤러리 뷰어 열고 → 다음 → 닫기 → 기록실 EARLY PROTOTYPE · 뷰어 |
| D 회사 정보 | 마우스 | Studio → Press → Contact(메일 4종) → Support |
| E LUNAI 문서 | 마우스 | Support → 개인정보 → 이용약관 → 커뮤니티 → 계정 삭제 |
| F 오류 경로 | 마우스 | 모르는 주소 → 404(production에서 404 응답) → 링크 3개 이상 → Works |
| 키보드 | Tab · Enter · Escape (WebKit은 Safari처럼 Option+Tab) | 골목 ENTER → PC → Escape 복귀 → Works → 작품 → 사진 → 뷰어 → Escape → 사진으로 복귀 |
| 터치 | 390×844 (Firefox는 터치 화면, 모바일 모드 없음) | ENTER → PC → WORM UP! → 사진 → 닫기 → 메뉴 → Studio → 메뉴 → Contact |

모든 여정에서 uncaught error · console error · 실패한 first-party 요청 **0**.

- 키보드 여정은 처음에 WebKit에서 건너뛰었다가 되살렸다: Safari의 기본 Tab은 링크와 버튼을 건너뛰고, Option+Tab이 실제 Safari 키보드 사용자가 누르는 키다.
- **여정 B — PR verify 두 번 실패(WebKit만, 541/542 두 번).** 원인을 끝까지 쫓았다.
  - **1차 가설 · 수정(맞지만 부족):** 놀이터는 도착하는 동안(crossing) 입력을 일부러 무시한다(`src/app/world.ts` `onPlace`, WORLD 2.1). 테스트가 고정 1.5초를 기다려서 CI WebKit에서 그 안에 눌렀다. 도착을 기다리도록 고쳤다 — 두 번째 run(38130307202)도 같은 자리에서 실패.
  - **진짜 원인 — Linux WebKit 렌더러 종료, 환경 문제.** 임시 진단 PR #31(CI와 같은 Ubuntu 러너, 머지 안 하고 닫음)에서 확인:
    - 별 3개(비밀문 열림) + 애니메이션 crossing → **web process가 사라짐**(exit 0, signal 없음, 페이지 오류 없음). 4회 중 2–4회.
    - 별 없음: 11회 모두 정상. reduced motion(crossing 애니메이션 없음): 3/3 정상.
    - 별 그림(문 틈 빛 · 문 별 · 간판 소켓)을 모두 숨겨도 계속 → 특정 CSS가 원인이 아님.
    - **PHASE I 코드(`f862f29`)도 3/3 같은 증상** → J · K · L보다 오래된 상태.
    - **macOS WebKit(Apple 포트): 같은 경로 10/10 정상**(데스크톱 5 · 휴대폰 5). Chromium · Firefox도 정상.
    - 결론: CI의 Linux WebKit(소프트웨어 렌더링) 포트에서만 나는 엔진 종료. 사이트 코드 오류로 볼 근거 없음.
    - **실제 iPhone Safari에서 같은 일이 없는지는 확인하지 못했다** → known issue 5, 체크리스트 §9에 항목 추가.
  - **테스트 처리(건너뛰기 아님, 근거와 함께 분리):**
    - 여정 B는 Linux WebKit에서만 별 없이 놀이터 왕복까지 간다(다른 엔진 · macOS WebKit은 별 + 비밀문까지 전부).
    - 새 여정 **B′**(별 + reduced motion + 놀이터 왕복 + 비밀문 → 비밀 보관소)를 세 엔진 모두에서 돌린다.
    - 새 B · B′: Linux WebKit 6/6(진단 러너), 로컬 세 엔진 6/6.
- 오류 경로는 production에서 처음 실패했다(test bug). 모르는 주소가 정상적으로 404를 내고, Chromium · WebKit이 그 사실을 주소 없이 console에 남기기 때문이다. 그 한 줄만, 다른 404가 없을 때만 예외로 했다.

## 4. L-4 화면 매트릭스

PHASE I 감사 하네스, 7개 화면 × 42 상태 = **293 상태**: 320×568 · 390×844 · 430×932 · 568×320 · 844×390 · 768×1024 · 1440×900.

| 항목 | 결과 |
|---|---|
| 가로 넘침 | 0 |
| 44 px 미만 필수 대상 | 0 (진열장 그림 물건은 known issue 4의 대체 경로) |
| 10 px 미만 글자 · 잘린 글자 · 이름 없는 컨트롤 · alt 없는 그림 | 0 · 0 · 0 · 0 |
| h1 ≠ 1 | 0 |
| 화면 밖 컨트롤 | 1 — 568×320 사건 서류의 VIEW LIMINAL이 서류 칸(스크롤 상자) 아래에 있음. **포커스하면 Chromium · WebKit 모두 화면 안으로 스크롤됨**(328 → 220 px) → 포커스 대상이 화면 밖에 남는 경우 0 |

## 5. L-5 접근성 · L-6 SEO · L-7 성능 · L-8 소리 — J · K 뒤에도 유지

| 항목 | 결과 |
|---|---|
| axe WCAG 2.2 A/AA | 0 (390 · 1440, 12개 페이지 + 골목 · 차고 · 패널 4) |
| PHASE I spec (axe · 키보드 · 가두기 · 복귀 · 메뉴 · 회전 · reduced motion · 6개 화면 터치 계약 · WebKit) | 64/64, production에서도 |
| SEO (제목 · 설명 · canonical · OG · 공유 이미지 · JSON-LD · sitemap · robots · noindex) | `test/seo-j.test.ts` 10/10, production 메타 smoke 27/27, 크롤 2/2 |
| 성능 예산 | `e2e/perf-k.spec.ts` 7/7, production에서도 |
| 소리 | 제스처 전 오디오 요청 0(모든 페이지, production) · 소리 버튼 `aria-pressed` · 라디오 · 차고 노래 · 한 번에 한 곡 · 숨은 탭 무음은 기존 `audio` · `audio-f` spec(full e2e) · NIGHT 루프는 known issue 2 |

## 6. 성능 — `f862f29`(PHASE I) → 최종 production `e98a466`, live 측정

같은 하네스 · 같은 CDN, 3회 중앙값.

**desktop**

| 페이지 | KB `f862f29` → 최종 | 요청 | JS KB | 그림 KB | LCP ms | CLS |
|---|---|---|---|---|---|---|
| home | 1,854 → **1,855** | 16 → 17 | 102 → 103 | 1,716 → 1,716 | 160 → 236 | 0 → 0 |
| garage | 5,013 → **5,014** | 158 → 159 | 102 → 103 | 4,875 → 4,875 | 164 → 228 | 0 → 0 |
| works | 1,124 → **322** | 11 → 11 | 102 → 20 | 989 → 267 | 116 → 168 | 0 → 0 |
| lunai | 1,267 → **465** | 13 → 13 | 102 → 20 | 1,132 → 410 | 148 → 152 | 0 → 0 |
| liminal | 1,099 → **297** | 11 → 11 | 102 → 21 | 964 → 242 | 148 → 168 | 0 → 0 |
| wormup | 1,469 → **667** | 19 → 19 | 102 → 20 | 1,334 → 612 | 164 → 140 | 0 → 0 |
| lumiora | 1,344 → **542** | 8 → 8 | 102 → 20 | 1,209 → 486 | 128 → 256 | 0 → 0 |
| rubato | 1,247 → **445** | 13 → 13 | 102 → 20 | 1,112 → 390 | 100 → 204 | 0 → 0 |
| archive | 1,574 → **838** | 35 → 35 | 102 → 20 | 1,439 → 780 | 188 → 224 | 0 → 0 |
| studio | 366 → **237** | 11 → 11 | 102 → 20 | 232 → 183 | 116 → 140 | 0 → 0 |
| press | 595 → **403** | 14 → 14 | 102 → 20 | 460 → 348 | 120 → 144 | 0 → 0 |

**mobile**

| 페이지 | KB `f862f29` → 최종 | 요청 | JS KB | 그림 KB | LCP ms | CLS |
|---|---|---|---|---|---|---|
| home | 1,872 → **1,874** | 16 → 17 | 102 → 103 | 1,735 → 1,735 | 104 → 136 | 0 → 0 |
| garage | 4,146 → **4,148** | 117 → 118 | 102 → 103 | 4,008 → 4,009 | 104 → 128 | 0 → 0 |
| works | 1,200 → **312** | 11 → 11 | 102 → 20 | 1,064 → 257 | 112 → 112 | 0 → 0 |
| lunai | 1,343 → **456** | 13 → 13 | 102 → 20 | 1,207 → 401 | 100 → 112 | 0 → 0 |
| liminal | 1,174 → **287** | 11 → 11 | 102 → 20 | 1,039 → 232 | 100 → 104 | 0 → 0 |
| wormup | 1,544 → **658** | 19 → 19 | 102 → 21 | 1,409 → 602 | 100 → 124 | 0 → 0 |
| lumiora | 1,419 → **507** | 8 → 7 | 102 → 20 | 1,284 → 451 | 96 → 124 | 0 → 0 |
| rubato | 1,322 → **436** | 13 → 13 | 102 → 20 | 1,187 → 380 | 124 → 100 | 0 → 0 |
| archive | 1,632 → **721** | 32 → 31 | 102 → 21 | 1,496 → 664 | 120 → 100 | 0 → 0 |
| studio | 371 → **228** | 11 → 11 | 102 → 21 | 236 → 173 | 92 → 88 | 0 → 0 |
| press | 558 → **351** | 13 → 13 | 102 → 20 | 423 → 296 | 80 → 84 | 0 → 0 |

**slow**

| 페이지 | KB `f862f29` → 최종 | 요청 | JS KB | 그림 KB | LCP ms | CLS |
|---|---|---|---|---|---|---|
| home | 1,872 → **1,874** | 16 → 17 | 102 → 103 | 1,735 → 1,735 | 2412 → 2584 | 0 → 0 |
| garage | 1,873 → **1,874** | 103 → 104 | 102 → 103 | 1,735 → 1,735 | 2424 → 2496 | 0 → 0 |
| works | 1,200 → **312** | 11 → 11 | 102 → 20 | 1,065 → 258 | 2204 → 1128 | 0 → 0 |
| lunai | 1,151 → **191** | 9 → 6 | 102 → 20 | 1,016 → 136 | 3240 → 1368 | 0.4952 → 0 |
| liminal | 1,174 → **209** | 11 → 6 | 102 → 20 | 1,039 → 154 | 3444 → 1460 | 0.4952 → 0 |
| wormup | 1,125 → **192** | 9 → 6 | 102 → 20 | 990 → 137 | 3092 → 1364 | 0.5078 → 0 |
| lumiora | 1,350 → **438** | 7 → 6 | 102 → 20 | 1,215 → 383 | 5508 → 2612 | 0.5072 → 0 |
| rubato | 1,206 → **294** | 7 → 6 | 102 → 20 | 1,071 → 239 | 4032 → 1884 | 0.1796 → 0 |
| archive | 1,299 → **389** | 16 → 15 | 102 → 20 | 1,164 → 332 | 3180 → 2276 | 0 → 0 |
| studio | 371 → **202** | 11 → 10 | 102 → 20 | 236 → 148 | 848 → 872 | 0 → 0 |
| press | 357 → **189** | 9 → 8 | 102 → 20 | 222 → 134 | 840 → 836 | 0 → 0 |

- 데스크톱 · 휴대폰의 LCP는 모두 300 ms 안이고, 그 안에서 측정마다 수십 ms씩 흔들린다.
- slow 조건 작품 페이지 LCP는 2.0–5.5 s → 1.4–2.6 s, CLS 0.18–0.51 → 0.
- **slow 홈 LCP 2,412 → 2,584 ms**(7회 중앙값 2,572)를 따로 확인했다.
  - J 빌드(`ef5e5fd`)와 K 빌드(`e98a466`)를 같은 서버에서 번갈아 3쌍 측정: K 6,020 · 6,024 · 5,992 vs J 6,036 · 6,040 · 6,016 ms. **K가 오히려 16–24 ms 빠르다.**
  - production 차이는 몇 시간 간격으로 잰 CDN 편차이고, K의 회귀가 아니다.
- 차고(4–5 MB)는 의도된 크루 프레임이다(PHASE K 보고서 §3).

## 7. L-9 화면 검토

`docs/shots/phaseL/` (27장 + `_contact_sheet.jpg`): 데스크톱 1440×900 · 휴대폰 390×844 — 홈 · 차고 · 비밀 보관소 · Works · 작품 5 · 기록실 · 스튜디오 · 프레스; 가로 844×390 — 홈 · 차고 · 비밀 보관소.

직접 보고 확인한 것:
- 첫인상(골목 간판 · 셔터 · ENTER) · 차고 구도 · 작품 히어로 크롭 · 글자 위계 · 기록실 썸네일 · 정보 페이지 종이 — 겹침 · 잘림 · 읽을 수 없는 글자 · 브랜드 불일치 없음.
- 휴대폰 가로 골목에서 안내 문구가 셔터 아래쪽에 겹쳐 놓이는 것은 production(PHASE I 이전)과 같은 디자인이다.

감사 하네스의 골목 캡처가 빈 화면으로 나온 것(844×390)은 하네스가 그림이 그려지기 전에 찍어서다. PHASE I 이전 캡처도 같고, 2.5초 뒤 화면은 production · K 모두 정상이다(`kvis/alleycmp`).

## 8. L-10 · L-11 · L-12 콘솔 · 보안 · 브랜드

| 항목 | 결과 |
|---|---|
| uncaught exception · console error · 실패한 first-party 요청 · 빠진 그림 · CSS · JS · 예상 밖 404 | 0 — 모든 route · 모든 여정, 3개 엔진 |
| 비밀 값 (`dist` 전체: API 키 · 토큰 · 개인 키 · JWT 패턴) | 0 |
| localhost · dev · staging · 다른 호스팅 주소 (`dist`) | 0 |
| 디버그 경로 | 서버 쪽 endpoint 없음(정적 사이트). 클라이언트 쿼리 플래그 `?audiodebug`(오디오 관리자를 window에 노출) · 게임 시드(`?snackseed` 등) · `?npcseed`는 e2e가 production 빌드에 쓰는 테스트 훅이다. 데이터 노출 · 저장 없음 → 유지 |
| 개인정보 수집 주장 | 사이트 코드에 쿠키 · 분석 · beacon · 외부 전송(fetch) 없음. 저장은 방문자 브라우저의 localStorage(`eungarage:save` 소리 설정 등, 미니게임 진행, 안내를 봤는지, 방문 횟수)뿐이고 서버로 가지 않는다 |
| 옛 이름 `LORVION` | 공개 UI · `src` · `public` · HTML · `dist` 0 (brand scan · `test/brand.test.ts`). 남은 것은 저장소 이름과 과거 문서의 기록뿐 |
| lorem ipsum · TODO · FIXME · placeholder · 가짜 데이터 (`dist` HTML · JS) | 0 |

## 9. L-14 실기기

**REAL IPHONE SAFARI QA: NOT PERFORMED.** 모든 WebKit 결과는 Playwright WebKit 시뮬레이션(휴대폰 크기 · 터치 · iPhone UA)이다.

### 5분 체크리스트 (iPhone Safari, 세로로 시작, 무음 스위치 끔)

1. **ENTER**: eungarage.com → 골목 간판과 셔터가 보이고, 노치에 로고가 가리지 않는지 → ENTER.
2. **메뉴**: 차고에서 ☰ → 바깥을 탭하면 닫히는지.
3. **차고 터치**: 물건 두세 개를 손가락으로 바로 탭해 열리고 ×로 닫히는지.
4. **PC / TV**: PC → WORM UP! 아이콘 → 작품 페이지. 뒤로 → TV → 숫자 `01` → VIEW PROJECT → LUNAI 페이지.
5. **서랍**: 서랍 → 「두 개의 이름표」 → VIEW LIMINAL에 손가락이 닿는지.
6. **뷰어**: 작품 페이지 사진 → 아래 버튼 줄이 홈 인디케이터에 걸리지 않는지 → 닫기.
7. **회전**: 가로로 돌려 차고 · 메뉴(모든 항목) · 서랍(왼쪽 캐비닛 + 오른쪽 두 칸)이 맞게 바뀌는지.
8. **소리**: 오른쪽 위 소리 버튼 → 차고 노래가 들리는지 → 라디오 `91.7` → 다시 끄면 멈추는지.
9. **safe area**: 가로에서 미니게임 하나 → 조작 버튼이 가장자리 · 홈 인디케이터에 걸리지 않는지.
10. **(가능하면) 별 3개 상태**: 미니게임 셋에서 별을 모은 뒤 놀이터에 나갔다 돌아오기 → 탭이 멈추거나 "문제가 반복적으로 발생" 화면이 뜨지 않는지(known issue 5).

결과는 `docs/OPERATIONS.md` known issue 3에 적는다.

## 10. L-13 Known issues (최종)

1. 법적 문서 운영 주체 표기 차이 — 법적 검토 대기, 본문 변경 안 함.
2. NIGHT `ambient.m4a` 루프 지점 0.43초 무음 + 하드 재시작 — 원본 파일.
3. 실제 iPhone Safari QA 미실시 — §9.
4. 진열장 그림 물건 일부가 휴대폰에서 15–41 px — 44 px ‹ › 대체 경로.
5. CI의 Linux WebKit에서, 비밀문이 열린 상태(별 3개)로 애니메이션과 함께 놀이터로 나가면 web process가 종료됨. PHASE I 이전부터 있던 상태이고 macOS WebKit · Chromium · Firefox · reduced motion에서는 없음. 실제 Safari 영향 미확인 → 실기기 체크 §9-10.

해결되어 빠진 것: 700 KB 흐린 배경(PHASE K), 스크립트로만 그려지던 본문 · 공유 미리보기(PHASE J), PHASE I의 18건.

## 11. 이 PR의 변경

사이트 코드 변경 없음 — QA에서 고칠 제품 버그가 나오지 않았다.

| 파일 | 변경 |
|---|---|
| `e2e/final-l.spec.ts` (신규) | L-1 route 정본 + 여정 A–F · 키보드 · 터치, 콘솔 · 요청 감시 |
| `playwright.config.ts` | `final-l`을 Firefox · WebKit 프로젝트에도 |
| `docs/SITE_UPGRADE_PHASE_L.md` · `docs/shots/phaseL/` | 이 보고서와 증거 |
| `docs/OPERATIONS.md` | J · K production 기록, known issue 최종 목록 |
