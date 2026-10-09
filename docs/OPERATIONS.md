# EUNGARAGE 운영 기준

최종 갱신: 2026-10-08 (PHASE G 배포 후).

## 1. Production checkpoint (LOCK)

| 항목 | 값 |
|---|---|
| 현재 production | **`f3e8668`** (main) — SITE UPGRADE A–G. PHASE G = PR #18 merge |
| tag / release | **`prod-2026-10-08`** — https://github.com/lunaicontactus/lorvion-studio-website/releases/tag/prod-2026-10-08 |
| production deploy run | **37770097362** — verify(unit 323/323 · e2e 375/375) → verify가 만든 artifact 그대로 배포 |
| live bundle | `main-CsRwaxqn.js` |
| live smoke | **69/69** (desktop · 390×844 · 844×390 · WebKit) |
| 이전 checkpoint | `prod-2026-10-05` / `e135f69` (SITE UPGRADE A–F) |

checkpoint 이력:

| tag | commit | 내용 | deploy run | e2e | live smoke |
|---|---|---|---|---|---|
| `prod-2026-10-08` | `f3e8668` | PHASE G PUBLIC ARCHIVE / SECRET STORAGE | 37770097362 | 375/375 | 69/69 |
| — | `58e3aad` | PR #19 workflow hardening (사이트 콘텐츠는 `e135f69`과 byte 단위 동일) | 37754414329 | 365/365 | 38/38 |
| `prod-2026-10-05` | `e135f69` | SITE UPGRADE A–F + post-F polish | 37238738529 | 365/365 | 38/38 |

새 production이 나갈 때마다 `prod-YYYY-MM-DD` tag와 release를 만들고 이 표를 갱신한다. 콘텐츠가 같은 재배포(운영·문서 PR)는 tag를 만들지 않고 이력 표에만 적는다.

## 2. 작업 흐름

- `main`에서 직접 작업하지 않는다. ruleset이 막는다(§4). 현재 `main`에서 PHASE·목적별 브랜치를 만든다.
  - 예: `phase-g-archive`, `phase-h-studio-support-press`, `docs/…`, `ops/…`
- 브랜치에서 구현·검증한다. 사용자 승인 전에는 merge하지 않는다.
- 배포는 PR → `verify` 통과 → merge 순서다. merge로 `main`이 바뀌면 workflow가 다시 verify한 뒤 그 빌드를 Pages로 배포한다.
- PR의 최신 commit 메시지에 `[skip ci]`가 있으면 GitHub가 verify를 건너뛴다. 최종 검증을 받을 commit에는 넣지 않는다.

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
| 1 | LUNAI 앱 정책 페이지 5개(privacy · terms · account-deletion · community-guidelines · support)의 "EUNGARAGE · LUNAI" 표기 정리 | PHASE H |
| 2 | 라디오 NIGHT `ambient.m4a` 루프 지점 0.43초 무음 + 하드 재시작(원본 파일 문제). 공개 기록실 SOUND에도 같은 파일 | 청취 판정 후 REQUIRED AUDIO FIX 여부 |
| 3 | 실제 iPhone Safari QA 미실시 | DEVICE QA |

### 해결된 known issue

| 내용 | 해결 |
|---|---|
| 가로 화면 기록 서랍(cabinet) 51px overflow, 그리고 같은 영역에서 꺼낸 서류가 LIMINAL 사건 파일 탭을 덮던 문제 | `fix/landscape-records-drawer` — 휴대폰 가로(높이 ≤ 520)에서는 캐비닛 전체가 보이고, 서류와 서류철을 캐비닛 옆 두 칸에 놓는다. 서류 45가지 × 줄 늘림 0~2 모두 탭을 덮지 않는다(`e2e/drawer-landscape.spec.ts`) |

선택 오디오 자산(OPTIONAL, `docs/SITE_UPGRADE_PHASE_F.md`)은 known issue가 아니라 백로그로 유지한다.
