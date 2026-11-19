# EUNGARAGE 2.0 — 진행 문서

브랜치 `eungarage-2.0` (main `a0beae3` = production `a46b529`의 사이트에서 시작). 운영 배포, 결제 활성화, 운영 데이터 삭제는 각각 별도 승인을 받는다. 이 문서는 세션이 끊겨도 이어갈 수 있도록 **사실과 다음 할 일**만 적는다.

## 0. PHASE 0 — 현황 조사 (2026-11-19)

### 0.1 저장소와 배포

| 항목 | 실제 |
|---|---|
| 프레임워크 | Vite MPA + TypeScript (프레임워크 없음), Vitest, Playwright (Chromium · WebKit · Firefox) |
| 배포 | GitHub Pages, `.github/workflows/deploy-pages.yml` (verify → 검증된 `dist` artifact를 그대로 배포). main ruleset: PR + `verify` 필수 |
| 서버 / DB | **없음** (정적 사이트). 저장은 전부 브라우저 `localStorage` (`src/systems/storage.ts`) |
| 페이지 | `/` (골목 → 차고), `/works.html` + `/works/<id>.html` 5개, `/archive.html`, `/studio.html`, `/press.html`, `/contact.html`, `/support.html`, LUNAI 정책 문서 4개, `/404.html` |

### 0.2 이미 있는 기능 (보존 대상)

| 기능 | 위치 | 실행 |
|---|---|---|
| 골목 + 셔터 진입 (재방문 시 짧게, 건너뛰기) | `src/scenes/alley.ts`, `index.html` | 홈 → ENTER |
| 차고 탐험: 카메라 팬 · 확대, 오브젝트 15개 | `src/scenes/garage.ts`, `src/data/world.ts` | 선반, 포스터 4 + RUBATO 그림, 기록 서랍(캐비닛), PC, 작업대, 냉장고, TV, 바깥문, 라디오, 택배, 비밀문 |
| PC = 작품 5개 데스크톱 → 작품 상세 | `src/ui/panels.ts` | PC 클릭 |
| TV = 작품 채널 (실제 스크린샷만, 가짜 트레일러 없음) | `src/data/garage/tv.ts` | TV 클릭 |
| 라디오 = 실제 등록 음악 방송국, 자동 재생 없음 | `src/systems/audio.ts`, `src/data/garage/radio.ts` | 라디오 클릭 |
| 냉장고 문 열림 · 간식 · 이스터에그 | `src/data/garage/fridge.ts` | 냉장고 클릭 |
| 기록 서랍 (LIMINAL 사건 파일 등) | `src/data/garage/cabinet.ts` | 서랍 클릭 |
| 놀이터 (바깥문) + 미니게임 3개 | `src/scenes/playground.ts`, `src/games/` | 요미의 과자 몰래 먹기 · 야식 심부름 · 모모의 택배 배달, `?play=<id>` |
| 별 3개 → 비밀문 → 비밀 창고 → 망원경 밤하늘 (별 1,146개 캔버스, 별똥별) | `src/systems/secret.ts`, `src/scenes/archive.ts`, `src/scenes/sky.ts` | 미니게임에서 별 획득 |
| 크루: 걷기 · 일하기 · 앉기 · 손 흔들기 · 두리번 + 루틴 · 대사 · 클릭 반응 | `src/scenes/npc.ts`, `src/data/behaviour.ts`, `routines.ts`, `chatter.ts`, `sprites.ts` | 차고 안 |
| 공개 기록실 (그림 · 개발 과정 · 스크린샷 · 소리) | `src/data/publicArchive.ts`, `/archive.html` | 메뉴 |
| SEO prerender · OG 카드 · JSON-LD, 성능 예산, 접근성 (axe 0) | PHASE J/K/I | — |

### 0.3 2.0 지시와의 차이 (요약)

