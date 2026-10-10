# EUNGARAGE 운영 기준

최종 갱신: 2026-10-10 — PHASE I 배포 · live smoke 완료 후. 이 문서 갱신은 docs-only PR이다: PR의 `verify`는 돌고, merge commit은 `[skip ci]`라 `main`에서 같은 사이트를 다시 verify · 배포하지 않는다(사이트 파일 변경 0). 그래서 `main` HEAD는 이 문서 commit이고, production 배포는 아래 `f862f29`의 run 그대로다.

## 1. Production checkpoint (LOCK)

| 항목 | 값 |
|---|---|
| production | **`f862f29`** (main) — PHASE I, PR #26 merge (branch head `0167162`) |
| production deploy run | **38050217933** — verify(lint · typecheck · unit 339/339 · build · brand scan · e2e 496/496 · frozen URL) → verify가 만든 `dist-f862f296…` artifact 그대로 배포(재빌드 없음, `.nojekyll` 포함) |
| live bundle | `main-DJ3w7pHA.js` · `main-CcRcfwo1.css` (cache-busted 요청으로 artifact와 일치 확인) |
| live smoke | regression 69/69 · PHASE H 50/50 · PHASE I 20/20 · PHASE I spec을 production에 64/64(axe 0, 키보드, 6개 화면 터치 계약, WebKit 시뮬레이션) · LUNAI 문서 4개 법적 본문 동일 |
| 마지막 tag | **`prod-2026-10-10-phase-i`** / `f862f29` |
| 이전 checkpoint | `prod-2026-10-10` / `6008d66` (PHASE H) |

checkpoint 이력:

