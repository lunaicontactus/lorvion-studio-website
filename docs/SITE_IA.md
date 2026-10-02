# EUNGARAGE — INFORMATION ARCHITECTURE (SITE UPGRADE PHASE B)

2026-10-02. 결정은 `docs/SITE_UPGRADE_DECISIONS.md`가 우선. 감사 근거는 `docs/SITE_UPGRADE_BEFORE.md`.
코드의 정본: 경로·내비·푸터·sitemap은 `src/data/sitemap.ts` 한 곳, 작품 정보는 `src/data/projects.ts` 한 곳.

---

## 1. SITE MAP — BEFORE / AFTER

```
BEFORE                                   AFTER (B = 이번에 만듦, G/H = 그 단계에서 만듦)
/                골목 → 차고              /                    골목 → 차고 (그대로)
  #playground    놀이터 + 미니게임 3        #playground          그대로
  #archive       비밀 보관소                #archive             = SECRET STORAGE (이름만 정리, 기능 그대로)
/works.html      작품 5                   /works.html          작품 5 + 보조문구 "Games & Projects"   (B)
/works/<id>.html ×5                       /works/<id>.html ×5  구조 정리, WORM UP! 교체              (C)
—                                         /archive.html        PUBLIC ARCHIVE                         (G)
/studio.html     한 줄 소개                /studio.html         섹션 구성 개편                          (H)
/support.html    LUNAI 지원                /support.html        작품별 지원 허브                         (H)
(studio#contact) 이메일 한 줄              /contact.html        문의 4종                                (B)
—                                         /press.html          PRESS KIT                              (H)
/404.html        옛 LUNAI 화면             /404.html            문구·링크·noindex (B), 차고 화면 (H)
/games.html      → /works.html            그대로
법적 문서 4      그대로                     그대로
```

## 2. ROUTE TABLE

| 경로 | 그룹 | 상태 | sitemap | 역할 |
|---|---|---|---|---|
| `/` | home | live | ○ | 골목 입구 → 차고(포인트&클릭) → 놀이터 · 비밀 보관소 |
| `/works.html` | works | live | ○ | 작품 5개 목록 |
| `/works/lunai.html` · `liminal` · `wormup` · `lumiora` · `rubato` | works | live | ○ | 작품 상세 |
| `/archive.html` | archive | planned(G) | — | PUBLIC ARCHIVE |
| `/studio.html` | studio | live | ○ (이번에 추가, 전에는 빠져 있었음) | 스튜디오 |
| `/support.html` | support | live | ○ | 작품별 고객지원 |
| `/contact.html` | contact | **live(B)** | ○ | 문의 |
| `/press.html` | press | planned(H) | — | PRESS KIT |
| `/privacy.html` · `/terms.html` · `/community-guidelines.html` · `/account-deletion.html` | legal | live | ○ | LUNAI 법적 문서(앱에서 링크, 주소 고정) |
| `/games.html` | system | live | — (noindex) | 예전 주소 → `/works.html` |
| `/404.html` | system | live | — (noindex, 이번에 추가) | 없는 주소 |

planned 경로는 페이지가 생기기 전까지 내비·푸터·sitemap 어디에도 링크되지 않는다(테스트로 강제).
canonical: 모든 페이지가 `https://eungarage.com/<path>`. 홈은 `/`이며 `/index.html`과의 중복은 canonical로 정리된 상태 유지. 링크는 이제 전부 `/` 절대경로(전에는 `./`와 `/`가 섞여 있었음).

## 3. NAVIGATION MAP

**상단 내비(모든 페이지 동일, 한 곳에서 생성)**: 로고 → `/` · **Works** · (Archive — G에서 추가) · Studio · Support · Contact · 소리 스위치.
- 현재 보고 있는 페이지는 `aria-current="page"`, 작품 상세에서는 Works가 `aria-current="true"`.
- 차고 안에서 **Works**는 PC를 연다(기존 결정 유지). PC 화면에서 전체 목록 `/works.html`로 갈 수 있다.
- **Contact**는 이제 어디서나 `/contact.html`. 전에는 차고 안에서 TV의 연락처 채널을 열었다. TV 채널은 방 안에 그대로 있다.