| 2.0 항목 | 현재 | 판단 |
|---|---|---|
| 새 크루 6 (모찌형) | 도깨비 크루 5 (3D 렌더 스프라이트) | **교체** — 사용자 원화가 최신 정본 (아래 §1) |
| 핑크 밤 차고 | 펠트 공예 차고 그림 | 사용자가 빈 핑크 차고 배경을 제작해 줌 (결정 1). 그 전까지 기존 차고 유지 |
| 메뉴 12개 (HOME~SETTINGS) | WORKS · ARCHIVE · STUDIO · SUPPORT · CONTACT | 추가 예정 (§3) |
| 방명록 · 방문자 수 · 별빛 서버 · 관리자 | 서버 없음 | Supabase 새 프로젝트 (결정 2), 로컬 먼저 |
| 미니게임 (별똥별 받기 · 버그 잡기) | 미니게임 3개 있음 (다른 게임) | 2개 추가, 기존 3개 유지 |
| 게임 목록 LUNAI · WORM UP! · CODETTA | LUNAI · LIMINAL · WORM UP! · LUMIORA · RUBATO | 5개 유지, CODETTA 보류 (결정 3) |
| 목업의 TODAY 1,482 / TOTAL 327,819, 2025 날짜 개발일지, CODETTA 카드 | — | **가짜 수치 · 날짜 · 작품 — 사용하지 않음** |

### 0.4 사용자 결정 (2026-11-19)

1. 차고 배경: 사용자가 캐릭터 · UI 없는 빈 핑크 밤 차고 (가로 16:9 + 세로 9:16)를 제작한다. 도착하면 오브젝트 15개 좌표와 이동 그래프를 그 그림에 다시 맞춘다.
2. 서버: Supabase **새 프로젝트** (LUNAI와 완전 분리). 로컬에서 먼저 완성 · 테스트.
3. 작품관: 지금 5개 유지, CODETTA는 공개 정보 확정 후.
4. 임레븐: 6인 종합 시트에서 잘라 임시 사용, 원화가 오면 교체.

## 1. PHASE 3 — 크루 (진행 중)

### 1.1 원화 (정본)

`assets/crew-mochi/source/` (SHA256SUMS). 사용자 `~/Downloads` 원본 PNG를 그대로 복사.

| id | 이름 | 직원명 | 역할 | 원화 |
|---|---|---|---|---|
| momo | 모모 (핑크) | 응가 | 대표 · 기획 · 총괄 | portrait 1254² + sheet |
| nunu | 누누 (노랑) | 김로드 | 개발 · 코딩 · 시스템 | portrait 1312×1199 + sheet |
| ruki | 루키 (민트) | 최미나이 | 리서치 · 자료 조사 · 검토 | portrait + sheet |
| poko | 포코 (검정) | 조피티 | 스토리 · 세계관 · 기획 보조 | portrait + sheet |
| yomi | 요미 (하늘) | 이수노 | 음악 · 사운드 · 분위기 | portrait + sheet |
| reven | 임레븐 (고양이) | — | 스튜디오 고양이 | **종합 시트의 작은 그림뿐** (182×166) — 원화 필요 |

### 1.2 파이프라인 (AI 재드로잉 없음)

1. `scripts/mochi_cutout.py` — 종이색(테두리 중앙값)과 이어진 픽셀만 배경. 가장자리 2px 부드러운 알파 + 흰 번짐 제거(un-premultiply). 시트의 3면도 띠에서 앞 · 옆 · 뒤를 자동 분리. → `assets/crew-mochi/cut/`
2. `scripts/mochi_frames.py` — 원화를 **휘어서** 프레임을 만든다: 바닥 기준 squash/stretch (부피 유지, 바닥이 더 퍼짐), 높이에 비례하는 기울기 + 윗부분이 늦게 따라오는 jelly lag(머리 장식 · 헤드폰), 한쪽 아래 덩어리(발) 들기, 몸 띄우기. 2× 슈퍼샘플 후 축소.
   - 앞 = 단독 원화 (가장 선명), 왼쪽 = 시트 옆모습 (모두 왼쪽을 봄), 오른쪽 = 그 좌우반전, 뒤 = 시트 뒷모습.
   - 동작: idle 4 · walk 8 (발 번갈아 들기 → 기울기 → 납작 착지 → 복원) · work 6 · sit 4 · wave 6 (도약 · 체공 · 착지 hop) · look 6 (윗부분만 갸웃).
   - 계약: 기존 크루와 같다 — 420px 높이, 아래 가장자리 = 바닥, `<id>/<action>/<dir>/<id>_<action>_<dir>_NN.webp`.