| tag | commit | 내용 | deploy run | e2e | live smoke |
|---|---|---|---|---|---|
| `prod-2026-10-10-phase-i` | `f862f29` | PHASE I 모바일 · 반응형 · 접근성(PR #26) | 38050217933 | 496/496 | 69/69 + H 50/50 + I 20/20 + I spec 64/64 |
| `prod-2026-10-10` | `6008d66` | PHASE H(#22 `66fb0d6`) + PR #25 e2e test only(발소리 확인이 누군가 걸어 들어온 뒤부터) | 37995194051 | 432/432 | 69/69 + PHASE H 50/50 |
| — | `66fb0d6` | PR #22 PHASE H merge. verify 1건 실패(발소리 false failure → #25)로 배포 생략, live 영향 없음 | 37978981569 | 431/432 | — |
| — | `fa1c46b` | PR #24 기록 서랍 가로 수정(사건 파일 탭 덮임 · 51px overflow) | 37962557707 | 398/398 | 69/69 |
| — | `29d01ab` | PR #23 e2e test only (사이트 콘텐츠 그대로, live bundle 동일 `main-kxHXsD0r.js`) | 37954040967 | 390/390 | — |
| — | `ed9b3e5` | PR #21 휴대폰에서 LUNAI 개인정보처리방침 본문이 안 보이던 버그 | 37943151636 | 390/390 | 69/69 + 개인정보 live(세로 · 가로 · 데스크톱) |
| — | `532c2f2` | PR #20 문서만. verify 1건 실패(`#playground` false failure → #23)로 배포 생략, live 영향 없음 | 37853641845 | 374/375 | 69/69 |
| `prod-2026-10-08` | `f3e8668` | PHASE G PUBLIC ARCHIVE / SECRET STORAGE | 37770097362 | 375/375 | 69/69 |
| — | `58e3aad` | PR #19 workflow hardening (사이트 콘텐츠는 `e135f69`과 byte 단위 동일) | 37754414329 | 365/365 | 38/38 |
| `prod-2026-10-05` | `e135f69` | SITE UPGRADE A–F + post-F polish | 37238738529 | 365/365 | 38/38 |

새 PHASE가 production에 나가면 `prod-YYYY-MM-DD` tag와 release를 만든다. bugfix · 문서 · 운영 PR은 tag 없이 이력 표에만 적는다.

## 2. 작업 흐름

- `main`에서 직접 작업하지 않는다. ruleset이 막는다(§4). 현재 `main`에서 PHASE·목적별 브랜치를 만든다.
  - 예: `phase-g-archive`, `phase-h-studio-support-press`, `docs/…`, `ops/…`
- 브랜치에서 구현·검증한다. 사용자 승인 전에는 merge하지 않는다.
- 배포는 PR → `verify` 통과 → merge 순서다. merge로 `main`이 바뀌면 workflow가 다시 verify한 뒤 그 빌드를 Pages로 배포한다.
- PR의 최신 commit 메시지에 `[skip ci]`가 있으면 GitHub가 verify를 건너뛴다. 최종 검증을 받을 commit에는 넣지 않는다.
- **문서만 바꾸는 PR**(사이트 파일 변경 0): PR의 verify는 그대로 받고, merge commit 제목에 `[skip ci]`를 넣어 `main`에서 같은 사이트를 다시 verify · 배포하지 않는다. 사이트 파일이 하나라도 바뀌면 이렇게 하지 않는다.

## 3. Rollback — revert PR 방식

과거 SHA를 `main`에 force-push하지 않는다(ruleset이 막는다). 기록을 지우지 않고 되돌리는 commit을 PR로 넣는다.

```
git switch -c rollback/<사유> origin/main
git revert --no-edit <잘못 들어간 첫 commit>^..<마지막 commit>   # 여러 commit
git revert -m 1 <merge commit>                                  # merge commit 하나
git push origin rollback/<사유>
```

이후 순서:
1. PR 생성
2. `verify` 통과 확인
3. merge
4. 배포 run 확인
5. live smoke
6. 되돌린 이유를 release note에 기록

급할 때도 PR을 거친다. verify(약 1.1시간)를 기다릴 수 없을 정도의 장애라면 사용자에게 먼저 묻는다. 되돌아갈 기준은 §1의 checkpoint tag다.

## 4. 보호 규칙과 배포 경로 (적용 완료)

### workflow — PR #19 (`58e3aad`, 2026-10-08 merge)

`.github/workflows/deploy-pages.yml`:

- workflow 전체 concurrency가 없다.
  - 예전에는 PR run과 `main` run이 `pages` 그룹 하나를 같이 써서, PR에 push하면 production 배포가 취소될 수 있었다.
- `verify`: `group: verify-${{ github.ref }}`, `cancel-in-progress: true`. 같은 브랜치의 더 새 push만 이전 verify를 취소한다.
- `deploy`: `group: pages`, `cancel-in-progress: false`. 시작된 production 배포는 끝까지 간다.
- **production deploy는 verify가 만든 `dist-${{ github.sha }}` artifact를 그대로 배포한다. deploy 단계에서 재빌드하지 않는다.** (`npm ci` · `vite build` 없음. 2026-10-08 run 로그로 확인)
- **artifact에 `.nojekyll`이 포함된다** (`include-hidden-files: true`).
  - 2026-10-05 이전 artifact에는 없었다.
  - 2026-10-08 `dist-58e3aad…` artifact에서 포함을 확인했고, 라이브 `/.nojekyll`이 200을 반환한다.
- frozen URL 검사(`scripts/check-frozen.sh`)는 verify의 빌드와 deploy가 내려받은 artifact에 각각 실행된다.
- `github-pages` environment는 `main`에서만 배포된다(branch policy).

### `main` ruleset — **24716112, ACTIVE** (2026-10-08 적용, API로 확인)

| 규칙 | 값 |
|---|---|
| PR required | 예 — `main`은 PR merge로만 바뀐다 |
| approvals | 0 |
| required check | `verify` (GitHub Actions) |
| branch up-to-date required | 예 (strict) |
| force-push | 금지 (`non_fast_forward`) |
| branch deletion | 금지 |
| bypass | 없음 (admin 포함) |

- GitHub가 기본으로 넣는 `require_extra_approval_for_unattributed_changes: true`도 함께 들어가 있다. PR #18은 이 상태에서 `CLEAN`으로 merge됐다.
- 규칙을 바꾸려면 사용자 승인 후 API(`repos/lunaicontactus/lorvion-studio-website/rulesets/24716112`)로 바꾸고, 이 표를 갱신한다.

## 5. Known issues

| # | 내용 | 예정 |
|---|---|---|
| 1 | **법적 문서 질문**: *operator naming differs across legal documents; retained intentionally pending legal review.* 개인정보처리방침은 운영 주체를 "EUNGARAGE 루나아이 운영팀"으로 적고, 이용약관 · 커뮤니티 이용규칙은 "운영자"라고만 적는다. 본문 변경은 법적 변경이라 하지 않았다 | 법적 검토 |
| 2 | 라디오 NIGHT `ambient.m4a` 루프 지점 0.43초 무음 + 하드 재시작(원본 파일 문제). 공개 기록실 SOUND에도 같은 파일 | 청취 판정 후 REQUIRED AUDIO FIX 여부 |
| 3 | **REAL IPHONE SAFARI QA: NOT YET PERFORMED.** PHASE I은 Playwright WebKit(휴대폰 크기 · 터치 · iPhone UA) **시뮬레이션**만 했다(PR과 production 모두 통과). 실기기만 답할 수 있는 항목과 5분 체크리스트: `docs/SITE_UPGRADE_PHASE_I.md` §8 | 사용자 실기기 확인 |
| 4 | works · archive 페이지는 차고 원본 그림(약 700KB)을 흐린 배경으로 받는다. 정보 페이지는 240px 사본으로 줄였다 | PHASE K |
| 5 | 진열장(작업 기록 진열장)의 그려진 물건 14개 중 일부는 휴대폰에서 폭 15–41px(그림 크기 그대로, 이웃과 맞닿아 있어 넓힐 수 없음). 44px 대체 경로: 하나를 고르면 나오는 카드의 ‹ › 가 14개 전부를 차례로 보여 준다(WCAG 2.5.8 equivalent). `e2e/touch-i.spec.ts`가 대체 경로를 검사 | 목록형 보기 검토(선택) |

### 해결된 known issue

| 내용 | 해결 |
|---|---|
| LUNAI 정책 페이지 5개의 "EUNGARAGE · LUNAI" 표기 — 실제 원인은 문자열이 아니라 LUNAI 시절 검은 기업형 화면 셸 | PHASE H(#22) — 정보 페이지 셸 통일, LUNAI = 제품 · EUNGARAGE = 만든 곳으로 제목 · 표기 정리. 법적 본문은 그대로(SHA-256 고정) |
| 휴대폰에서 LUNAI 개인정보처리방침 본문이 보이지 않음(reveal 18% 규칙) | PR #21 `ed9b3e5` |
| 가로 화면 기록 서랍(cabinet) 51px overflow, 같은 영역에서 꺼낸 서류가 LIMINAL 사건 파일 탭을 덮던 문제 | PR #24 `fa1c46b` — 휴대폰 가로(높이 ≤ 520)에서 캐비닛 전체 + 옆 두 칸(서류 · 서류철). 서류 45가지 × 줄 늘림 0~2 모두 탭을 덮지 않는다(`e2e/drawer-landscape.spec.ts`) |
| `#playground` 도착 e2e false failure | PR #23 `29d01ab` (test only) |
| TV VIEW PROJECT 클릭 · 탭 불가(지지직 레이어가 위에 있음) | PHASE I `f862f29` |
| 택배 패널에서 Tab이 밖으로 빠짐 · 홈의 보이지 않는 키보드 정지 11개 | PHASE I `f862f29` — 가두기는 `getClientRects`로, 링크는 포커스되면 보이는 띠 |
| 모바일 메뉴: Tab 탈출 · 바깥 탭 무반응 · 짧은 가로에서 링크 잘림 | PHASE I `f862f29` |
| 44px 미만 터치 대상 3,602건 · 10px 미만 글자 1,344건(710개 화면 상태) · footer 대비 3.66:1 · axe 위반 27건(라디오 ARIA, 개인정보 표 스크롤 포함) | PHASE I `f862f29` — 0 · 0 · 6.1:1 · 0 (진열장 그림 물건은 known issue 5의 대체 경로) |
| TV 손잡이가 화면 밖인데 포커스 · safe-area 없음 · 택배 태그 · 진열장 카드가 화면 밖 · 물건 포커스 표시 약함 | PHASE I `f862f29` |

선택 오디오 자산(OPTIONAL, `docs/SITE_UPGRADE_PHASE_F.md`)은 known issue가 아니라 백로그로 유지한다.
