# SITE UPGRADE — PHASE H REPORT (STUDIO / SUPPORT / CONTACT / PRESS)

브랜치 `phase-h-studio-support-press` (main `532c2f2`에서) · 라이브 배포 없음 · production merge는 사용자 확인 후.

## AUDIT (수정 전, production `f3e8668`)

| 페이지 | 상태 |
|---|---|
| `/studio.html` | 검은 기업형 화면(`.subpage`, `#05060b`), 영어 소개 + 크루 영어 한 줄. 구조는 WHAT WE MAKE / DOKKA CREW / CONTACT |
| `/support.html` | "LUNAI SUPPORT"만 있는 페이지. 다른 4작품 안내 없음 |
| `/contact.html` | 4종 카드(지원 · 비즈니스 · 언론 · 기타) + mailto 제목 자동. 기능은 정상, 화면은 검은 옛 화면 |
| `/press.html` | 없음 (route는 `live: false`) |
| LUNAI 문서 4개 | 같은 검은 화면. eyebrow "EUNGARAGE · LUNAI". 제목 표기가 제각각("이용약관 — EUNGARAGE"처럼 LUNAI가 빠진 것 3개) |
| `/404.html` | 같은 검은 화면 (IA §12에서 H로 미뤄 둔 것) |
| nav / footer / sitemap | `sitemap.ts` 하나에서 나옴. PRESS는 계획 route라 어디에도 연결 안 됨(정상) |
| SEO / OG | 9개 모두 title · description · canonical · og:title 있음(404는 noindex, canonical 없음 — 정상). og:image는 전부 공용 `og-image.jpg` |
| 옛 흔적 | 소스 전체에 LORVION 0. 옛 기업형 화면의 `.noise` 레이어만 정보 페이지 9곳에 남아 있음 |

**실제 root cause.** Known issue 1의 원인은 "EUNGARAGE · LUNAI"라는 문자열이 아니었다.

- PHASE A 감사(`SITE_UPGRADE_BEFORE.md:81`)가 지적한 것은 Studio · Support · 404가 **LUNAI 시절의 검은 기업형 화면**이라는 점이다.
- 이 화면(`.subpage` 셸)을 정보 페이지 전부가 같이 쓰고 있었다.
- 문자열 자체는 "스튜디오 · 제품"이라는 뜻이고, 개인정보처리방침의 운영 주체 "EUNGARAGE 루나아이 운영팀"과 맞는다.
- 그래서 문자열 일괄 치환이 아니라 **셸(디자인 · 머리말 · 제목)** 을 바꿨다.

**감사 중 발견한 production 버그 (PHASE H와 분리).**
- 증상: 휴대폰에서 LUNAI 개인정보처리방침 본문이 끝까지 스크롤해도 보이지 않는다(opacity 0).
- 원인: reveal이 요소 자기 높이의 18%가 화면에 들어오기를 기다린다. 본문은 6,000px인데 844px 화면에서 1,081px가 필요하다.
- 처리: 별도 bugfix PR #21(`fix/reveal-tall-pages`)로 고쳤다. 라이브를 바꾸므로 사용자 승인 대기.
- PHASE H 쪽: 정보 페이지는 읽는 페이지라 scroll-reveal 자체를 빼서, #21과 상관없이 바로 보인다.

## 변경한 페이지

| 페이지 | 변경 |
|---|---|
| 정보 페이지 9개 공통 | 검은 `.subpage` → works 페이지와 같은 따뜻한 밤 차고 언어. 흐린 차고 배경, 크림 종이 위 진한 잉크 본문, 점선 바느질 테두리, 펠트 버튼. `.noise` 제거, scroll-reveal 제거, "← 차고로 돌아가기" 추가 |
| `/studio.html` | IA §8대로 재구성: 「밤마다 도깨비들이 게임을 만드는 작은 차고」 → 차고에서 하는 일 → 도깨비 크루 5(지금 크루 v2 얼굴 + 정본 한국어 한 줄) → 지금 만드는 것 5(데이터에서, 상태 표시) → 연락 · PRESS KIT. Vision/Mission/Values 없음 |
| `/support.html` | 고객지원 허브. LUNAI 섹션(`#lunai`)에 기존 문구 · 메일 제목 · `#policy-links`를 그대로 옮김. 카드 제목은 h2→h3(제목 단계만). "다른 작품" 4개: 출시 전이라 지원 항목 없음 + 문의 버튼 |
| `/contact.html` | 4종 카드 · 메일 제목 그대로. H1 "CONTACT"→"문의". PRESS 카드에 "프레스 킷 보기" 추가 |
| `/press.html` (신규) | 아래 PRESS 참고 |
| LUNAI 문서 4개 | 아래 LUNAI wording 참고 |
| `/404.html` | 같은 셸. 링크 3개를 44px 독립 링크로 |