3. `scripts/mochi_portraits.py` — 카드 · 페이지용 큰 정면 그림 (최대 640px, 축소만).

**프레임 방식 선택 근거**: 차고는 이미 한 개의 공통 ticker로 모든 캐릭터의 프레임을 재생한다 (`src/systems/spriteAnimator.ts`). 측정된 걸음 속도 · 히트박스 · 프리로드 · 화면 밖 정지가 전부 프레임 세트 기준이다. 브라우저에서 매 프레임 메시를 휘면 여섯 캐릭터 × 매 프레임 비용이 휴대폰에 그대로 실린다. 미리 휜 프레임은 캐릭터당 `<img>` 교체 한 번이다.

**한계 (사실)**: 옆 · 뒤 모습은 시트의 작은 그림(약 200px)을 키운 것이라 앞모습보다 흐리다. 사용자에게 옆 · 뒤 단독 원화가 있으면 교체한다. 임레븐은 전부 작은 그림이다.

### 1.3 런타임

- 플래그 `mochiCrew` (기본 on). `?mochiCrew=off` → 도깨비 크루 (기존 프레임 그대로 디스크에 있음).
- 정본 데이터: `src/data/characters.ts` (이름 · 직원명 · 역할 · 성격 · 한마디 · 소품), `behaviour.ts` (집: 모모 라운지, 누누 PC, 루키 책장, 포코 작업대, 요미 라디오, 임레븐 쿠션), `routines.ts`, `chatter.ts` (원화 시트와 지시문의 대사).

## 2. 2026-11-19 구현 상태 (PART 30 형식)

상태 표기: **완료·테스트 통과** / **구현 완료·테스트 미완료** / **부분 구현** / **미구현** / **외부 승인 대기**. "테스트 통과"는 이 브랜치에서 실제로 돌린 것만 적는다.

| 기능 | 상태 | 근거 |
|---|---|---|
| 새 크루 6인 원화 누끼 · 프레임 504장 (idle·walk·work·sit·hop·look, 4방향) | 완료·테스트 통과 | `scripts/mochi_cutout.py`, `mochi_frames.py`. 차고 실제 화면 캡처, 크루 e2e 14/14 (로컬 Chromium) |
| 크루 자율 생활 (집 · 루틴 · 대사 · 여섯이 함께 문을 열고 다섯이 남음) | 완료·테스트 통과 | unit 361/361, e2e npc · crew · garage-e (동시 보행 ≤2, 터치 판정, 움직임 줄이기) |
| 캐릭터 클릭 메뉴: 말 걸기 · 쓰다듬기 · 들어 올리기 · 사원증 보기 | 완료·테스트 통과 (로컬 탐침) | `src/ui/crewMenu.ts`, `NpcHandle.act`. 들어 올리면 제자리에 다시 내려놓아 벽·가구에 떨어질 수 없음 |
| 들어 올려 **다른 곳으로 옮기기** (드래그) | 미구현 | 지금은 제자리 들기만. 이동 가능 바닥 판정(`insideObstacle`)으로 확장 예정 |
| 넘어지기 · 회복 · 잠자기(눈 감음) 프레임 | 미구현 | 눈 감은 얼굴 그림이 필요. 원화 시트의 "졸림" 표정에서 만들 수 있음 |
| CREW 페이지 (사원증 뒤집기 · 상세 · 걷기 · 캐릭터 시트) | 완료·테스트 통과 (로컬 탐침) | `/crew.html`, prerender |
| DIARY 페이지 (실제 날짜만) | 완료·테스트 통과 (로컬 탐침) | `/diary.html`, `src/data/diary.ts` |
| 메뉴 12개 (만든 페이지만 노출) · `/#garage` 바로 진입 | 완료·테스트 통과 | unit `test/sitemap.test.ts`, 폭 1240~1920 실측 |
| ARCADE + 새 게임 2개 (별똥별 받기 · 버그 잡기) | 완료·테스트 통과 | unit `test/arcade.test.ts` 10, 로컬 실제 플레이 탐침. 점수는 브라우저 저장, 온라인 랭킹 없음 |
| GUESTBOOK | 구현 완료·테스트 미완료 (외부 승인 대기) | 서버 SQL은 로컬 Postgres 17/17. 브라우저 ↔ 실제 Supabase 연결은 프로젝트가 없어 미검증. 연결 전에는 "준비 중"으로 비활성 |
| 방문자 수 TODAY/TOTAL | 부분 구현 | 서버 함수(`visit_hit`)와 테스트만. 화면 표시는 서버 연결 뒤 (가짜 숫자 금지) |
| STARS (망원경 하늘 · 서버 별 · 검색 · 카드 · 공유 · 사진 저장) | 구현 완료·테스트 미완료 | 하늘은 실제 화면 확인. 서버 별 · 검색은 서버 연결 뒤 검증 |
| 관리자 (방명록 승인/답글/삭제, 별 발급/수정/삭제, 감사 로그) | 부분 구현 | 서버 RPC + 권한 테스트 완료. 관리자 화면은 아직 없음 |
| RADIO (실제 곡 6개, 자동 재생 없음) | 완료·테스트 통과 (로컬 탐침) | `/radio.html`. 임레븐 음성: 녹음 없음이라고 표시 |
| SETTINGS (소리 · 움직임 · 셔터 · 그래픽) | 완료·테스트 통과 (로컬 탐침) | `/settings.html`, `src/systems/settings.ts` |
| 후원 · 결제 | 외부 승인 대기 | 정책 · 사업자 · 결제사 미정. 결제 코드는 없음 |
| 핑크 밤 차고 배경 · 미니홈피 프로필 패널 · 아케이드 기계 · 망원경 · 우편함 오브젝트 | 외부 승인 대기 | 사용자가 빈 차고 그림을 제작 중 (결정 1). 도착하면 오브젝트 좌표 재매핑과 함께 |
| 시간대 연출 (낮 · 저녁 · 밤 · 새벽) | 부분 구현 | 기존 `src/systems/clock.ts`가 실제 현지 시간으로 크루 성향만 바꿈. 조명 연출은 새 배경과 함께 |
| 다국어 (한국어 · 영어) | 미구현 | 문구가 컴포넌트에 있음. 번역 검수 전에는 영어 스위치를 두지 않음 |
| 스티커 수집 · 방문 도장 | 미구현 | |
| CODETTA | 외부 승인 대기 | 결정 3 |

