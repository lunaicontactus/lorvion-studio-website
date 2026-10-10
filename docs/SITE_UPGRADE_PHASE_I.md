# SITE UPGRADE — PHASE I REPORT (MOBILE / RESPONSIVE / ACCESSIBILITY)

브랜치 `phase-i-mobile-accessibility` (main `6008d66` = `prod-2026-10-10`에서). 수정 전 감사는 `SITE_UPGRADE_PHASE_I_AUDIT.md`. **production: PR #26 → `f862f29`, run 38050217933, tag `prod-2026-10-10-phase-i`** (§12).

**실제 iPhone은 테스트하지 않았다.** 이 문서의 "WebKit"은 전부 Playwright WebKit 시뮬레이션이다(§8).

## 1. 결과 요약 — BEFORE / AFTER

같은 감사 하네스, 같은 710개 화면 상태(17 viewport × 42 상태)로 다시 쟀다.

| 항목 | BEFORE (`6008d66`) | AFTER |
|---|---|---|
| 가로 넘침 | 0 | 0 |
| h1 정확히 1개 | 710/710 | 710/710 |
| 이름 없는 컨트롤 · alt 없는 이미지 | 0 · 0 | 0 · 0 |
| 44px 미만 터치 대상(문장 안 링크 제외) | 3,602건 | **0** (진열장 그림 물건은 별도 — §3) |
| 10px 미만 글자 | 1,344건 | **0** |
| 화면 밖인데 포커스되는 컨트롤 | 17건 (TV 손잡이 16 · VIEW LIMINAL 1) | 1건 (568×320 VIEW LIMINAL — 서류 칸 안에서 스크롤로 닿음) |
| 가운데를 다른 것이 가로챈 대상 | 218건 | 221건 — 전부 설계상 상태(§3 표). **TV VIEW PROJECT 17건은 0** |
| axe-core 4.13 (WCAG 2.0/2.1/2.2 A · AA) | 27건 (footer 대비 serious 24, 라디오 ARIA critical 2, 표 스크롤 serious 1) | **0건** |
| 패널 Tab 가두기 | 8종 중 7 | **8/8** |
| 모바일 메뉴 | Tab 탈출 · 바깥 탭 무반응 · 짧은 가로에서 링크 잘림 | 가두기 · Escape · 바깥 탭 · 스크롤 잠금 · 모든 폭에서 모든 링크 닿음 |
| 회전(세로→가로→세로, 새로고침 없음) | 정상 | 정상 (히트 불일치 0, 서랍 tray 전환, 사건 탭 맨 위) |

"221건"이 BEFORE보다 3건 많은 이유: 사건 서류가 자기 탭을 덮는 상태가 세로 화면 7곳에서 그대로이고, 감사 하네스가 가운데 한 점만 본다. 실제로 손가락이 닿는지는 e2e가 44px 정사각형으로 따로 잰다(§3).

## 2. 수정 — root cause별

