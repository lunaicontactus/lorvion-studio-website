# SITE UPGRADE — PHASE B REPORT (INFORMATION STRUCTURE)

브랜치 `site-upgrade` · 커밋 `c40285f` `5f8a854` · 라이브 배포 없음(라이브는 `5eff866`).
상세 표의 정본은 `docs/SITE_IA.md`, 결정은 `docs/SITE_UPGRADE_DECISIONS.md`.

## BEFORE

- 내비·푸터가 14개 페이지에 각각 복사돼 있었다. 푸터가 세 종류였고, 링크가 `./`와 `/` 두 형식으로 섞여 있었다. 법적 문서 페이지의 푸터에는 차고·WORKS로 돌아가는 링크가 없었다.
- `public/sitemap.xml`을 손으로 관리했고, `/studio.html`이 빠져 있었다.
- 문의 페이지가 없었다. 내비 CONTACT는 차고 밖에서는 `studio.html#contact`, 차고 안에서는 TV 채널로 갔다.
- 404에 "EUNGARAGE · LUNAI", "다시 궤도로 돌아가기"가 남아 있었고 검색 제외 설정이 없었다.

## SITE MAP BEFORE / AFTER · ROUTE TABLE

`docs/SITE_IA.md` §1, §2. 요약하면 이렇다.
- 이번에 생긴 주소: `/contact.html`.
- 계획 주소(페이지가 생기기 전까지 링크 없음): `/archive.html`(G), `/press.html`(H).
- 나머지 주소는 모두 그대로다. `/works/<id>.html` 체계를 유지한다.

## OBJECT → DESTINATION MAP

`docs/SITE_IA.md` §13. 이번 단계에서 실제로 바뀐 것은 내비 CONTACT(어디서나 `/contact.html`) 하나다. 나머지 물건의 변경은 D·F·G에서 한다.

## WORKS 5개 정보 구조 · 상세 페이지

`docs/SITE_IA.md` §4, §5. 작품 5개(LOCK #1)를 유지하고, 목록 상단에 보조 문구 "Games & Projects"를 붙였다(LOCK #2). 상세 페이지는 승인된 WORKS 2.2 순서를 기준으로 브리프 항목을 대응시켰다.
- CORE는 작품마다 6개에서 3개 이내로 줄인다.
- GAMEPLAY·CHARACTERS 섹션은 실제 자료가 있을 때만 나타난다.
- 링크는 실제로 있는 것만 둔다. "COMING SOON"은 버튼처럼 보이지 않게 바꾼다(C).

## WORM UP! 구버전 → 신버전

`docs/SITE_IA.md` §6. 바꿀 항목은 kind, genre, platforms, 부제, 핵심 문장(한 곳), about, core, features, gallery, links, 목록 카드 장식, 스튜디오 줄, PC·메타다. 러너 자료는 Early Prototype으로 옮긴다. 키아트는 Steam판 것이 있는지 C에서 조사한다.

## PUBLIC ARCHIVE / SECRET STORAGE

`docs/SITE_IA.md` §7. 공개 기록실은 누구나 보는 공식 자료, 비밀 보관소는 별을 모은 사람만 보는 개인 상자다. 같은 자료를 두 곳에 두지 않는다. 현재 겹치는 부분(비밀 보관소 폴라로이드의 개발 화면)은 G에서 공개 기록실로 옮긴다.

## MOBILE NAVIGATION

햄버거 메뉴에 데스크톱과 같은 링크가 한 표에서 들어간다. 소리 스위치는 메뉴 밖에 항상 보인다. 문의 카드의 링크는 높이 44px 이상이다. 푸터는 좁은 화면에서 묶음 단위로 쌓인다. 캡처는 `docs/shots/phaseB/mobile_*`.

## SEO 영향

- sitemap을 빌드에서 생성한다. `/studio.html`(전에 빠짐)과 `/contact.html`을 추가했고 계획 주소는 제외했다.
- 링크를 전부 `/` 절대경로로 바꿨다. 깊은 주소에서 404 페이지가 열려도 링크가 깨지지 않는다(Pages 방식으로 확인).
- 404에 noindex를 추가했다. canonical은 바뀌지 않았다.

## 수정 파일

- 새로 만듦: `src/data/sitemap.ts`, `contact.html`, `test/sitemap.test.ts`, `docs/SITE_UPGRADE_DECISIONS.md`, `docs/SITE_IA.md`, 이 문서, `docs/shots/phaseB/`
- 바꿈: `vite.config.ts`(site-shell 플러그인), 페이지 14개(내비·푸터를 마커로), `404.html`, `works.html`, `src/app/world.ts`, `src/styles/layout.css`, `src/styles/pages.css`
- 삭제: `public/sitemap.xml`(빌드에서 생성)
- 테스트 수정: `e2e/objects.spec.ts`, `e2e/ia.spec.ts`, `e2e/secondary.spec.ts`, `e2e/entrance.spec.ts`, `test/brand.test.ts`, `test/works.test.ts`

## 테스트

| 검사 | 결과 |
|---|---|
| typecheck · lint · build | 통과 |
| 단위(vitest) | 268 / 268 (새 `test/sitemap.test.ts` 8개 포함) |
| 전체 e2e(chromium · shell · webkit · firefox) | **332 / 332** (55.9분, 재시도 없음) |
| 캡처 점검 | 문의 · 404(Pages 방식의 깊은 주소) · 푸터 · 모바일 메뉴, 콘솔 오류 0 |

사이트맵 단위 테스트가 지키는 규칙은 다섯 가지다.
- 루트의 모든 페이지가 표에 있다.
- 링크는 존재하는 페이지만 가리킨다.
- 내비 첫 칸은 WORKS이고 OUR GAMES가 없다.
- 모든 페이지가 자기 복사본 대신 마커를 쓴다.
- sitemap에는 live·indexed 주소와 작품 5개만 있다.

## 다음 PHASE에서 실제 구현할 항목

- **C (WORKS · 상세)**
  - WORM UP! Steam판 교체: 데이터, 목록 카드 장식, 스튜디오 줄, 갤러리(확정된 Steam판 화면만, 고른 목록은 보고에서 확인받음)
  - Steam판 키아트 조사
  - CORE를 3개 이내로
  - COMING SOON 표시 방식
  - CHARACTERS 자료 조사
- **D (차고)**
  - 골목 첫 화면 정체성 한 줄(우선순위 A)
  - 모바일 발견성 · 첫 방문 1회 안내(우선순위 B)
  - PC OS(작품 5, ARCHIVE, MAIL, TRASH)
  - TV 채널 data-driven(작품 슬라이드)
  - 기록 서랍의 LIMINAL 사건 파일
  - 골목 우편함 → 문의
- 이후: E 크루 → F 오디오(AMBIENT/MUSIC/SFX/UI 분리, AUDIO AUDIT, 라디오 TAPE NOT FOUND) → G 공개 기록실 → H 스튜디오·지원·프레스·404 화면 → I → J → K(크루 스프라이트 분석 먼저) → L.
