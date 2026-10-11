# SITE UPGRADE — PHASE J REPORT (SEO / SEARCH / SOCIAL DISCOVERY)

브랜치 `phase-j-seo` (main `d6693fb`에서, production 사이트 = `f862f29`). 원칙: 사이트에 이미 있는 사실만 — 키워드 채우기, 평점 · 리뷰 · 가격 · 출시일 · 창립 연도 · 인원 · 상점 링크 · SNS 없음.

## 1. BEFORE 감사 (production `f862f29`, 17개 공개 HTML)

| 항목 | BEFORE |
|---|---|
| `<title>` | 17개 모두 있음, 중복 없음 (`games.html`은 `/works.html`로 넘기는 옛 주소라 같은 이름) |
| meta description | 있음. 단 4개는 제목을 그대로 반복: 고객지원("LUNAI 고객지원"), 개인정보처리방침, 이용약관, 계정 삭제. 작품 5개는 한 줄 소개만 |
| canonical | 색인 대상 16개 모두 있음 · `.html` 주소 · 홈은 `/` (실제 라우팅과 일치). 404는 없음(정상) |
| `og:url` | **9/17** — 계정 삭제 · 문의 · 프레스 · 개인정보 · 스튜디오 · 고객지원 · 이용약관 · 404에 없음 |
| `og:image` | 17개 전부 같은 스튜디오 그림. 작품 페이지도 작품 그림이 아님. **커뮤니티 이용규칙은 상대 경로**(`/assets/…`, 공유 미리보기에서 깨짐) |
| `og:image:width/height` | 홈에만 |
| `og:locale`, `twitter:image:alt` | 없음 |
| JSON-LD | 홈의 `Organization` 1개 |
| robots.txt · sitemap | 정상 (16개, 404 · `games.html` 제외, 절대 주소) |
| 링크 상태 (production 크롤) | 깨진 링크 0 · 없는 #앵커 0 · 고아 페이지 0 |
| 본문이 HTML에 있는가 | **아니오** — Works 목록 · 작품 상세 5개 · 기록실 · 스튜디오 · 프레스는 스크립트가 본문을 그림. 스크립트 없이 읽으면 제목 한 줄(본문 글자 99–135자) |

마지막 줄이 이번 PHASE의 실제 root cause였다. 검색엔진 일부, 링크 미리보기, 스크립트가 늦는 느린 휴대폰은 이 페이지들에서 `<h1>`밖에 보지 못했다.

## 2. 변경

### 본문을 HTML에 (prerender)

- 페이지별 템플릿을 `src/render/pages.ts` 하나로 옮김 — 순수 함수(문자열 → 문자열, DOM 없음), 기존 코드에서 그대로 가져옴.
- 빌드(`vite.config.ts` `prerender()`)가 같은 함수로 본문을 각 페이지 HTML에 써 넣고 `data-prerendered`를 붙인다. 스크립트(`src/ui/works.ts` · `records.ts` · `press.ts` · `fallback.ts`)는 그 표시를 보면 그리지 않고 이벤트만 연결한다.
- 템플릿이 쓰는 `@/` 경로는 설정 파일이 직접 못 읽어서 Vite 자체 모듈 로더(SSR load)로 읽는다. 개발 서버에서도 같은 경로.

| 페이지 | 스크립트 없이 본 본문 글자 수 BEFORE → AFTER |
|---|---|
| Works | 124 → 611 |
| 작품 상세 (5) | 80–99 → 763–1,071 (ABOUT · CORE · FEATURES · GALLERY · LINKS 전부) |
| 기록실 | 135 → 2,733 |
| 스튜디오 | 120 → 746 |
| 프레스 킷 | 104 → 1,421 |

`e2e/prerender-j.spec.ts`: 9개 페이지에서 **스크립트 없는 화면 = 스크립트 있는 화면**(제목 · 문단 · 링크 · 그림 · 버튼 순서까지)이고, 히어로 그림 · 태그 · 본문이 한 번씩만 있다.

### 메타데이터 — 17개 페이지 공통 형식

`description` · `canonical` · `og:site_name/locale/type/title/description/url/image(+type, 1200×630, alt)` · `twitter:card/title/description/image/image:alt`.

- **새 description** (사실만, 페이지의 실제 목차에서):
  - 고객지원 — LUNAI 계정 · 음악 생성 · 친구방 · 개인정보와 탈퇴 · 관련 문서
  - 개인정보처리방침, 이용약관, 계정 삭제 — 각 문서의 실제 장 제목
  - 스튜디오 — 페이지 문구와 같은 "서울에서 게임을 만드는 작은 스튜디오"
  - 작품 5개 — 작품 기록(`src/data/projects.ts`)의 한 줄 + 장르 + 플랫폼 + 개발 중