| # | 문제 | root cause | 수정 | 파일 |
|---|---|---|---|---|
| I-1 | TV VIEW PROJECT 클릭 · 탭 불가(production bug) | 지지직 화면 `.tvset__static`이 opacity 0 뒤에도 링크 위에서 클릭을 받음 | 지지직은 그림일 뿐 — `pointer-events:none` | `src/styles/props.css` |
| I-2 | 택배 패널에서 Tab이 밖으로 | 가두기가 `offsetParent`로 걸렀는데 `position:fixed` 닫기 버튼은 null → 목록이 빔 | 보이는지는 `getClientRects()`와 `visibility`로 판단 | `src/ui/panels.ts` `#trap` |
| I-3 | 홈에서 보이지 않는 링크 11개에 포커스 | 크롤러 · no-JS용 `nav.visually-hidden`이 Tab 순서에 있음 | 지우지 않고(no-JS 경로), 포커스를 받으면 화면 왼쪽 아래에 보이는 44px 링크 띠로 나타남 | `src/data/sitemap.ts`, `src/styles/layout.css` |
| I-4 | 모바일 메뉴 | 가두기 · 바깥 탭 처리 없음, 짧은 가로에서 `justify-content:center` 고정 높이 | Tab/Shift+Tab 순환(토글 + 링크), 메뉴 바깥(배경) 탭으로 닫힘, `safe center` + 세로 스크롤 + safe-area 하단 여백, 짧은 화면 간격 축소 | `src/ui/nav.ts`, `src/styles/responsive.css` |
| I-5 | TV 손잡이가 화면 밖인데 포커스됨 | 휴대폰에서 화면(브라운관)으로 확대해 손잡이가 창 밖 | `#fit`이 손잡이 영역이 창 밖이면 `is-knobs-out` → `visibility:hidden`(포커스 · 탭 모두 제외). 채널은 아래 숫자 줄로 바꾼다 | `src/ui/panels.ts`, `props.css` |
| I-6 | 라디오 방송국 5.6px · 높이 34px | 버튼을 다이얼(휴대폰에서 150px)에 주파수 위치로 매달아 글자가 cqi 비율 | 방송국을 그릴 아래 한 줄에 고르게, 글자 최소 10–11px, 44px. 바늘은 그대로 주파수 위치 | `panels.ts`, `props.css` |
| I-7 | footer 링크 19px · brand 28px · 메뉴 40px · 한 줄짜리 메일 링크 18px | 링크가 inline | `min-height:44px` (footer · nav · 메뉴 버튼 · 한 줄 자체가 링크인 경우) | `layout.css`, `nav.css`, `pages.css` |
| I-8 | 차고 물건 히트가 320–360px에서 38–43px | 여백이 사방 똑같아 이웃 하나(5px 아래 비밀문)가 네 방향을 다 막음 | 여백을 변마다 따로: 모두 같은 공통 여백 + 아직 모자라면 비어 있는 쪽으로 더. 이웃과 겹치지 않는 규칙은 그대로 | `src/scenes/garage.ts` `hitPadding` |
| I-9 | TV 장면 점 28px · 패널 닫기 38px | 작은 점을 그대로 대상으로 | 점 44px(보이는 점은 9px 그대로), 닫기 44px | `props.css`, `panels.css` |
| I-10 | 10px 미만 글자 1,344건 | cut-out 안 글자가 `cqi`/`em` 비율이라 하한 없음, mono 라벨 `.56–.62rem` | 모든 비율 크기에 `max(10px, …)`, `clamp()` 하한 10px, rem 라벨 `.64rem`. 커진 글자로 서류철 탭이 한 줄 늘어 사건 서류가 탭 3개를 더 덮던 것은 탭 간격 · 반폭 줄바꿈으로 BEFORE와 같게(자기 탭만) | 5개 CSS |
| I-11 | footer 대비 3.66:1 | 색 `#646b7c` | `#8a90a0` (6.12:1 / 6.38:1) | `layout.css` |
| I-12 | 라디오 `.prop`에 `aria-checked` (axe critical) | 라디오 루트도 `data-station`을 갖고 있어 `[data-station]` 선택자에 같이 걸림 | 선택자를 `.radio__st[data-station]`로 | `panels.ts` |
| I-13 | 개인정보처리방침 표: 키보드로 못 가는 가로 스크롤 (axe) | 표 `display:block; overflow:auto` + 칸 `min-width:160px` | 표가 페이지 폭에 맞고 칸이 줄바꿈. **법적 본문 · 마크업 그대로**(CSS만, SHA 고정 테스트 통과) | `pages.css` |
| I-14 | safe-area 없음 | `viewport-fit=cover`인데 fixed UI에 inset 없음 | nav 좌우, 이미지 뷰어 사방, 가로 휴대폰 미니게임 조작 버튼 | `nav.css`, `works.css`, `games.css` |
| I-15 | 택배 메모가 화면 옆으로 잘림 · 진열장 카드 버튼이 화면 아래로 | 태그가 상자 위 가운데 고정 / 카드 높이 제한 없음 | 태그를 화면 안으로 밀고 꼬리는 상자 위에 남김(`--tail`), 카드는 창에 남은 높이까지(`--card-room`), 넘치면 안에서 스크롤 | `panels.ts`, `props.css` |
| I-16 | 크루 히트 44×35–40 | 물건 가운데를 피하려 잘라낸 몸통이 44 아래로 | 잘린 뒤에도 44 — 물건 반대쪽(머리 위 · 발 아래)으로 늘림 | `src/scenes/npc.ts` |
| I-17 | 물건 포커스 표시가 약함 | 6px 따뜻한 빛이 따뜻한 그림 위에서 거의 안 보임 | 물건 윤곽을 따라 크림 안쪽 + 어두운 바깥 선 + 빛(사각형 링 아님). reduced motion에서도 보임(움직임만 없음) | `garage.css` |
| I-18 | 실기기 없음 | — | §8 | — |