## 새 route

- `/press.html` — `sitemap.ts`에서 `live: true, indexed: true`.
  - footer EUNGARAGE 열에 "Press"가 나온다(이미 정의돼 있던 링크가 live 조건으로 열림).
  - sitemap.xml에 들어갔다.
  - 상단 nav에는 넣지 않았다. nav는 기존 5개를 유지한다.

## 삭제 · 교체한 legacy 요소

- 정보 페이지의 검은 `.subpage` 디자인(`#05060b` 배경, 회색 글자, 7.5rem 대형 제목)
- `.noise` 레이어
- 정보 페이지의 `.reveal`
- privacy.html 안의 어두운 테마 inline `<style>` → 공용 `pages.css`로 이동하고 종이 색으로 바꿨다
- `responsive.css`의 `.subpage{padding-top:118px}` · `h1{15vw}` 규칙

## LUNAI policy wording 변경 내역

**법적 본문은 한 글자도 바꾸지 않았다.**

- 대상: intro, 개인정보처리방침의 최종 수정일 · 시행일 · 운영 주체 줄, 본문 article 전체
- 방법: production에서 뽑은 텍스트 SHA-256을 `test/info-h.test.ts`가 고정한다.

| 페이지 | 항목 | 전 | 후 |
|---|---|---|---|
| 4개 공통 | eyebrow | EUNGARAGE · LUNAI | LUNAI · 앱 정책 문서 |
| 4개 공통 | 머리말 추가(본문 밖) | — | "LUNAI는 EUNGARAGE가 만드는 앱입니다." + LUNAI 문서 5개 바로가기(현재 문서 표시) |
| privacy | H1 | LUNAI<br>개인정보처리방침 | LUNAI 개인정보처리방침 |
| privacy | title | (그대로) LUNAI(루나아이) 개인정보처리방침 — EUNGARAGE | — |
| terms | H1 / title | 서비스<br>이용약관 / 이용약관 — EUNGARAGE | LUNAI 서비스 이용약관 / LUNAI 서비스 이용약관 — EUNGARAGE |
| account-deletion | H1 / title | 계정 및 데이터 삭제 / 계정 삭제 — EUNGARAGE | LUNAI 계정 및 데이터 삭제 / LUNAI 계정 및 데이터 삭제 — EUNGARAGE |
| community-guidelines | H1 / title | 커뮤니티 이용규칙 / 커뮤니티 이용규칙 — EUNGARAGE | LUNAI 커뮤니티 이용규칙 / LUNAI 커뮤니티 이용규칙 — EUNGARAGE |
| support | eyebrow / H1 | EUNGARAGE · LUNAI / LUNAI SUPPORT | EUNGARAGE · SUPPORT / 고객지원 (LUNAI는 섹션 제목) |

- "만드는 앱"은 제작 관계를 말한 것이고, 운영 주체를 새로 선언하지 않는다.
- **사용자 판단이 필요한 법적 의미 문제 (수정하지 않음):**
  - 개인정보처리방침은 운영 주체를 "EUNGARAGE 루나아이 운영팀"으로 명시한다.
  - 이용약관 · 커뮤니티 이용규칙은 "운영자"라고만 적고 주체를 밝히지 않는다.
  - 맞추려면 약관 본문 변경 = 법적 변경이므로 결정을 받아야 한다.

## PRESS에 사용한 실제 자료

전부 저장소에 이미 있는 사실 · 파일이다(`src/ui/press.ts`).

- **EUNGARAGE**
  - 이름 · 위치(Seoul, Republic of Korea) · 메일: `src/data/site.ts`
  - 웹: eungarage.com
  - 한 줄: 「밤마다 도깨비들이 게임을 만드는 작은 차고」(사이트 정체성 문구)
- **작품 5개**: 제목 · 태그라인 · TYPE · GENRE · PLATFORM · STATUS(+WORM UP! 상태 메모) = `src/data/projects.ts` 그대로
  - 키아트 원본 받기 = `public/assets/images/artwork/*-full.webp`
  - 게임 화면 = 각 작품 페이지 갤러리 링크(복사 없음)