- **법적 본문은 그대로** — head만 바뀌었고, 문서 본문 SHA 고정 테스트 통과.
- 제목은 그대로(이미 유일하고, 작품명 — EUNGARAGE 구분).

### 공유 카드

`scripts/social_cards.py` → `public/assets/images/social/<작품>.jpg` (1200×630, 52–151 KB).

- 각 작품의 기존 키아트 전체를 비율 그대로(늘리거나 자르지 않음), 같은 그림을 흐리고 어둡게 깐 배경 위에.
- 새로 그린 것 없음.
- 홈 · 스튜디오 · 기록실 · 프레스 · 정보 페이지는 기존 스튜디오 카드(`og-image.jpg`).

### 구조화 데이터 (JSON-LD)

| 페이지 | 타입 | 들어간 것 |
|---|---|---|
| 홈 | `Organization` + `WebSite` (`@graph`) | 이름, URL, 로고, 메일, 슬로건, 도시(Seoul, KR — `src/data/site.ts`의 `location`과 같은 사실), 고객지원 연락처; 사이트는 그 Organization이 발행 |
| LUNAI | `MobileApplication` | 이름, 설명(작품의 한 줄), 장르, `operatingSystem: iOS`, URL, 키아트, `creativeWorkStatus: In development`, 만든 곳 |
| LIMINAL · WORM UP! · LUMIORA · RUBATO | `VideoGame` | 같은 항목 + `gamePlatform` |

평점 · 리뷰 · `offers` · 가격 · 출시일 · 창립일 · 인원 · 수상 · `sameAs` · 전화 · 거리 주소 — **없음**. 테스트가 막는다. 나머지 페이지에는 넣지 않았다(도움이 되는 페이지에만).

### robots · sitemap · 404

- 바꿀 것 없음: sitemap = 색인 대상 16개(절대 주소), 404와 `games.html`은 `noindex`이고 sitemap에 없음.
- 정책 · 지원 문서는 색인 유지: 앱 스토어와 앱이 이 주소로 연결하고, 사람이 찾아 읽는 문서다.

## 3. AFTER

| 항목 | BEFORE | AFTER |
|---|---|---|
| `og:url` | 9/17 | 16/17 (404만 없음 — 주소가 없는 페이지) |
| 절대 주소 `og:image` | 16/17 | 17/17 |
| 공유 이미지 종류 | 1 | 6 (스튜디오 + 작품 5) |
| 제목을 반복하는 description | 4 | 0 |
| `og:image` 크기 · alt · `og:locale` · `twitter:image:alt` | 홈만 / 없음 | 전부 |
| JSON-LD | 1페이지 | 6페이지 (홈 + 작품 5) |
| 스크립트 없이 읽히는 본문 | 제목만 (9페이지) | 전부 |
| 깨진 링크 · 없는 앵커 · 고아 페이지 | 0 · 0 · 0 | 0 · 0 · 0 |
| 제목 구조 | — | 17페이지 모두 `<h1>` 1개, 레벨 건너뜀 0 |

## 4. 테스트

| 파일 | 내용 |
|---|---|
| `test/seo-j.test.ts` (10) | 제목 · 설명 유일성, 설명 길이(25–160자) · 제목과 다름; 작품 설명 = 작품 기록; canonical = 자기 주소, `og:url` = canonical; 404 · `games.html` noindex; **sitemap = 색인 대상과 정확히 같음**; OG · X 카드 전부, 이미지 절대 주소 · 파일 존재 · 실제 1200×630; JSON-LD 위치 · 금지 항목 · 작품 기록과 일치 |
| `e2e/seo-j.spec.ts` (2) | 빌드된 사이트 크롤: robots · sitemap 200, 16개 페이지 + 404 200, 그린 뒤의 모든 내부 링크 · 그림 · 스크립트 · CSS 200, 모든 `#앵커`가 대상 페이지에 있음, 고아 0, 공유 이미지가 JPEG로 응답, `<h1>` 1개 · 레벨 건너뜀 0; `/games.html` → `/works.html` |
| `e2e/prerender-j.spec.ts` (10) | 위 prerender 동일성 |
| 수정한 기존 테스트 | `works.test` (description = 한 줄로 시작 + 장르 + 플랫폼), `brand.test` (Organization이 `@graph` 안에) |

관련 기존 suite(works · works-route · archive · archive-g · info-h · ia · brand · gallery · presentation; Chromium · WebKit · Firefox) 155/155.