**변경하지 않은 것**: PHASE F 오디오 구조 · NIGHT 루프, 게임 규칙 · 밸런스(조작 버튼 위치와 safe-area만), 법적 본문, 작품 정보, 이미지 · 음악(새로 만든 것 없음), 외부 서비스(없음).

## 3. 터치 대상 계약 (Touch target contract)

`e2e/touch-i.spec.ts` — 6개 화면(320×568 · 390×844 · 568×320 · 844×390 · 768×1024 · 1440×900)에서 페이지 11개, 열린 메뉴, 이미지 뷰어, 차고 + 패널 8종 + 사건 서류 + TV 작품 채널 + 비밀 보관소 + 폴라로이드, 미니게임 3종(시작 전 · 플레이 중). 보이는 모든 컨트롤이:

1. **크기** ≥ 44×44 CSS px. 예외 둘:
   - 문장 안 링크 — WCAG 2.5.8 inline 예외.
   - 진열장의 그려진 물건 14개. 그림 크기 그대로라 휴대폰에서 폭 15–41px이고, 이웃과 맞닿아 넓힐 수 없다. **44px 대체 경로**: 하나를 고르면 카드의 ‹ ›(44px)가 14개 전부를 돈다. 테스트가 대체 경로 자체를 확인하고, axe target-size에서는 이 14개만 빼고 나머지는 그대로 실패시킨다.
2. **가로채이지 않음** — 자기 가운데가 자기 것이거나, 큰 대상이면 자기 것인 44px 정사각형이 하나 있음(흩어진 폴라로이드가 이웃에 반쯤 덮인 경우). 둥근 버튼은 가운데로 판정.
3. **화면 안** — 패닝하는 세계(차고 · 놀이터 · 비밀 보관소)와 스크롤 상자 안은 스크롤 · 패닝으로 닿으면 된다.
4. 보이는 글자 ≥ 10px, 가로 넘침 0.

**설계상 덮이는 것** (테스트에 이유와 함께 명시):

| 상태 | 무엇이 무엇을 | 이유 |
|---|---|---|
| 열린 모바일 메뉴 | 메뉴 판이 상단 바의 brand · 소리 버튼을 덮음 | 메뉴는 화면 전체 판. 판 + 닫기 토글만 검사, Tab도 그 둘 안에서만 돈다 |
| 미니게임 시작 전 | 안내 카드가 조작 버튼을 덮음 | 카드가 먼저. 카드 안 버튼만 검사, 플레이 중에는 전체 검사 |
| 세로 휴대폰, 사건 서류를 연 상태 | 올라온 서류가 **자기 탭**(「두 개의 이름표」)을 덮음 | 서류가 그 탭이 연 것. 다른 탭은 덮지 않음(BEFORE와 같음). Escape · ×로 내려놓음 |

## 4. 키보드 · 포커스

| 키 | 동작 |
|---|---|
| Tab / Shift+Tab | 골목 ENTER → 차고 물건 → 크루 → (포커스될 때만 보이는) 페이지 링크 띠 → nav. 패널 · 뷰어 · 메뉴가 열려 있으면 그 안에서만 순환 |
| Enter / Space | 물건 · 버튼 · 방송국 선택 |
| Escape | 패널 · 뷰어 · 메뉴 닫기, 포커스는 연 것으로 돌아감 |
| 방향키 | 차고 · 놀이터 카메라 이동(기존), 게임 조작(기존) |

