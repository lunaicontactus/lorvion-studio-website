# SITE UPGRADE — PHASE G REPORT (PUBLIC ARCHIVE / SECRET STORAGE)

브랜치 `phase-g-archive` (main `e135f69`에서 분기) · draft PR #18 · 라이브 배포 없음.
기준: DECISIONS #5 (두 단계 아카이브, 같은 자료 반복 금지), `docs/SITE_IA.md` §7, #8 (새 이미지 없음).

## BEFORE

- `/archive.html`은 계획만 있는 route(`live: false`). 내비·푸터·사이트맵에 없음.
- PC 바탕화면 ARCHIVE 아이콘은 "자료 정리 중."이라고 말만 했다.
- SECRET STORAGE(별 3개로 여는 차고 뒤 방)의 폴라로이드 테이블 11장 이상은 **전부 공개 페이지에 이미 있는 그림**이었다.
  - 작품 키아트 5장: 벽 포스터 · 작품 페이지와 같은 그림.
  - 개발 화면 10장: 이 중 5장은 작품 갤러리와 같은 그림.
  - 작업대 기록 6장: 차고 작업대 패널과 같은 그림.
- 기억 상자도 작업대 기록 6장 중 하나를 뽑아 보여 줬다. 그 결과 같은 그림이 작업대 · 기억 상자 · 폴라로이드 세 곳에 나왔다.
- 작품 페이지의 "작업 흔적 보기"는 그 폴라로이드에서 읽었다. LUNAI · RUBATO는 같은 페이지 갤러리에 있는 그림을 다시 보여 줬다.

## PROBLEM

1. 공개 기록실이 없다. 실제로 보여 줄 수 있는 자료가 있는데도 저장소 안에만 있었다.
   - 크루 설정화 5장
   - 첫 3D 크루
   - WORM UP! 러너 시절 자료: PHASE C에서 "PHASE G의 Early Prototype으로" 따로 보관해 둔 것
   - 예전 마크 2개
2. 비밀 보관소에 비밀이 없다. 별을 모아 들어간 사람이 이미 본 그림만 본다. DECISIONS #5 위반.

## IMPLEMENTED

### PUBLIC ARCHIVE — `/archive.html`

누구나 들어올 수 있다. 내비 ARCHIVE · 푸터 · 사이트맵 · PC 바탕화면 ARCHIVE 아이콘에서 들어온다.

| 칸 | 자료 | 출처 |
|---|---|---|
| CONCEPT ART (5) | 다섯 작품의 키아트 원본 크기. 아래 한 줄은 작품 자신의 태그라인 | `public/assets/images/artwork/*-full` |
| CHARACTERS (5) | MOMO · NUNU · RUKI · YOMI · POKO 앞·옆·뒤 설정화(지금 크루가 만들어진 사용자 원본) | `assets/crew-reboot/source/` · 8c44174 |
| DEVELOPMENT (11) | 작업대 기록 6장(날짜 · 커밋) + 갤러리에 없는 그레이박스 화면 5장(LIMINAL 3D 2 · LUMIORA 3) | `wip/`, `works/` · 65252f4 |
| SCREENSHOTS (5) | 그림을 복사하지 않음. 작품마다 카드 하나 → 그 작품 갤러리(`/works/<id>.html#gallery-h`) | — |
| OLD DESIGNS (9) | 처음 만든 3D 크루(다섯의 v1 프레임을 나란히, 합성만) · WORM UP! 러너 키아트 · 앱 아이콘 · 이야기 컷 3 · 50스테이지 까마귀 · 차고 문 로고 이전 마크 2 | `dokkaebi/` 96665cb · `assets/archive/early-prototype` 25d9015 · `assets/archive/legacy` d21112f |
| SOUND (6) | 사이트에서 실제로 흐르는 곡: 차고 · NIGHT · 바깥 · 무궁화 · 간식 가게 · 택배. 누를 때만 재생, 한 번에 하나 | `audioRoles.ts`의 MUSIC |