**푸터(차고 제외 모든 페이지 동일)**: EUNGARAGE(Garage · Works · Studio · Contact, 이후 Archive · Press) / SUPPORT(Support · LUNAI Privacy · Terms · Community · Account deletion) / EMAIL. 전에는 세 가지 푸터가 섞여 있었고 법적 문서 페이지에서는 차고·WORKS로 돌아갈 링크가 없었다.

**차고(푸터 없음)**: 화면 밖 숨은 목록(`<!--@pages-->`)에 모든 페이지 링크 — 스크립트 없이도, 크롤러도 다른 페이지를 찾는다.

**모바일**: 좁은 화면은 햄버거 메뉴(같은 링크 목록, Escape로 닫힘, 포커스 이동 기존 구현). 소리 스위치는 메뉴 밖에 항상 보인다. 작품·보조 페이지 상단의 "← 차고로 돌아가기"는 유지.

## 4. WORKS — 5개 구조

목록 카드(작품마다 같은 칸): 제목 · 장르(KO) · 종류(EN) · 플랫폼 · 상태(ReleaseState 라벨) · 한 줄 소개 · 키아트 · 상세로 가는 카드 전체 링크.
데이터 필드(`projects.ts`): `title`, `taglineKo`, `tagline`, `kind`, `genre`, `platforms`, `releaseState`, `keyArt`, `gallery`, `links`(실제 링크만), `about`, `core`, `features`, `world`, `updates`(출시작만).

| 작품 | 장르 | 플랫폼 | 상태 | 현재 메모 |
|---|---|---|---|---|
| LUNAI | 감정 기록 · 음악 앱 | iOS | IN DEVELOPMENT | 지원·법적 문서가 연결된 유일한 서비스 |
| LIMINAL | 이승과 저승 사이의 상담소 어드벤처 | PC · Mobile | IN DEVELOPMENT | 갤러리 4장(기준 5장 미만) |
| WORM UP! | **내러티브 어드벤처**(교체, §6) | **PC (Steam)** | IN DEVELOPMENT | 러너 정보 전면 교체 |
| LUMIORA | 3D 음악 내러티브 어드벤처 | PC | IN DEVELOPMENT | 갤러리 1장 |
| RUBATO | 타임슬립 음악 미스터리 로맨스 | PC | IN DEVELOPMENT | — |

목록 카드의 WORM UP! 장식("산길 지도 · TRAIL MAP", 배지 200 · 13)은 러너 시절 것이라 C에서 바꾼다.

## 5. 작품 상세 정보 구조

현재(WORKS 2.2, 사용자 승인) 순서를 기준으로 브리프 항목을 맞춘다. 새 섹션은 실제 자료가 있을 때만 나타난다(빈 섹션 없음).

| 브리프 | 현재 섹션 | 결정 |
|---|---|---|
| 01 HERO (키아트 · 이름 · pitch · platform · status · CTA) | HERO + FACTS | 유지. CTA는 실제 링크가 있을 때만(현재 5개 모두 없음 → 버튼 없음, 상태 라벨만) |
| 02 GAMEPLAY (영상/gif) | 없음 | `media` 데이터가 있을 때만 표시. 지금은 영상이 없어 나타나지 않음 |
| 03 WHAT IS THIS (2~4문장) | ABOUT | 유지(현재 3~4문장) |
| 04 CORE EXPERIENCE (3개 이내) | CORE (현재 모두 6개) | **3개로 줄인다**(C). 나머지는 FEATURES로 |
| 05 SCREENSHOT GALLERY (5~10장) | GALLERY | 실제 화면만. LIMINAL 4 · LUMIORA 1은 자료가 생기면 채우고, 억지로 늘리지 않음 |
| 06 CHARACTERS | 없음 | 실제 캐릭터 그림이 있는 작품만(C에서 자료 조사) |
| 07 WORLD | WORLD | 유지 |
| 08 DEVELOPMENT STATUS | 상태 라벨 | 상태 라벨 + 한 줄(날짜 없음) |
| 09 CTA | LINKS | 실제 링크만. "COMING SOON"은 버튼처럼 보이지 않게(C) |
| — | FEATURES · UPDATE NOTES(출시작만) · 다른 작품 이동 | 유지 |