- `tabindex > 0` 없음 — 모든 route에서 테스트.
- 대화상자: `role="dialog"` · `aria-modal="true"` · 이름 있음. 패널 8종 + 폴라로이드 + 뷰어 2종.
- 라디오: 방송국은 `role="radiogroup"` 안의 `role="radio"` + `aria-checked`. 전원 · 다음은 `aria-pressed` / `aria-label`. 사이트 소리 버튼은 `aria-pressed` + 상태에 따라 바뀌는 이름("소리 켜기/끄기"), 44×44.

## 5. 모바일 · 반응형

- **320px**: 모든 route 가로 넘침 0, 메뉴 링크 모두 화면 안, 차고 물건 · 크루 히트 ≥ 44.
- **회전**: `e2e/a11y-i.spec.ts`, `e2e/webkit-i.spec.ts` — 새로고침 없이 차고 orientation 전환, 열린 서랍 tray ↔ 세로, 사건 탭 맨 위, 넘침 0.
- **100vh / svh**: 고정 레이어(패널 · 뷰어 · 게임)는 `position:fixed; inset:0`이라 주소창 변화를 따라간다. 높이를 계산하는 곳은 이미 `svh`(툴바가 보일 때의 높이)였고, 비밀 보관소 폴라로이드 · 기억 상자 패널 5곳만 `100vh`라 iPhone 툴바 아래로 들어갈 수 있었다 → `100svh`로(`archive.css`). 데스크톱에서는 같은 값.
- **safe-area**: §2 I-14. 패널 닫기 · 골목 · 비밀 보관소 · 기록실 버튼은 이미 있었다.
- **reduced motion**: 기존 규칙 유지. 새 포커스 링은 reduced motion에서 보이되 움직이지 않음(`transform:none`, transition 0) — 테스트.
- **대비**: footer 수정 뒤 axe color-contrast 0. 상태를 색으로만 표시하지 않음 — 방송국 `aria-checked` + 글자색 · 배경, TV 채널 `aria-pressed`, 소리 버튼 이름.

## 6. 테스트

| 종류 | 파일 | 수 |
|---|---|---|
| unit | `test/text-floor-i.test.ts` (CSS 10px 하한 가드) | +3 (전체 339) |
| e2e | `e2e/a11y-i.spec.ts` — axe(390 · 1440, 페이지 13 + 골목 · 차고 · 패널 6), 패널 8종 가두기 · Escape 복귀, `tabindex>0` 0, 페이지 링크 띠, TV VIEW PROJECT 클릭, 라디오 ARIA, 메뉴 4개 화면, 회전, reduced motion | 22 |
| e2e | `e2e/touch-i.spec.ts` — §3 계약 | 29 |
| e2e (webkit project) | `e2e/webkit-i.spec.ts` — 시뮬레이션 iPhone 3개 화면 + 회전 | 13 |

- axe(`@axe-core/playwright` 4.13, devDependency, MPL-2.0)는 테스트에만 있다. production bundle에 없음을 확인했다.
- 기존 e2e는 모두 그대로 통과해야 merge — 판정은 PR의 GitHub full e2e(Linux CI).
- **로컬 full e2e (macOS, 1 worker, 496개): 494 통과, 2 실패 — 둘 다 환경, 코드 아님.**
  - `outside.spec.ts:232` phone sideways: 실행 중 Mac이 13:01–13:19 잠자기(pmset 로그)로 17.5분 정지. 같은 테스트 15회 반복 15/15 통과.
  - `audio.spec.ts:92` 라디오: 노래 위치가 1초를 넘어야 하는데 0.6–0.8초. 이 Mac에서 미디어 시계가 멈춰 있었다(재생 중인데 `currentTime`이 0.74에서 정지, 골목 소리는 0.00에서 정지). **production(eungarage.com)도 이 Mac에서 똑같이 실패**(0.58 · 0.76). PHASE I는 오디오를 건드리지 않았다. production에서 이 테스트는 CI 432/432에 포함돼 통과했다.

## 7. 성능

새 이미지 · 소리 · 라이브러리 없음. bundle: JS 305,317 → 306,737 B (gzip +0.6 KB), CSS 138,825 → 141,916 B (gzip +0.5 KB). works · archive 배경 700KB는 PHASE K.