### 성능 (로컬 빌드)

- 메인 JS 22.7 KB gzip (예산 26), 메인 CSS 31.7 KB (예산 34). 2.0 페이지의 스크립트 · CSS는 그 페이지에서만 받는다.
- 크루 프레임 504장 + 초상화 · 시트 = 14 MB (이전 도깨비 크루 300장 6.1 MB). 프레임은 차고 그림이 뜬 뒤에 낮은 우선순위로 받는다(기존 방식). 품질 88 → 80 재인코딩이 다음 최적화 후보.

### Supabase 연결에 필요한 것 (사용자)

1. supabase.com에서 **새 프로젝트** 생성 (LUNAI와 별도, 무료 요금제).
2. SQL 편집기에서 `supabase/migrations/20261119000001_eungarage_2_0.sql` 실행.
3. Authentication → 관리자 이메일 사용자 1명 만들기 → 그 사용자의 id를 `insert into public.admins (user_id) values ('…')`.
4. 프로젝트 URL과 **anon** 키를 GitHub 저장소 Actions 변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`로 등록 (service_role 키는 절대 넣지 않음).
5. 로컬 테스트: `cd supabase && npm install && npm test`.

## 다음 할 일 (순서)

1. PR #33 CI 전체 검증 결과 확인 → 실패는 원인별로 수정 (제품 / 테스트 / 환경).
2. 관리자 화면 `/admin.html` (Supabase Auth 이메일 코드 로그인, noindex).
3. 들어 올려 옮기기 (드래그), 잠자기 · 넘어지기 프레임 (원화 시트의 표정에서).
4. 2.0 디자인 토큰으로 정보 페이지 셸 전체를 핑크 밤 팔레트로 (빈 핑크 차고 배경과 함께).
5. 빈 핑크 차고 배경 도착 → 오브젝트 15개 · 이동 그래프 재매핑, 아케이드 · 망원경 · 우편함 오브젝트 추가, 미니홈피 프로필 패널.
6. Supabase 프로젝트 연결 뒤: 방명록 · 방문자 수 · 별빛 서버 실브라우저 검증.