구조화 데이터: 상세마다 `VideoGame`(실제 값만: name, genre, gamePlatform, description, image, publisher EUNGARAGE) + `BreadcrumbList`(J).

## 6. WORM UP! — 구버전 → 신버전

근거: `~/Projects/worm-up/docs/wormup/source/WORM_UP_FULL_SCRIPT_v6_FINAL_*.txt`, `steam/package.json`("WORM UP! — A WORM'S LIFE (Steam narrative adventure)").

| 항목 | 지금(러너) | 바꿀 값 |
|---|---|---|
| kind (EN) | Mobile Runner / Action | Narrative Adventure |
| genre (KO) | 횡스크롤 등산 러너 | 내러티브 어드벤처 |
| platforms | iOS | PC (Steam) |
| releaseState | IN DEVELOPMENT | IN DEVELOPMENT (실제 상태: Steam판 제작 중) |
| 부제 (taglineKo) | 작은 몸으로 200개의 스테이지를 오른다. | 봄은 모두에게 같은 날 오지 않았다 |
| 핵심 문장 | — | 지렁이는 계속 앞으로 간다. — HERO 한 곳에서만 |
| tagline (EN) | A little worm, two hundred stages uphill. | C에서 번역안 제시 후 확인 |
| about | 납치된 여자친구 · 200 스테이지 · 보스 13 | 정본 기준 2~4문장(C에서 초안 → 보고) |
| core (≤3) | 탭 러너 · 200 스테이지 · 보스 13 · 동료 9 · 꾸미기 · 주간 도전 | 정본의 실제 구현(장(章)마다 의미가 바뀌는 "앞으로 가기" · 삶과 연결된 놀이 · 살지 않은 인생 굴)에서 3개 |
| features | 러너 목록 5줄 | 정본 기준으로 교체 |
| gallery | 러너 그림 5장 | Steam판 실제 화면(빌드 캡처)에서 고름 |
| links | COMING SOON | 없음(Steam 상점 페이지 없음, WISHLIST 금지) |
| 목록 카드 장식 | 산길 지도 · 200 · 13 | Steam판에 맞게 |
| 스튜디오 페이지 | Mobile Runner / Action | Narrative Adventure |
| PC 화면 · 메타 설명 · OG | 러너 문구 | 같은 데이터에서 자동 반영 |
| 키아트 · 차고 벽 포스터 | 러너 시절 키아트(산길 오르는 지렁이) | **확인 필요**: Steam판 키아트가 있는지 C에서 조사. 없으면 Steam판 실제 장면으로 대체하거나 `NEW_ASSET_REQUIRED`로 보고 |
| 러너 자료 | 현재 소개에 섞여 있음 | PUBLIC ARCHIVE `Early Prototype`으로 분리(G) |

주의: WORM UP! 프로젝트는 아트 방향(V2/V3)이 사용자 확인 대기 중인 판이 있다. 갤러리에는 사용자가 확정한 화면만 쓰고, 고른 목록을 C 보고에서 확인받는다.

## 7. PUBLIC ARCHIVE / SECRET STORAGE