## 8. SIMULATED WEBKIT QA vs REAL DEVICE QA

### 한 것 — 시뮬레이션 (Playwright WebKit, macOS)

`e2e/webkit-i.spec.ts`: WebKit 엔진 + 휴대폰 크기(390×844 · 844×390 · 320×568) + `isMobile` · `hasTouch` + iPhone Safari user agent.
- 12개 페이지: h1 1개, 가로 넘침 0, 본문 10px 미만 0
- 메뉴: 탭으로 열기, 모든 링크 44px 이상으로 닿음, 바깥 탭으로 닫힘
- 이미지 뷰어: 탭으로 열고 닫기, 닫기 버튼이 맨 위
- 차고: 탭으로 들어가기, TV → 채널 → VIEW PROJECT 탭 → 작품 페이지, 기록 서랍 → 사건 파일 → VIEW LIMINAL
- 회전: 세로 → 가로 → 세로

### 하지 않은 것 — 실제 iPhone

**실제 iPhone Safari로 테스트하지 않았다.** 시뮬레이션이 답하지 못하는 것:
- 주소창 · 툴바가 스크롤에 따라 나타나고 사라질 때 높이(고정 레이어, 메뉴, 게임)
- 노치 · 다이내믹 아일랜드 · 홈 인디케이터의 실제 safe-area 값(시뮬레이션에서 inset은 0)
- 실제 손가락 크기 · 터치 지연 · 스크롤 관성, 길게 누르기 메뉴
- iOS 글자 자동 확대, 시스템 글자 크기 설정
- 실제 오디오 정책(무음 스위치, 첫 탭 전 재생 차단)
- VoiceOver

### 5분 사람 체크리스트 (iPhone Safari, 세로로 시작)

1. **(30초)** eungarage.com → ENTER. 차고가 화면을 채우고 위아래 흰 띠가 없는지. 노치 쪽에 로고가 가려지지 않는지.
2. **(45초)** TV 탭 → 아래 숫자 `01` → VIEW PROJECT 탭 → LUNAI 페이지가 열리는지. 뒤로.
3. **(45초)** 라디오 탭 → 방송국 이름이 읽히는지 → `91.7 NIGHT` 탭 → 소리가 나는지(무음 스위치 끈 상태). 오른쪽 위 소리 버튼으로 꺼지는지.
4. **(45초)** 기록 서랍 탭 → 「두 개의 이름표」 탭 → VIEW LIMINAL까지 손가락이 닿는지. **폰을 가로로** 돌려 서랍이 왼쪽 캐비닛 + 오른쪽 두 칸으로 바뀌는지, 노치 쪽이 잘리지 않는지.
5. **(30초)** 가로 그대로 메뉴(☰) → 링크가 모두 보이거나 스크롤로 닿는지 → 메뉴 바깥 탭으로 닫히는지.
6. **(45초)** 세로로 돌려 Works → LUNAI → 사진 탭 → 뷰어 아래 버튼 줄이 홈 인디케이터에 걸리지 않는지 → 닫기.
7. **(30초)** 개인정보처리방침 → 표가 옆으로 넘치지 않고 끝까지 읽히는지.
8. **(30초)** 놀이터에서 미니게임 하나 시작 → 가로로 돌려 조작 버튼이 화면 가장자리 · 홈 인디케이터에 걸리지 않는지.

결과는 known issue 3(`docs/OPERATIONS.md`)에 적는다.

## 9. 회귀 매트릭스 — 사용자 경로 12개