- **로고**: `public/assets/images/brand/` lockup(png · 밝은 바탕), lockup_light(어두운 바탕), nav 2종, `icon-512.png`
- **언론 문의**: mailto 제목 `[언론]` (contact 페이지와 같은 값)
- **없는 것**: 수상 · 리뷰 · 인용 · 다운로드 수 · 팀 규모 · 설립 연도 · 출시일 · 스토어 링크. 단위 테스트가 이런 문구가 생기면 실패한다.
- **새 이미지 생성 0.** 추가 파일은 정보 페이지 배경용으로 차고 그림을 줄인 사본 2개뿐이다(`room_landscape_backdrop.webp` 240px 5.8KB, `room_portrait_backdrop.webp` 120px 10.8KB).

## MOBILE

- 390×844 · 844×390 · 1440×900에서 정보 페이지 9개 모두:
  - 가로 넘침 0
  - 콘솔 오류 0
  - 종이 본문이 처음부터 보임
- 휴대폰에서는:
  - 문서 바로가기 줄바꿈
  - 지원 카드 1열
  - 프레스 작품 카드 세로 배치
  - 개인정보 목차 접기(48px)

## ACCESSIBILITY

- 페이지당 h1 1개 · 섹션 h2 · 카드 h3.
- 독립 링크 · 버튼 전부 44px 이상(문장 안 링크는 WCAG 2.5.8 예외). e2e가 세 화면에서 잰다.
- 키보드: nav → "차고로 돌아가기" → 문서 바로가기 → 본문, 모든 단계에서 focus 테두리가 보인다.
- reduced-motion에서도 같은 페이지(애니메이션 의존 없음).
- 장식 이미지는 alt="", 문서 바로가기는 `<nav aria-label>` + `aria-current="page"`.

## PAGE WEIGHT

휴대폰 390×844, 새 컨텍스트, networkidle, 전송량:

| | studio | support | contact | press | privacy | terms | deletion | community | 404 |
|---|---|---|---|---|---|---|---|---|---|
| production f3e8668 | 238 | 239 | 239 | — | 154 | 239 | 239 | 240 | 238 |
| PHASE H | 370 | 253 | 253 | 557 | 167 | 253 | 253 | 254 | 252 (KB) |

- 처음엔 정보 페이지마다 차고 원본 그림(754KB)을 흐린 배경으로 받아 약 1MB였다.
- 16px blur · 30% 밝기에서는 240px 사본과 구분되지 않아 사본으로 바꿨다(+약 14KB).
- studio +130KB는 크루 얼굴 5장, press는 키아트 · 로고(lazy).

## TEST

- **unit 336/336** (PHASE H 신규 13: `test/info-h.test.ts`)
  - 법적 본문 해시 4
  - LUNAI 지원 문구 보존
  - 메일 제목 4
  - Press 실제 파일 · 금지 문구
  - route · nav/footer/sitemap
  - 셸 통일
- **targeted e2e** (chromium, retries=0)
  - `e2e/info-h.spec.ts` 34/34: 9페이지 × 3화면 + 키보드 · reduced-motion · 문서 바로가기 · 지원 앵커 · Studio · Press 다운로드 10개 200 · Contact
  - 영향 받는 기존 spec 88/88: brand · entrance · garage-d · objects · secondary · works · live · archive-g · ia
  - entrance의 Studio 구조 기대값은 새 구조로 갱신했다.
- **full GitHub e2e**: 이 브랜치 PR에서 실행 — 결과는 보고에.

## SCREENSHOTS

- `docs/shots/phaseH/before/` (desktop · mobile, production)
- `docs/shots/phaseH/after/` (desktop · mobile · landscape, 9페이지)

## 새로 발견한 known issues

1. **[production 버그, PR #21 승인 대기]** 휴대폰에서 LUNAI 개인정보처리방침 본문이 보이지 않음(reveal 18% 규칙).
2. **[법적 판단 필요]** 이용약관 · 커뮤니티 이용규칙은 운영 주체를 밝히지 않음. 개인정보처리방침은 "EUNGARAGE 루나아이 운영팀".
3. **[PHASE K]** works · archive 페이지는 아직 차고 원본 그림(754KB)을 흐린 배경으로 받는다. 정보 페이지에서 쓴 작은 사본으로 바꿀 수 있다.
4. `src/data/characters.ts`의 portrait는 아직 예전 크루 그림(`dokka/`)을 가리킨다. 이번 페이지들은 쓰지 않는다.

기존 known issues 2~4(NIGHT 루프 · iPhone Safari QA · 가로 서랍 51px)는 그대로 이월. 1번(정책 페이지 표기)은 이 PHASE에서 해결 — 사용자 확인 대기.