| | PUBLIC ARCHIVE `/archive.html` | SECRET STORAGE (`#archive`, 차고 책장 뒤) |
|---|---|---|
| 성격 | 공식 기록실 | 차고 뒤에 숨겨 둔 개인 상자 |
| 입장 | 누구나(내비 · 보관 선반 · PC) | 세 게임에서 별을 하나씩 모은 사람(기존 그대로) |
| 내용 | Concept Art · Character · Development · Old Designs · Screenshots · Sound/Visual experiments | 추가 그림 · 초기안 · 폐기안 · 도깨비 메모 · 작은 이스터에그 · 숨은 개발 자료 |
| 원칙 | 실제로 보여줄 수 있는 개발 자료만 | 공개 기록실과 **같은 자료를 반복하지 않음** |

현재 겹침: 비밀 보관소의 폴라로이드가 작품 키아트와 개발 화면(작품 갤러리와 같은 그림)을 보여 준다. 이 개발 화면은 공개 기록실 Development로 옮기고, 비밀 보관소에는 공개되지 않은 것만 남긴다(G).

후보 자료(G에서 한 장씩 판정):
- Concept Art: 작품 키아트 원화(`public/assets/images/artwork/`).
- Character: 크루 5명 재설계 자료(`assets/crew-reboot/redesigned`, `reference`).
- Development: 제작 비교 자료(`public/assets/images/wip/` 6장 중 공개분), 작품별 개발 화면.
- Old Designs: 예전 로고안(`assets/brand-v02/`), 첫 크루 스프라이트(`public/assets/images/dokkaebi/`), WORM UP! 러너 `Early Prototype`.
- Screenshots: 작품별 갤러리로 가는 색인(그림을 복제하지 않고 링크).
- Sound/Visual experiments: 사이트에서 쓰는 곡 듣기, 망원경 하늘 같은 시각 실험.
- Secret Storage 후보: `assets/crew-reboot/legacy`(버려진 안), 링을 뗀 크루 비교(폐기 결정 기록), 도깨비 메모(짧은 글), 기존 오르골 · 기억 상자 · 별 항아리.

## 8. STUDIO

짧게, 기업 비전문 없이. 섹션: ① EUNGARAGE. — CHARACTERS. EMOTIONS. WORLDS. ② WHY GARAGE? 작은 곳에서 직접 만들고 고치고 실험한다 ③ WHY DOKKAEBI? 크루 다섯의 짧은 소개(현재 문장 재사용) ④ WE MAKE (CHARACTERS · EMOTIONS · WORLDS 각 한 줄) ⑤ CURRENT PROJECTS 5개(데이터에서 자동, 상태 라벨 포함) ⑥ 연락 · 프레스 링크. 디자인은 차고와 같은 펠트 · 따뜻한 조명 언어로(H).

## 9. SUPPORT

작품별 허브. 실제 서비스가 있는 것만 실제 FAQ.
- LUNAI: 지금 있는 4항목(계정·로그인 · 음악 생성 · 친구방과 공유 · 개인정보와 탈퇴) + 문의 시 보낼 정보 + 법적 문서 링크. 내용은 보존하고 디자인만 바꾼다(H).
- LIMINAL · WORM UP! · LUMIORA · RUBATO: 출시 전이라 지원 항목 없음 → 한 줄과 CONTACT 링크.
- Known Issues: 관리할 실제 목록이 없으므로 만들지 않는다(가짜 상태 정보 금지).

## 10. CONTACT (B에서 구현)

`/contact.html`. 네 종류, 각 메일 제목 자동: GAME SUPPORT `[지원]`(먼저 `/support.html` 안내) · BUSINESS `[비즈니스]` · PRESS `[언론]`(H에서 프레스킷 링크 추가) · OTHER `[안녕하세요]`. 서버 폼 없음, mailto만. 이메일 주소는 이미 전 페이지에 공개돼 있어 숨기지 않는다(스팸 위험은 알려진 상태로 둔다).

## 11. PRESS (H)

EUNGARAGE 소개(실제 사실만: 이름 · 서울 · 연락처), 로고(`public/assets/images/brand/`), 작품별: 이름 · 장르 · 플랫폼 · 상태 · 짧은 소개 · 키아트 · 스크린샷(원본 크기 다운로드), 언론 연락. 출시일 · 평가 · 인용문은 실제로 없으니 넣지 않는다.