- 그림마다 날짜와 커밋(또는 작품 파일)을 적었다. 빈 칸은 화면에 나오지 않는다(placeholder · COMING SOON 없음).
- 그림을 누르면 작품 페이지와 같은 뷰어가 열린다. 그 칸 안에서 ‹ › · 화살표 키 · 스와이프로 넘기고, Esc를 누르면 누른 카드로 포커스가 돌아온다.
- 칸 색인(pill)으로 키보드만으로 각 칸에 갈 수 있다.
- 비밀 보관소의 곡 두 개(`archive.m4a` · `music_box.m4a`)는 공개하지 않았다.
- 판정 변경 1건: IA 문서는 `crew-reboot/redesigned`를 CHARACTERS 후보로 적었다. 그런데 `GENERATION_LOG.md`가 이것을 **"리디자인 폐기"**로 기록하고 있어서 비밀 보관소(폐기안)로 옮겼다.
- 판정 변경 2건째: IA의 Old Designs 후보 `assets/brand-v02/`는 **지금 쓰는 로고**(f96bcdd "One logo, everywhere")라서 제외했다.

### SECRET STORAGE — 공개 기록실에 없는 것만

- **폴라로이드 테이블 5장**: 전부 `public/assets/images/archive/secret/`에만 있다.
  - 다시 그리다 그만둔 모모 (폐기안, 09.12)
  - 짧은 털 시험 (시도안, 09.13)
  - 턱 밑 링 네 방향
  - 차고 크기에서 목 숨기기
  - 차고에 세워 본 전과 후 (숨은 작업 시트, 09.13)
  - 집어 들면 원본 크기 그림이 나온다.
- **기억 상자 = 크루 메모 6장**: 열 때마다 다른 한 장이 위에 온다.
  - 실제로 있었던 일만 적었다: 모모 리디자인 폐기, 짧은 털, 냉장고 문, 도깨비불, 동시에 걷는 수, 냉장고 앞 터치.
  - 각 메모에 날짜 · 커밋 · 서명(정본 역할에 맞는 크루)을 붙였다.
- 오르골 · 망원경 · 별 항아리 · 등 · 방석은 그대로 두었다.
- 중복 검사:
  - 단위 테스트가 두 쪽 파일의 **SHA-1**을 비교한다.
  - e2e가 실제 화면의 이미지 경로를 비교한다.

### 그 밖

- PC 바탕화면 ARCHIVE는 이제 `/archive.html` 링크다(MAIL과 같은 화면 접힘 전환).
- 작품 페이지의 LINKS:
  - 모든 작품에 "기록실에서 보기 →"가 있다.
  - "작업 흔적 보기"는 공개 기록실의 DEVELOPMENT 중 그 작품 것만 보여 준다(LIMINAL 2 · LUMIORA 3). 갤러리 그림과 겹치지 않는다.
- route `/archive.html`을 `live` · `indexed`로 바꿨다. 사이트맵에 들어갔다.

## FILES

새 파일:
- `archive.html`
- `src/data/publicArchive.ts`
- `src/data/memos.ts`
- `src/ui/records.ts`
- `scripts/archive_images.py`
- `test/archive-g.test.ts`
- `e2e/archive-g.spec.ts`
- `docs/SITE_UPGRADE_PHASE_G.md`
- `docs/OPERATIONS.md` (운영 기준)

수정:
- `src/data/polaroids.ts` (비밀 전용)
- `src/data/sitemap.ts`
- `src/ui/panels.ts` (PC ARCHIVE 링크 · 기억 상자 메모 · 큰 폴라로이드 원본)
- `src/ui/works.ts` (뷰어 export · 흔적 출처 · 기록실 링크)
- `src/app/boot.ts`
- `src/styles/works.css`
- `src/styles/archive.css`
- 테스트: `test/{polaroids,works,garage-d,sitemap}.test.ts`, `e2e/{archive,objects,works}.spec.ts`

