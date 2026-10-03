# SITE UPGRADE — PHASE C REPORT (WORKS · 작품 상세)

브랜치 `site-upgrade` · 라이브 배포 없음. 캡처: `docs/shots/phaseC/before/`(라이브) · `after/`(브랜치), desktop 1440 · mobile 390.

## WORM UP! — 변경 전/후

| 항목 | 전 | 후 |
|---|---|---|
| TYPE / GENRE | Mobile Runner / Action · 횡스크롤 등산 러너 | Narrative Adventure · 내러티브 어드벤처 |
| PLATFORM | iOS | PC (Steam) |
| 부제 KO / EN | 작은 몸으로 200개의 스테이지를 오른다. / A little worm, two hundred stages uphill. | 봄은 모두에게 같은 날 오지 않았다 / Not Every Spring Arrives at Once (게임 타이틀 화면의 공식 부제) |
| 핵심 문장 | — | 지렁이는 계속 앞으로 간다. (HERO 한 곳) |
| 개발 상태 한 줄 | — | 이야기는 처음부터 끝까지 만들어져 있습니다. 음성과 음악은 아직 넣지 않았습니다. |
| ABOUT · CORE · FEATURES | 납치된 여자친구 · 200 스테이지 · 보스 13 · 동료 9 · 꾸미기 · 주간 도전 | v6 정본 기준(삶 · 앞으로 가기 · 삶과 이어진 놀이 · 살지 않은 인생) |
| CHARACTERS | 없음 | 지렁이(어린 시절 · 학생 · 어른) · 엄마 — 게임의 사용자 그림 누끼 |
| GALLERY | 러너 그림 5장(산 · 납치 · 까마귀 보스 · 앱 아이콘) | Steam판 실제 화면 8장, 캡션 = 각 장의 제목 |
| 키아트 / 차고 벽 액자 | 러너 키아트(산길) | 게임 그림으로 구성한 세로 키아트(아래) |
| LINKS | COMING SOON | 없음(스토어 페이지 없음, 가짜 CTA 없음) |
| WORKS 카드 | 산길 지도 · TRAIL MAP · 200 · 13 배지 | 흙 묻은 일기 · WORM'S LIFE, 흙과 새싹 |
| 차고 보관 선반 설명 | "모바일 클라이밍 러너 WORM UP!" | "러너였던 첫 모습의 짐" (그림은 그대로, 문장만) |

## 제거한 구버전 정보

러너 장르·iOS·200 스테이지·20 지역·보스 13·동료 9·스킨/액세서리/트레일 수·주간 도전·납치 이야기, 러너 그림 5장과 러너 키아트. 그림은 지우지 않고 `assets/archive/early-prototype/wormup/`(공개 폴더 밖, 출처 README 포함)로 옮김 — PHASE G의 `Early Prototype` 후보.

## 실제 사용한 새 이미지 (생성 0장)

| 파일 | 출처 |
|---|---|
| `works/wormup/c01…c26-*.webp` 8장 | Steam판 처음~끝 플레이 캡처(2026-10-03) `~/Projects/worm-up/steam/.qa/run_plain/` |
| `works/wormup/char-*.webp` 4장 | 게임 캐릭터 누끼 `steam/assets/ch/ch_u_*__idle.webp`(사용자 그림) |
| `wormup-steam-keyart.webp` (529×941) → `artwork/wormup-keyart-*` | `bg_u_burrow_village`(사용자 그림 #1)의 세로 조각(원본 해상도, 확대 없음) + 게임 로고 `ui_u_title_logo` + 어린 지렁이 누끼. `scripts/wormup_keyart.py` |

## 다섯 작품 공통

- CORE를 6개에서 3개로 줄였다. 빠진 항목은 FEATURES에 이미 있는 것이다(RUBATO는 고유 장치 "휴대폰과 되감기"를 남김).
- 상태 라벨과 같은 말인 "COMING SOON"(LIMINAL·WORM UP!)을 지웠다.
- "STEAM · 준비 중"(LUMIORA·RUBATO)은 버튼이 아닌 평범한 글자로 바꿨다.
- 링크가 없으면 LINKS 칸을 감춘다.
- 카드·HERO·ABOUT·CORE·FEATURES에서 한국어 단어가 중간에 끊기지 않게 했다(전에는 모든 카드에서 끊김).
- 새 선택 필드: `line`(핵심 문장), `statusNote`(개발 상태 한 줄), `characters`. 실제 자료가 있는 작품만 쓴다. 지금은 WORM UP!만 해당한다.

## NEW_ASSET_REQUIRED

필수 0건. 구현은 기존 자산으로 끝났다.

| 선택 | 사용 위치 | 기존으로 부족한 점 | 권장 크기 | 투명 | prompt |
|---|---|---|---|---|---|
| `wormup_keyart_official.webp` | WORKS 카드, 상세 HERO, 차고 벽 액자, 이후 OG·프레스 | 지금은 게임 그림을 잘라 겹친 구성. 원본이 가로라 세로 해상도가 529px에 그침(데스크톱·2x 화면에는 충분) | 941×1672 (세로 9:16) | 아니오 | "Watercolor storybook illustration in the exact style of the WORM UP! reference paintings: an underground cross-section of a cozy animal burrow village with warm lantern-lit rooms, roots and pebbles in the soil, a small pink worm child with dot eyes standing on the lower dirt path looking up toward a ladder leading to spring flowers on the surface, soft cream paper texture, gentle earthy palette, generous empty space in the top fifth for a logo, no text, no letters." — 사용자 그림을 참조 이미지로 넣어 생성 |

자료 대기(생성 요청 아님): LIMINAL 갤러리 4장, LUMIORA 1장(공개할 실제 화면이 더 생기면 추가). LUNAI·LIMINAL·LUMIORA·RUBATO의 CHARACTERS는 각 프로젝트에 실제 캐릭터 그림이 있어 다음 패스에서 모을 수 있다.

## 테스트

| 검사 | 결과 |
|---|---|
| typecheck · lint · build | 통과 |
| 단위(vitest) | 274 / 274 (PHASE C 규칙 6개 추가) |
| 전체 e2e — GitHub 러너, 초안 PR #17 (verify만, 배포 없음) | **332 / 332** (56.9분) |
| 작품·갤러리·포스터 e2e(세 엔진) | 56 / 56 |
| 캡처 점검 | 브랜치 빌드 콘솔·페이지·HTTP 오류 0 |

로컬 전체 게이트는 다른 프로그램 때문에 기계 부하가 매우 높아(load average 336) 중간에 멈췄다. 그 사이 6건이 시간 초과로 실패했다. 같은 커밋이 GitHub 러너에서는 전부 통과했다.

## 다음 단계 (PHASE D — 차고)

1. 골목 첫 화면 정체성 한 줄(우선순위 A).
2. 모바일 발견성과 첫 방문 1회 안내(우선순위 B).
3. PC OS: 작품 5개, ARCHIVE, MAIL, TRASH.
4. TV 작품 채널: data-driven 이미지 슬라이드.
5. 기록 서랍에 LIMINAL 사건 파일.
6. 골목 우편함 → 문의.