## 12. 404 (문구 B, 화면 H)

"여긴 아직 만들어지지 않은 방이에요." + 차고로 돌아가기 · WORKS · 문의. noindex. 차고 문 그림을 쓰는 화면은 H(기존 골목·셔터 그림으로, 새 이미지 없이 시도).

## 13. INTERACTION MAP — 차고에서 각 정보로

| 물건 | 지금 | 바꿀 것 | 단계 |
|---|---|---|---|
| PC | 작품 5개 목록 → 상세 | EUNGARAGE OS: 작품 5 + ARCHIVE(→ `/archive.html`) + MAIL(→ `/contact.html`) + TRASH(짧은 도깨비 한마디) | D |
| 포스터 4 + TV 위 액자 | 작품 포스터 → 상세 | 그대로. LIMINAL 포스터에 LIMINAL 분위기 연출 후보 | D |
| TV | 뉴스 · CAM · 티저 1 · 연락처 · 무신호 | data-driven 채널: 뉴스 · CAM · 작품 5개 슬라이드(실제 이미지, 나중에 영상으로 교체 가능) · 연락처 · 무신호 | D |
| 라디오 | GARAGE · NIGHT · NEWS · STATIC | 작품 채널은 UI만, 공식 음악 없으면 `TAPE NOT FOUND` | F |
| 보관 선반 | 실제 작품 물건 진열 | + "기록실 전체 보기 → `/archive.html`" | G |
| 기록 서랍 | 문서 한 장 | LIMINAL 사건 파일 한 장(실제 사건명) — LIMINAL 분위기 위치 후보 | D |
| 택배 | 무작위 물건 | WHAT'S NEW는 실제 소식 데이터가 있을 때만 끼워 넣음. 지금은 물건 그대로(가짜 소식 금지) | D |
| 비밀문 | 별 3개로 비밀 보관소 | 그대로(DECISIONS #4) | — |
| 바깥 문 | 놀이터 | 그대로 | — |
| 냉장고 · 작업대 · 크루 | 생활감 · WIP · 반응 | 그대로(E에서 행동 체인 점검) | E |
| 골목 우편함(그림 속) | 장식 | 문의 입구 후보(→ `/contact.html`) | D |
| 첫 방문 | 단서 없음 | 골목에 정체성 한 줄(우선순위 A), 차고 첫 진입 1회 안내 · 모바일 발견성(우선순위 B) | D |

## 14. ANALYTICS — 이벤트 스키마만 (도입 없음)

외부 도구 없이 설계만. 나중에 사용자가 도구를 고르면 이 이름으로 연결한다.

| 이벤트 | 언제 | 속성 |
|---|---|---|
| `garage_enter` | ENTER 또는 건너뛰기 | `first_visit`, `skipped` |
| `object_open` | 차고 물건을 열 때 | `object` (pc · tv · radio · fridge · parcel · cabinet · shelf · workbench · secret-door · outside-door) |
| `work_open` | 상세 페이지 진입 | `work`, `from` (pc · poster · works · nav · direct) |
| `store_click` | 실제 스토어 링크(생기면) | `work`, `store` |
| `contact_click` | 문의 메일 링크 | `kind` |
| `archive_open` · `storage_unlock` · `star_collect` | 기록실 진입 · 비밀 보관소 해금 · 별 획득 | `game` |

개인 식별 정보는 넣지 않는다.

## 15. SEO 영향 (B)

- sitemap: 빌드에서 생성. `/studio.html`(전에 빠짐) · `/contact.html` 추가, planned 경로는 제외.
- 내비 · 푸터 링크 전부 `/` 절대경로 → 404 페이지가 깊은 주소에서 열려도 링크가 깨지지 않음.
- 404 noindex 추가. canonical 변화 없음.
- 다음(J): 작품별 OG 이미지(기존 원화로 1200×630 구성), `VideoGame` · `BreadcrumbList`.