## NEW ASSETS

새로 만든(생성한) 이미지 0장. 기존 자료를 줄이고 변환만 했다(`scripts/archive_images.py`).

- `public/assets/images/public-archive/`: 14개 × thumb/full + 작업대 시트 thumb 6 + 첫 크루 합성 1 = 2.7 MB
- `public/assets/images/archive/secret/`: 5개 × thumb/full = 0.7 MB

## REMOVED

- 비밀 보관소에서 공개 자료 반복을 없앴다(키아트 5 · 개발 화면 10 · 작업대 6).
- PC ARCHIVE의 "자료 정리 중." 대사를 없앴다.
- 삭제한 파일은 없다.

## PERFORMANCE

로컬 production preview, 같은 하네스(Resource Timing, networkidle):

| | 요청 | 전송량 | LCP |
|---|---|---|---|
| `/archive.html` 데스크톱 | 35 | 1,658 KB | 40 ms |
| `/archive.html` 모바일 | 31 | 1,627 KB | 32 ms |
| `/works.html` 데스크톱 (참고) | 10 | 1,118 KB | 40 ms |

- 이미지는 `loading="lazy"`다. 원본은 뷰어를 열 때만 받는다.
- 처음 만든 썸네일(640 폭)일 때는 2,364 KB였다. 카드 크기의 2배(600×450 안)로 줄여 −30%가 됐다.
- 차고 · 작품 페이지 무게에는 변화가 없다(비밀 보관소 폴라로이드가 21장에서 5장으로 줄어 그쪽은 가벼워졌다).

## MOBILE

390×844 · 844×390 모두:
- 가로 넘침 0, 그림 깨짐 0, 콘솔 오류 0
- 2열 카드, 칸 색인 줄바꿈
- 뷰어는 화면에 고정된다. 처음 만든 빌드에서 뷰어가 애니메이션 중인 칸 안에 붙어 함께 스크롤되던 버그를 찾아 고쳤다(`main`에 붙임).

## TEST

- unit 322/322 (PHASE G 새 테스트 10)
- lint · typecheck clean
- brand scan clean
- 영향 받는 e2e(chromium, retries=0) 46/46
  - `archive-g.spec`: 세 화면 크기 · 뷰어 · 키보드 · 갤러리 링크 · 한 곡씩 · 비밀 보관소 비중복
  - `works.spec` · `archive.spec` · `objects.spec` · `garage-d.spec`
- GitHub full e2e: PR #18 run — 결과는 PR에서 확인

## SCREENSHOTS

`docs/shots/phaseG/`:
- 데스크톱 · 휴대폰 · 휴대폰 가로: 기록실 위 · 칸별 · 뷰어
- LUMIORA 흔적 링크
- 비밀 보관소: 메모 · 테이블 · 집어 든 폴라로이드

## 사용자 판정이 필요한 것

1. 공개 범위: 크루 설정화 원본 · 첫 3D 크루 · WORM UP! 러너 자료 · 예전 마크를 공개 기록실에 내도 되는지.
2. 크루 메모 6장의 말투 · 내용.
3. 비밀 보관소에 넣은 5장(폐기안 · 시도안 · 작업 시트)이 "숨은 개발 자료"로 맞는지.
4. CONCEPT ART에 실제 스케치 · 콘셉트 원화를 더하려면 파일을 받아야 한다. 이미지 생성은 하지 않았다.

## KNOWN ISSUES (carry over, 변화 없음)

1. LUNAI 정책 페이지 5개 "EUNGARAGE · LUNAI" 표기 — PHASE H
2. NIGHT `ambient.m4a` 루프 0.43초 무음 — SOURCE ISSUE. 공개 기록실 SOUND에서도 같은 파일이다.
3. iPhone Safari 실기기 QA 미실시
4. 가로 기록 서랍 51px 넘침 — PHASE I

## NEXT

사용자 확인 → PHASE G 승인 시 PHASE H (PRESS / CONTACT / SUPPORT).
