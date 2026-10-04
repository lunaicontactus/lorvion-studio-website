# EUNGARAGE 운영 기준

## 1. Production checkpoint (LOCK)

| 항목 | 값 |
|---|---|
| 안정 기준 | `e135f69` (main) — SITE UPGRADE A–F + post-F polish |
| tag | `prod-2026-10-05` (annotated) |
| release | https://github.com/lunaicontactus/lorvion-studio-website/releases/tag/prod-2026-10-05 |
| deploy run | 37238738529 — verify (unit 312/312 · e2e 365/365) + GitHub Pages deploy |
| live smoke | 38/38 (desktop · mobile · WebKit), 16페이지 자산 참조 119개 전부 200 |
| 이전 production | `5eff866` (WORLD 2.4) |

새 production이 나갈 때마다 같은 형식으로 `prod-YYYY-MM-DD` tag와 release를 만들고 이 표를 갱신한다.

## 2. 작업 흐름

- `main`에서 직접 작업하지 않는다. 현재 `main`에서 PHASE별 브랜치를 만든다 (PHASE G: `phase-g-archive`).
- 브랜치에서 구현·검증한다. 라이브(`main`)는 사용자 승인 전에는 건드리지 않는다.
- 배포는 PR → `verify` 통과 → merge. `main`에 push되면 workflow가 다시 verify한 뒤 Pages로 배포한다.

## 3. Rollback — revert commit 방식

과거 SHA를 `main`에 force-push하지 않는다. 기록을 지우지 않고 되돌리는 commit을 만든다.

```
git switch -c rollback/<사유> origin/main
git revert --no-edit <잘못 들어간 첫 commit>^..<마지막 commit>   # 여러 commit
git revert -m 1 <merge commit>                                  # merge commit 하나
git push origin rollback/<사유>
```

→ PR 생성 → `verify` 통과 확인 → merge → 배포 run 확인 → live smoke → 되돌린 이유를 release note에 기록.
급할 때도 PR을 거친다. verify(약 1.1시간)를 기다릴 수 없을 정도의 장애라면 사용자에게 먼저 묻는다.

## 4. Branch protection 검토 (2026-10-05, 적용 전)

**현재 상태**

- `main` 보호 규칙 없음 (branch protection 404, ruleset 0개). 누구든 push·force-push·삭제 가능.
- `github-pages` environment는 `main`에서만 배포 가능 (branch policy) — 다른 브랜치에서는 배포되지 않는다.
- workflow: PR과 `main` push 모두 `verify`, `main` push만 `deploy`.
- 저장소: public, 개인 계정(owner = admin 1명). merge commit / squash / rebase 모두 허용.

**발견한 위험**

1. **배포 취소 위험** — `concurrency: { group: "pages", cancel-in-progress: true }`를 PR run과 `main` run이 같이 쓴다. `main` 배포가 도는 중에 PR에 push하면 production 배포 run이 취소될 수 있다.
2. **검증한 빌드와 배포한 빌드가 다르다** — `deploy` job이 `npm ci && vite build`를 다시 한다. 이번 배포는 hash가 같았지만(`main-Dkj-2oVo.js`), verify가 올린 `dist-${sha}` artifact를 그대로 배포하는 것이 맞다.
3. **force-push 가능** — rollback 규칙(3)을 사람의 습관에만 맡기고 있다.

**권장안 (승인 후 적용)**

- `main` ruleset: PR 필수 (승인 인원 0 — 1인 저장소라 self-approve 불가 문제 회피), required status check `verify`, 브랜치 최신화 필수, force-push 금지, 삭제 금지, linear history는 강제하지 않음(merge commit으로 PHASE 경계 보존).
- admin bypass는 끄는 것을 권장. 켜 두면 긴급 시 우회는 되지만 규칙이 의미를 잃는다.
- workflow: `verify`의 concurrency group을 `verify-${{ github.ref }}`로 분리하고, `deploy`만 `group: pages, cancel-in-progress: false`.
- `deploy` job은 `actions/download-artifact`로 `dist-${{ github.sha }}`를 받아 배포 (재빌드 제거).
- 위 workflow 변경은 그 자체로 PR → verify를 거쳐 들어간다.

이 섹션은 검토 결과이며, ruleset과 workflow는 아직 바꾸지 않았다.

## 5. Known issues (PHASE G로 carry over)

| # | 내용 | 예정 |
|---|---|---|
| 1 | LUNAI 앱 정책 페이지 5개(privacy · terms · account-deletion · community-guidelines · support)에 "EUNGARAGE · LUNAI" 표기 | PHASE H |
| 2 | 라디오 NIGHT `ambient.m4a` 루프 지점 0.43초 무음 + 하드 재시작 (원본 파일 문제) | 청취 판정 후 REQUIRED AUDIO FIX 여부 |
| 3 | iPhone Safari 실기기 QA 미실시 | DEVICE QA |
| 4 | 가로 화면 기록 서랍(cabinet) 51px 넘침 | PHASE I |

선택 오디오 자산(OPTIONAL, `docs/SITE_UPGRADE_PHASE_F.md`)은 known issue가 아니라 백로그로 유지한다.
