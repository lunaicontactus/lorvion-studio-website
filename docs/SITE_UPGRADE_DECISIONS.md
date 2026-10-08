# EUNGARAGE SITE UPGRADE — DECISION LOCK

2026-10-02, 사용자 확정. 이 문서의 결정은 사용자가 따로 바꾸라고 하기 전까지 모든 단계에서 우선한다.
근거 자료: `docs/SITE_UPGRADE_BEFORE.md`(PHASE A).

## LOCK

| # | 항목 | 결정 |
|---|---|---|
| 1 | 작품 수 | **5개 유지**: LUNAI · LIMINAL · WORM UP! · LUMIORA · RUBATO. 브리프의 3개는 예전 기준. 사용자가 삭제를 지시하기 전까지 5개. |
| 2 | 명칭 | 메인 내비는 **WORKS**. `OUR GAMES`로 되돌리지 않는다. 페이지 안 보조 문구로 `Games & Projects`는 가능. |
| 3 | 주소 | **`/works/<id>.html` 유지**. `/games/` 체계로 옮기지 않는다. SEO는 canonical·redirect만 점검. |
| 4 | 비밀문 | **별을 모아 여는 비밀 보관소 입구 그대로**. LIMINAL 전용 문으로 바꾸지 않는다. LIMINAL 분위기는 포스터·사건 파일·기록 서랍·모니터·TV 등 기존 물건 중 자연스러운 곳에. |
| 5 | 아카이브 | 두 단계. **PUBLIC ARCHIVE**(독립 페이지, 누구나: Concept Art · Character · Development · Old Designs · Screenshots · Sound/Visual experiments) = 공식 기록실. **SECRET STORAGE**(기존 비밀 보관소, 별 수집) = 차고 뒤 개인 상자: 추가 그림 · 초기안 · 폐기안 · 도깨비 메모 · 작은 이스터에그 · 숨은 개발 자료. **같은 자료를 두 곳에 반복하지 않는다.** |
| 6 | TV | 지금은 **실제 게임 자산의 이미지 슬라이드**. 가짜 트레일러·임시 영상 금지. 채널은 data-driven으로, 나중에 영상 자산만 바꾸면 되게. |
| 7 | 라디오/음악 | **blocker 아님.** 게임별 전용곡을 임의 지정하지 않는다. 프로젝트의 음악 파일 전부를 AUDIO AUDIT로 정리(파일명·길이·용량·사용 위치·사이트 사용 여부·루프 가능·성격·중복). 지금 차고에서 쓰는 음악/공간음만 유지. AudioManager는 **AMBIENT · MUSIC · SFX · UI** 네 층을 구분하고, 공간음 파일에 음악이 들어가 겹치는 일을 다시 만들지 않는다. 공식 음악이 없는 게임 채널은 `NO SIGNAL` 또는 `TAPE NOT FOUND`. |
| 8 | 새 이미지 | 기존 자산으로 되는 것은 만들지 않는다(crop · mask · layer · CSS · parallax · state overlay · lighting). 꼭 필요하면 `NEW_ASSET_REQUIRED` 목록(filename · 사용 위치 · 기존으로 안 되는 이유 · 권장 크기 · 투명 여부 · 정확한 prompt)으로 보고. 이미지 때문에 구현을 멈추지 않고, placeholder도 만들지 않는다. |
| 9 | WORM UP! | **Steam 내러티브판으로 전면 교체.** 러너 정보(횡스크롤 등산 러너 · iOS · 200 스테이지 · 러너 스크린샷)는 현재 작품 소개에서 제거. 핵심 문장 `지렁이는 계속 앞으로 간다.`는 Hero 또는 핵심 소개 **한 곳**에서만. 부제 `봄은 모두에게 같은 날 오지 않았다`는 subtitle/tagline. 장르는 실제 구현 기준(Narrative Adventure 계열, 과장 금지). Platform `PC / Steam`. Status 실제 상태(IN DEVELOPMENT). Steam 링크·WISHLIST 버튼 없음. 갤러리는 Steam판 실제 화면. 러너 자료는 필요하면 ARCHIVE의 `Early Prototype`으로 분리 보관. |
| 10 | 분석 | 외부 추적 도구·SDK 도입 금지. 이벤트 스키마만 설계. |

## 다음 단계 우선순위 (PHASE A 발견)

- **A. 첫 방문 정체성**: 골목 첫 화면에서 10초 안에 "게임 만드는 곳"임을 알게. 중앙을 덮는 설명문 금지. `EUNGARAGE` + 아주 짧은 보조 문구(예: Games made after dark / 한국어 문맥에 맞는 한 줄).
- **B. 모바일 발견성**: hover에만 의존하지 않는다. PC는 hover 유지, 모바일은 subtle pulse · tap hint · 작은 라벨 · 첫 방문 1회 안내 중 가장 덜 산만한 방식. 핫스팟 아이콘을 항상 띄우는 방식 금지.
- **C. 옛 LUNAI 기업형 화면 제거**: Studio · Support · 404를 현재 EUNGARAGE 브랜드로 통일. 기능과 실제 지원 정보는 보존.
- **D. 성능**: ENTER 후 크루 스프라이트 요청(+98~128)은 PHASE K에서 최적화. 그 전에 초기 필요 프레임 · 행동 시에만 필요한 프레임 · 미리 받는 이유 · 시트 전환 가능성 · 지연 로딩 가능성을 먼저 분석. 프레임 수를 줄여 품질을 떨어뜨리는 방식 금지. PHASE B에서는 스프라이트 시스템을 건드리지 않는다.

## 운영 규칙

- 라이브 배포는 사용자 승인 후에만. A–F는 브랜치 `site-upgrade`에서 구현·테스트·캡처했고, 2026-10-05 `e135f69`(tag `prod-2026-10-05`)로 배포·LOCK.
- PHASE G부터는 `main`에서 PHASE별 브랜치를 만든다 (`phase-g-archive`). rollback은 revert commit, force-push 금지. 자세한 운영 기준은 `docs/OPERATIONS.md`.
- 각 PHASE 끝에 보고 후 다음 단계로.