| # | 경로 | 자동 검증 |
|---|---|---|
| 1 | 골목 → ENTER → 차고 | entrance · journey · a11y-i(키보드) · webkit-i(탭) |
| 2 | 차고 → PC → 작품 아이콘 → 작품 페이지 | props · presentation · garage-d |
| 3 | 차고 → TV → 채널 → VIEW PROJECT | ia · a11y-i · webkit-i (클릭 · 탭 모두) |
| 4 | 차고 → 라디오 → 방송국 · 전원 · 사이트 소리 | audio · audio-f · a11y-i |
| 5 | 차고 → 기록 서랍 → 사건 파일 → VIEW LIMINAL / 정책 서류 | garage-d · drawer-landscape · webkit-i |
| 6 | 차고 → 진열장 → 물건 → ‹ › → PC에서 자세히 보기 | objects · props · touch-i |
| 7 | 차고 → 냉장고 · 작업대 · 택배 | living · delivery · touch-i |
| 8 | 차고 → 비밀문 → 비밀 보관소 → 폴라로이드 · 기억 상자 · 오르골 | archive-g · touch-i |
| 9 | 차고 → 놀이터 → 미니게임 3종 | outside · snack · sneak · delivery · gameshell · touch-i |
| 10 | Works → 작품 → 이미지 뷰어 | works · works-route · gallery · touch-i |
| 11 | Archive → 기록 → 뷰어 | archive · touch-i |
| 12 | Studio · Support · Contact(mailto 4종) · Press(다운로드 10개) · LUNAI 문서 4개 · 404(noindex, 링크 3개) | info-h · touch-i · webkit-i |

live에서는 같은 경로를 smoke로 다시 돈다(데스크톱 · 휴대폰 세로 · 휴대폰 가로 · WebKit).

## 10. 스크린샷

`docs/shots/phaseI/before/`(production `6008d66`)와 `after/`에 같은 이름으로 44장씩. 화면 320×568 · 390×844 · 844×390 · 768×1024 · 1440×900. 상태: 차고, TV · 라디오 · 진열장 패널, 비밀 보관소, 모바일 메뉴, 개인정보처리방침, 프레스, 미니게임 플레이 중. 비교 시트: `compare_390x844.jpg`, `compare_320x568.jpg`.

## 11. 범위 밖

- NIGHT `ambient.m4a` 루프 — 원본 파일(known issue 2)
- works · archive 배경 700KB — PHASE K
- 법적 문서 운영 주체 표기 — 법적 검토(known issue 1)
- 진열장 물건 목록형 보기 — 선택(known issue 5)

## 12. Production (2026-10-10)

| 항목 | 결과 |
|---|---|
| PR #26 | head `0167162`, PR verify 496/496 → merge commit **`f862f29`** |
| production run | **38050217933** — lint · typecheck · unit 339/339 · build · brand scan · e2e 496/496 · frozen URL → `dist-f862f296…` artifact 그대로 배포(재빌드 없음, `.nojekyll` 포함) |
| live bundle | `main-DJ3w7pHA.js` · `main-CcRcfwo1.css` — artifact · 로컬 빌드와 같은 이름(cache-busted 요청) |
| regression smoke | 69/69 (ENTER · 차고 · 크루 · PC · TV · 라디오 · 냉장고 · 서랍 · 비밀문 · 놀이터 · 미니게임 · Works 5 · 공개 기록실 · 비밀 보관소 …) |
| PHASE H smoke | 50/50 (Studio · Support · Contact · Press · LUNAI 문서 4 · 404, 데스크톱 · 세로 · 가로 · WebKit) |
| PHASE I smoke | 20/20 — 키보드만으로 골목 → 차고 → PC → Escape 복귀, Works → LUNAI → 뷰어 → Escape 복귀 → Shift+Tab; LIMINAL 사건 파일 키보드 열기 · 닫기 · 복귀(3개 화면); 진열장 ‹ › 14개 순환(3개 화면); 택배 가두기; 라디오 글자; production DOM(main · nav · footer · h1 · 현재 페이지 · 이름 · alt · aria-expanded · aria-pressed); 개인정보 표 · footer 대비 6.12:1; 메뉴 배경 탭 차단; safe-area CSS; WebKit TV 탭 · 568×320 메뉴 |
| PHASE I spec을 production에 | 64/64 — axe 0(390 · 1440), 패널 8종 가두기, 6개 화면 터치 계약, 회전, reduced motion, WebKit 시뮬레이션 |
| 법적 본문 | LUNAI 문서 4개 production 텍스트 해시 = PHASE H 이전 production |
| REAL IPHONE SAFARI QA | **NOT YET PERFORMED** (§8 체크리스트) |
