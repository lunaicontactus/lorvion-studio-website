# SITE UPGRADE — PHASE F REPORT (AUDIO SYSTEM)

브랜치 `site-upgrade` · 라이브 배포 없음. 측정 스크립트: `scratchpad/probe/audio_audit.py`(파일 분석), `audio_runtime.mjs`(런타임), `listen.mjs`(실제 렌더 레벨). 역할 표의 코드 원본: `src/data/audioRoles.ts`.

## AUDIO AUDIT — 저장소의 모든 오디오 37개

ffmpeg가 없어 macOS `afinfo`(형식)·`afconvert`(디코드)와 numpy로 측정했다. LUFS = BS.1770-4 integrated(K-weighting + gating), peak = 디코드 후 샘플 peak(AAC 디코드라 +1.8 dBFS까지 나옴), tonal = 1 − 장기 스펙트럼 평탄도(음정이 뚜렷할수록 1), hf = 2 kHz 위 에너지 비율. **파일명이 아니라 이 값과 런타임 사용처로 역할을 정했다.**

| 역할 | 개수 |
|---|---|
| AMBIENT | 2 |
| MUSIC | 9 |
| SFX | 21 |
| UI | 4 |
| UNUSED | 1 |
| UNKNOWN | 0 |

전부 AAC 48 kHz(달리기 3개만 mono). 동일 PCM 0쌍, 유사 1쌍(radio_static ≈ radio_tune, 상관 0.995 — 같은 녹음에서 나옴).

| 파일 | 크기 | 길이 | 형식 | LUFS | peak dBFS | tonal / hf | loop | 역할 | 사용 위치 | 중복 |
|---|---|---|---|---|---|---|---|---|---|---|
| `ambience/alley.m4a` | 128 KB | 10.28s | AAC 48k 2ch | -17.2 | -6.4 | 0.52 / 0.93 | loop | **AMBIENT** | the alley, from ENTER until the shutter is up | – |
| `ambience/playground_night.m4a` | 330 KB | 27.00s | AAC 48k 2ch | -11.9 | -2.2 | 0.77 / 0.96 | loop | **AMBIENT** | outside, under the playground song (night insects) | – |
| `ambient.m4a` | 1495 KB | 122.48s | AAC 48k 2ch | -14.4 | -0.6 | 0.96 / 0.03 | loop | **MUSIC** | radio NIGHT 91.7 — a song despite its name (tonal 0.96, hf 0.03) | – |
| `music/archive.m4a` | 1922 KB | 157.00s | AAC 48k 2ch | -16.8 | -3.9 | 0.97 / 0.01 | loop | **MUSIC** | the secret storage | – |
| `music/garage.m4a` | 1614 KB | 133.50s | AAC 48k 2ch | -16.3 | -3.6 | 0.93 / 0.03 | loop | **MUSIC** | the garage's own song; radio GARAGE 88.1 | – |
| `music/music_box.m4a` | 154 KB | 10.00s | AAC 48k 2ch | -11.3 | +0.3 | 0.69 / 0.23 | loop | **MUSIC** | the archive's music box; takes the slot from the archive song while it plays | – |
| `music/parcel.m4a` | 1396 KB | 114.40s | AAC 48k 2ch | -15.5 | -3.0 | 0.75 / 0.17 | loop | **MUSIC** | game: parcel | – |
| `music/playground.m4a` | 1380 KB | 113.40s | AAC 48k 2ch | -14.2 | +0.5 | 0.80 / 0.15 | loop | **MUSIC** | outside | – |
| `music/poko.m4a` | 1397 KB | 115.00s | AAC 48k 2ch | -16.2 | -3.1 | 0.86 / 0.08 | loop | **MUSIC** | game: mugunghwa | – |
| `music/snack.m4a` | 371 KB | 30.50s | AAC 48k 2ch | -15.3 | -3.9 | 0.80 / 0.16 | loop | **MUSIC** | game: snack | – |
| `sfx/broom.m4a` | 26 KB | 2.00s | AAC 48k 2ch | -13.4 | +1.2 | 0.17 / 0.69 | – | **SFX** | the broom sweeping | – |
| `sfx/crew_step_01.m4a` | 9 KB | 0.48s | AAC 48k 2ch | -31.6 | -13.0 | 0.63 / 0.49 | – | **SFX** | the crew's footsteps (one gate for all of them) | – |
| `sfx/door_open.m4a` | 26 KB | 2.00s | AAC 48k 2ch | -15.7 | +0.5 | 0.47 / 0.38 | – | **SFX** | the outside door, the secret door, the parcel game door | – |
| `sfx/drawer_open.m4a` | 26 KB | 2.00s | AAC 48k 2ch | -15.5 | +1.5 | 0.29 / 0.48 | – | **SFX** | the records cabinet opens | – |
| `sfx/eat.m4a` | 10 KB | 0.66s | AAC 48k 2ch | -12.8 | -1.8 | 0.18 / 0.84 | – | **SFX** | game: sneak, a bite | – |
| `sfx/eat_soft.m4a` | 9 KB | 0.48s | AAC 48k 2ch | -23.8 | -6.3 | 0.21 / 0.90 | – | **SFX** | game: sneak, a small bite | – |
| `sfx/fridge_open.m4a` | 11 KB | 0.60s | AAC 48k 2ch | -30.3 | -8.1 | 0.40 / 0.31 | – | **SFX** | the fridge opens | – |
| `sfx/game_fail.m4a` | 14 KB | 1.00s | AAC 48k 2ch | -16.0 | -2.7 | 0.74 / 0.19 | – | **SFX** | a game lost | – |
| `sfx/game_start.m4a` | 12 KB | 1.00s | AAC 48k 2ch | -26.7 | -3.1 | 0.24 / 0.94 | – | **SFX** | a game starts | – |
| `sfx/lantern.m4a` | 23 KB | 2.00s | AAC 48k 2ch | -28.9 | -5.8 | 0.22 / 0.93 | – | **SFX** | archive lanterns | – |
| `sfx/momo_jump.m4a` | 12 KB | 1.07s | AAC 48k 2ch | -9.6 | -0.6 | 0.32 / 0.48 | – | **SFX** | game: parcel, MOMO jumps | – |
| `sfx/momo_run_1.m4a` | 6 KB | 0.15s | AAC 48k 1ch | -27.4 | -3.1 | 0.59 / 0.27 | – | **SFX** | game: parcel, MOMO running (1 of 3) | – |
| `sfx/momo_run_2.m4a` | 6 KB | 0.11s | AAC 48k 1ch | -23.1 | -3.1 | 0.69 / 0.22 | – | **SFX** | game: parcel, MOMO running (2 of 3) | – |
| `sfx/momo_run_3.m4a` | 6 KB | 0.14s | AAC 48k 1ch | -26.1 | -3.0 | 0.53 / 0.33 | – | **SFX** | game: parcel, MOMO running (3 of 3) | – |
| `sfx/paper.m4a` | 36 KB | 3.00s | AAC 48k 2ch | -22.5 | +1.8 | 0.13 / 0.81 | – | **SFX** | workbench, wall pictures, records, archive papers | – |
| `sfx/pc_click.m4a` | 13 KB | 1.00s | AAC 48k 2ch | -20.6 | -1.5 | 0.57 / 0.41 | – | **UI** | PC desktop icons, back/open; the monitor beep | – |
| `sfx/pc_on.m4a` | 13 KB | 1.00s | AAC 48k 2ch | -9.0 | -0.2 | 0.86 / 0.24 | – | **UI** | the PC opens | – |
| `sfx/poko_step.m4a` | 21 KB | 1.20s | AAC 48k 2ch | -27.7 | -4.3 | 0.23 / 0.46 | – | **SFX** | game: sneak, POKO steps | – |
| `sfx/poko_turn.m4a` | 12 KB | 0.62s | AAC 48k 2ch | -13.7 | -0.1 | 0.96 / 0.01 | – | **SFX** | game: sneak, POKO turns round (the cue) | – |
| `sfx/radio_static.m4a` | 29 KB | 2.00s | AAC 48k 2ch | -10.8 | +0.1 | 0.91 / 0.16 | – | **UNUSED** | source of radio_static_bed (scripts/static_bed.py); same recording as radio_tune (correlation 0.995). ARCHIVE | ≈ radio_tune (r 0.995) |
| `sfx/radio_static_bed.m4a` | 249 KB | 21.70s | AAC 48k 2ch | -10.8 | +0.4 | 0.91 / 0.16 | loop | **MUSIC** | radio DOKKA NEWS 96.4 and STATIC 103.2: what the radio plays, so it takes the music slot | – |
| `sfx/radio_tune.m4a` | 24 KB | 2.00s | AAC 48k 2ch | -10.8 | +0.3 | 0.91 / 0.16 | – | **UI** | the radio's knob, off → on, once | ≈ radio_static (r 0.995) |
| `sfx/secret_unlock.m4a` | 24 KB | 2.00s | AAC 48k 2ch | -24.1 | -6.1 | 0.94 / 0.04 | – | **SFX** | the secret door unlocking | – |
| `sfx/shutter_open.m4a` | 24 KB | 2.00s | AAC 48k 2ch | -24.6 | -7.7 | 0.51 / 0.30 | – | **SFX** | the shutter rising at ENTER, and leaving | – |
| `sfx/stall_bell.m4a` | 81 KB | 6.68s | AAC 48k 2ch | -23.1 | -8.1 | 0.57 / 0.92 | – | **SFX** | game: snack, the stall bell | – |
| `sfx/star_get.m4a` | 21 KB | 1.50s | AAC 48k 2ch | -12.3 | +0.1 | 0.72 / 0.35 | – | **SFX** | a star found; a game won | – |
| `sfx/tv_channel.m4a` | 23 KB | 2.00s | AAC 48k 2ch | -17.4 | +0.4 | 0.09 / 0.72 | – | **UI** | the TV opens, a channel changes | – |

판별 근거: 진짜 환경음(alley · playground_night)은 hf 0.93–0.96의 잡음(공기 · 밤벌레)이고, 노래는 전부 hf ≤ 0.17에 tonal 0.75–0.97이다. `ambient.m4a`는 tonal 0.96 · hf 0.03 · 134 BPM 맥동으로 **노래**다. 사이트는 이미 이 파일을 라디오 NIGHT 91.7로만 쓰고 있었다(WORLD 2.4) — 역할은 MUSIC으로 기록하고, "room tone"이라고 적혀 있던 `radio.ts` 주석을 고쳤다. 파일명은 바꾸지 않았다(import 유지, 논리 매핑으로 해결).

## 소리가 나는 지점 (트리거 지도)

| 지점 | 트리거 | 파일 | 버스 | 레벨(요청 × trim) | loop | 멈춤 | 동시 재생 |
|---|---|---|---|---|---|---|---|
| 골목 | ENTER(소리 켜짐) | ambience/alley | AMBIENT | 0.30 | ○ | 셔터 올라가면 페이드 | 셔터음 |
| ENTER | 셔터가 올라갈 때 · 나갈 때 | sfx/shutter_open | SFX | 0.34 × 1.8 | – | 1회 | 골목 공기 |
| 차고 | 들어온 뒤 | music/garage | MUSIC | 0.34 | ○ | 라디오 켜짐 · 밖으로 · 음소거 · 탭 숨김 | SFX/UI |
| PC | 열기 | sfx/pc_on | UI | 0.30 × 0.41 | – | 1회 | 음악 |
| PC | 아이콘 · 뒤로 · 열기 클릭 | sfx/pc_click | UI | 0.20–0.22 | – | 1회 | 음악 |
| PC | 모니터 삑(환경 이벤트) | sfx/pc_click | UI | 0.12 | – | 1회 | 음악 |
| TV | 열기 · 채널 | sfx/tv_channel | UI | 0.28 / 0.22 | – | 1회 | 음악 |
| 라디오 | 꺼짐 → 켜짐 1회 | sfx/radio_tune | UI | 0.22 × 0.73 | – | 1회 | 방송국 |
| 라디오 | 88.1 / 91.7 / 96.4 / 103.2 | garage / ambient / static_bed / static_bed | MUSIC | 0.34 / 0.38 × 0.72 / 0.08 / 0.15 | ○ | 끄기 → 차고 노래 복귀 | SFX/UI |
| 냉장고 | 열기 | sfx/fridge_open | SFX | 0.36 × 3.8 | – | 1회 | 음악 |
| 기록 서랍 | 열기 | sfx/drawer_open | SFX | 0.30 | – | 1회 | 음악 |
| 서랍 서류 · 벽 그림 · 작업대 · 사건 파일 | 꺼내기 | sfx/paper | SFX | 0.16–0.24 | – | 1회 | 음악 |
| 바깥 문 · 비밀문 | 열기 | sfx/door_open | SFX | 0.30 / 0.24 | – | 1회 | 음악 |
| 비밀문 | 별 3개 → 열림 | sfx/secret_unlock | SFX | 0.40 | – | 1회 | — |
| 별 | 찾음 | sfx/star_get | SFX | 0.16–0.22 | – | 1회 | 음악 |
| 택배 | (택배 자체 소리 없음 — 결정 유지) | — | — | — | — | — | — |
| 도깨비 | 걸음(한 개의 게이트, 화면 밖은 무음) | sfx/crew_step_01 | SFX | 0.12 | – | 걸음마다 | 2명 걸어도 "약간 더"만 |
| 빗자루 | 쓸 때 | sfx/broom | SFX | 0.12 | – | 1회 | — |
| 밖(놀이터) | 문 지나 | music/playground + ambience/playground_night | MUSIC + AMBIENT | 0.30 / 0.30 × 0.39 | ○ | 돌아오면 페이드 | 서로(음악 1 + 환경 1) |
| 비밀 창고 | 들어감 | music/archive | MUSIC | 0.26 | ○ | 나가면 페이드 | — |
| 비밀 창고 | 등불 · 종이 | sfx/lantern · paper | SFX | 0.28–0.30 × 2.6 · 0.2 | – | 1회 | 창고 음악 |
| 비밀 창고 | 오르골 열기 | music/music_box | MUSIC | 0.34 × 0.47 | ○ | 닫으면 → 창고 음악 복귀 | **창고 음악과 교대(이번 수정)** |
| 미니게임 | 시작 · 실패 · 별 | sfx/game_start · game_fail · star_get | SFX | 0.30 × 2.7 · 0.20–0.30 · 0.36 | – | 1회 | 게임 음악 |
| 미니게임 | 게임별 곡 | music/poko · snack · parcel | MUSIC | 0.24 | ○ | 게임 끝 | 게임 SFX |
| 미니게임 | 게임 SFX(먹기 · POKO · MOMO · 종) | eat · eat_soft · poko_turn · poko_step · momo_jump · momo_run_1–3 · stall_bell · door_open | SFX | 0.12–0.5 | – | 1회 | 게임 음악(POKO 돌아보기만 1.4초 덕킹) |

호버 소리는 어디에도 없다(PC 소리는 모두 클릭). 페이지 이동(WORKS 상세 · CONTACT 등)은 전부 전체 페이지 이동이라 소리는 페이지와 함께 끝난다(테스트로 확인).

## ROOT CAUSE FINDINGS

| # | 발견 | 증거 | 처리 |
|---|---|---|---|
| 1 | **iOS Safari에서 모든 레벨 · 페이드 · 덕킹이 무효** | 모든 레벨이 `HTMLMediaElement.volume`으로만 설정됨 — iOS는 이 값을 무시(읽으면 항상 1) | 4버스 믹서로 Web Audio 경유(아래). 데스크톱은 동작 동일 |
| 2 | **두 곡 동시 재생: 오르골 + 창고 음악** | `world.ts`: 오르골을 열면 창고 음악을 0.3으로만 낮추고 오르골 루프를 그 위에 재생. 오르골은 측정상 사이트에서 가장 큰 곡(M −16 LUFS) | 오르골 = MUSIC. 창고 음악은 나갔다가 닫으면 그 자리부터 복귀(`holdWorld`) |
| 3 | 효과음이 음악보다 튀거나 묻힘 | file-based reference(파일의 BS.1770 momentary × 코드 요청 volume, 브라우저 출력 아님): PC 전원 음악보다 +5 dB, 오르골 +6–9 dB, MOMO 점프 +6 dB, 냉장고 −15 dB(거의 안 들림), 등불 −11 dB, 게임 시작 −10 dB | 파일별 runtime trim(재인코딩 0) + SFX 버스 −2 dB |
| 4 | 밖의 환경음이 밖의 음악보다 큼 | playground_night −22.4 vs playground 음악 −24.7 LUFS | 환경음 trim 0.39(음악 아래 약 6 dB) |
| 5 | 라디오 STATIC이 노래보다 시끄러움 | browser-rendered: 노래 방송국 약 −28 dBFS RMS, STATIC 약 −23 | 0.2 → 0.15 |
| 6 | "ambient" 이름의 파일이 실제로는 음악 | tonal 0.96 · hf 0.03 · 134 BPM | 이미 라디오 전용 — 역할 MUSIC 기록, 주석 수정 |
| 7 | 같은 클립의 이중 트리거 방지 장치 없음 | `play()`는 같은 엘리먼트를 다시 처음부터 재생할 뿐 | 같은 클립 80 ms 안 재호출 무시, 짧은 소리 동시 4개 제한 |
| 9 | **패널 · 게임 아래에서 도깨비 발소리** (GitHub 러너에서 발견, PHASE F 이전부터) | 러너 run 37120592388 `delivery.spec:66`: 택배 게임 중 `crew_step` 재생. 차고가 "paused"여도 걷던 도깨비는 자기 틱으로 걸음을 끝내고 발소리 게이트를 통과했다. PHASE E의 걷기 사슬로 게임 첫 몇 초에 걸릴 확률이 커짐 | 차고가 paused면 발소리 없음(`garage.ts`). e2e 추가: 걷는 중 패널을 열면 4초간 발소리 0 |
| 10 | 동시 4개 제한이 멈춘 클립에 갇힐 수 있음(이번 PHASE에서 만든 약점) | 제한이 `!paused && !ended`로 "울리는 중"을 셌다 — 브라우저가 멈춘 클립은 `ended`가 오지 않아 슬롯을 영원히 차지할 수 있다. 9번 수정 후 `living.spec` 발소리 테스트가 11회 중 2회 "30초간 발소리 0"으로 실패. 원인이 이것이라고 증명하지는 못함(수정 전 커밋도 같은 제한으로 8/8 통과, 단독 재현 8회 모두 발소리 있음) | "시작 후 자기 길이 이내"로만 세도록 변경 → 같은 테스트 12/12 |
| 8 | 미사용 파일 1개 | `sfx/radio_static.m4a` — src 참조 0, 스크립트(static_bed.py) 원본 | 삭제하지 않고 목록만 |

**문제가 아니었던 것(기존 구조가 이미 지키고 있음, 실측):** 제스처 전 재생 0 · AudioContext 1개 · 패널 5회 재오픈에 플레이어 증가 0 · 라디오 켜고 끄기 반복에도 음악 1곡 · 탭 숨김 시 무음/복귀 시 같은 곡 · 음소거 중 새 재생 0 · 콘솔 오류 0. 전면 재작성은 하지 않았다.

## AUDIO ARCHITECTURE

```
MASTER (GainNode, 음소거 = 컨텍스트 suspend)
├─ AMBIENT  1.0   골목 공기 · 밖의 밤벌레
├─ MUSIC    1.0   한 번에 한 곡: 차고 노래 · 라디오 · 밖 · 창고 · 오르골 · 게임 곡
├─ SFX      0.8   방의 물건 · 크루 · 게임
└─ UI       1.0   PC · TV · 라디오 손잡이
```

- `src/systems/mixer.ts`(신규): 엘리먼트 → 자기 gain → 버스 → master. 사이트의 AudioContext(소리를 켤 때 1개)가 생기면 그때까지 만든 모든 엘리먼트를 연결.
- 플레이어는 여전히 HTMLAudioElement(기존 `AudioManager` 유지). 데스크톱 Chromium · WebKit에서 `volume`이 Web Audio 앞단에 적용됨을 실측(0.1 → −20 dB)했으므로 데스크톱에서는 엘리먼트 레벨을 그대로 두고, 엘리먼트 gain은 1을 넘는 부분(trim 증폭)만 담당. `volume`이 무시되는 환경(iOS)에서는 엘리먼트 gain이 레벨 전체를 담당.
- 컨텍스트가 없을 때(소리 꺼짐 · Web Audio 없음): 엘리먼트 volume에 버스 × master를 곱해 적용.
- 음악 배타성: 기존 `musicOwner`(한 소유자) + `switchTo`(나가는 곡 페이드아웃 후 들어오는 곡) 그대로. 오르골만 예외였던 것을 `holdWorld`로 편입.

## RADIO

| | 결과 |
|---|---|
| POWER ON/OFF | 켜기: 손잡이 소리 1회 → 차고 노래 페이드아웃 → 방송국. 끄기: 방송국 페이드아웃 → 차고 노래가 멈췄던 자리부터 |
| 방송국 | 88.1 GARAGE(차고 노래) · 91.7 NIGHT(ambient.m4a) · 96.4 NEWS(잡음 + 사연 글) · 103.2 STATIC. 게임 곡을 임의 배정한 방송국 없음 |
| 음악 배타성 | 0.1초 간격 측정에서 최대 1곡(라디오 켜기 · 방송국 4개 순회 · 끄기) |
| 패널 닫기 | 음악은 계속(차고 안의 라디오). 다시 열면 새 플레이어 없이 현재 상태를 표시 — 5회 반복에 플레이어 증가 0~2(방송국용 1회 생성분) |
| 상태 저장 | `radioOn` · `radioStation`은 LocalStorage(기존). 소리 스위치는 `soundEnabled`(기존) |

## MUTE

사이트의 소리 스위치 = MASTER. 꺼지면 모든 플레이어 정지 + AudioContext suspend + `play()` 차단. 음소거 중 PC · TV · 냉장고 · 라디오 · 서랍을 열어도 새 재생 0, 컨텍스트 `suspended`(실측). 다시 켜면 켜져 있던 방송국이 그대로 돌아옴(라디오 상태는 파괴하지 않음). 새 설정 화면은 만들지 않았다.

## LOADING — PHASE E → F

| | E | F |
|---|---|---|
| 첫 화면 오디오 요청 | 0 | 0 |
| 소리 꺼짐, ENTER 후 30초 | 0 | 0 |
| 소리 켜짐, ENTER 후 30초 | 5개 · 1.75 MB | 5개 · 1.75 MB |
| 전체 요청(ENTER 후 30초) | 355–356 | 356–359(크루 입장 시점 차이) |

라디오 곡은 라디오를 켤 때, 창고 음악은 비밀문 앞에서(의도 시), 게임 곡은 게임 앞에서만 받는다(기존 lazy 구조 유지).

## LOUDNESS — 측정 방식과 조정

두 측정은 방법이 다르므로 **서로 빼서 "몇 dB 개선"으로 읽지 않는다.**

- **PHASE E 레벨 — file-based reference.** 파일을 디코드해 BS.1770 momentary 최대값을 재고, 코드가 요청하는 volume을 곱해 계산한 값. 브라우저 출력이 아니다. 무엇을 조정할지 정하는 기준으로만 썼다.
- **PHASE F — browser-rendered runtime balance.** 실제 Chromium이 렌더한 출력을 버스별 분석기로 50 ms마다 잰 값(RMS). 지금 균형이 안전한지 확인하는 용도로만 쓴다.

### 조정 내용 (원본 재인코딩 0, 런타임 trim)

| 파일 | file-based reference에서 본 문제(PHASE E 레벨) | trim |
|---|---|---|
| sfx/pc_on | 차고 노래보다 약 5 dB 큼 | ×0.41 |
| sfx/radio_tune | 노래와 비슷 — UI로는 큼 | ×0.73 |
| sfx/fridge_open | 노래보다 약 15 dB 작음(거의 안 들림) | ×3.8 |
| sfx/lantern | 창고 음악보다 약 11 dB 작음 | ×2.6 |
| sfx/game_start | 게임 음악보다 약 10 dB 작음 | ×2.7 |
| sfx/shutter_open | 골목 공기보다 약 7 dB 작음 | ×1.8 |
| sfx/momo_jump | 게임 음악보다 약 6 dB 큼 | ×0.59 |
| sfx/poko_turn | 신호음 + 덕킹으로 약 5 dB 큼 | ×0.76 |
| music/music_box | 다른 곡보다 6–9 dB 큼 | ×0.47 |
| ambient.m4a(NIGHT) | 차고 노래보다 약 3 dB 큼 | ×0.72 |
| ambience/playground_night | 밖 음악보다 큼 | ×0.39 |
| 라디오 STATIC | (browser-rendered) 노래 방송국보다 큼 | 0.2 → 0.15 |
| SFX 버스 | (browser-rendered) 물건 소리가 노래 위로 7–9 dB | 버스 0.8 |

### PHASE F 런타임 균형 (browser-rendered, 현재 상태 확인용)

SFX/UI 버스 피크 − 차고 노래의 평균 레벨(MUSIC 버스, 처음 30초):

| | 값 |
|---|---|
| PC(UI) | +1.9 dB |
| TV(UI) | +2.9 dB |
| 냉장고(SFX) | +5.7 dB |
| 캐비닛(SFX) | +5.3 dB |

마스터 출력만으로 재면 노래 자체의 강약(45–50초 부근 조용한 구간)이 섞여 값이 흔들리므로, 효과음은 버스별로 따로 쟀다. 원본 파일을 정규화할 필요는 없었다. 최종 판단은 HUMAN LISTENING.

## LOOP — SOURCE ISSUE (이번에 편집하지 않음)

| 파일 | 문제 |
|---|---|
| `ambient.m4a`(NIGHT) | **SOURCE ISSUE.** 끝 약 0.43초 무음(−71 dB) 후 처음(−11.8 dB)으로 바로 — 122초마다 끊겼다가 hard restart. 루프용이 아니라 끝이 있는 곡. 자르거나 재인코딩하지 않았다. **LISTEN B에서 반복점이 분명히 거슬리면 `REQUIRED AUDIO FIX`로 승격**(루프용 NIGHT 곡 또는 반복점 편집, 사용자 결정) |
| `music/archive.m4a` | 이음매 샘플 점프가 주변의 6.4배(−15 dB 구간) — 약한 클릭 가능성 |
| `ambience/alley.m4a` | 이음매 점프 4.9배지만 −27 dB의 조용한 잡음 — 들릴 가능성 낮음 |
| 공통 | 브라우저의 AAC 루프는 인코더 프라이밍 때문에 완전 gapless가 아님(형식의 한계) |

나머지 루프(garage · playground · poko · snack · parcel · music_box · playground_night · static_bed)는 이음매 레벨 차 ≤ 3 dB, 점프 ≤ 2.3배.

## UNUSED AUDIO (삭제하지 않음)

| 파일 | 분류 | 이유 |
|---|---|---|
| `sfx/radio_static.m4a` | ARCHIVE | 런타임 참조 0. `scripts/static_bed.py`가 radio_static_bed를 만드는 원본. radio_tune과 같은 녹음 |

SAFE TO REMOVE 0 · UNKNOWN 0.

## NEW_AUDIO_REQUIRED

**REQUIRED: 0.** 잘못된 파일을 대체해야 하는 자리는 없고, 모든 상호작용에 맞는 기존 소리가 있다.

**OPTIONAL**

| 파일 | 역할 | 길이 | loop | 사용 위치 | 질감 | 레벨 성격 |
|---|---|---|---|---|---|---|
| `ambience/garage_room.m4a` | AMBIENT | 30–60초 | ○ | 차고 안(지금은 차고 자체 환경음이 없음, WORLD 2.4 결정) | 아주 약한 방 공기 · 먼 냉장고 험 · 멜로디/리듬 없음 | 음악보다 10 dB 이상 아래 |
| `music/night_loop.m4a` | MUSIC | 2–3분 | ○(끝과 처음이 이어지게) | 라디오 NIGHT 91.7 대체 | 지금 곡의 분위기, 끝 무음 없이 | 차고 노래와 같은 LUFS |
| `sfx/fridge_close.m4a` | SFX | 0.5–1초 | – | 냉장고 닫기 | 부드러운 고무 패킹 닫힘 | 문 열기와 같은 수준 |
| `sfx/drawer_close.m4a` | SFX | 0.5–1초 | – | 서랍 닫기 | 나무 서랍 밀어 넣기 | 열기보다 약간 작게 |
| `sfx/parcel_open.m4a` | SFX | 0.5–1초 | – | 택배 열기(지금 무음 — 결정 유지 중) | 종이 상자 테이프 | 종이 소리 수준 |

게임별 공식 곡(LUNAI · LIMINAL · WORM UP! · LUMIORA · RUBATO)은 공식 곡이 생기기 전까지 목록에 올리지 않는다.

## REAL BROWSER — 시나리오 A–D

사람의 귀 대신, 실제 Chromium이 렌더하는 출력을 버스별 분석기로 50 ms마다 기록했다(`listen.mjs`). 이것은 자동 측정이다. **음색 · "음악처럼 들리는가" · 거슬림의 판단은 HUMAN LISTENING REQUIRED**(아래 체크리스트).

| 시나리오 | 측정 결과 |
|---|---|
| A 진입 → ENTER → 30초 → 라디오 ON → 방송국 변경 → PC → TV → 냉장고 → 서랍 → 라디오 OFF | 음악 동시 최대 1곡(0.05초 간격). 차고 안 AMBIENT 버스 무음(차고 자체 환경음 없음 — 음악처럼 들리는 환경음 없음). 효과음은 노래 평균보다 UI +2–3 dB · SFX +5–6 dB(browser-rendered, 현재 균형 확인용) |
| B 음소거 → PC · TV · 냉장고 · 라디오 · 서랍 | 새 재생 0, 컨텍스트 suspended, 렌더 0 |
| C 라디오 ON → 닫기 → 열기 → 방송국 변경 × 5 | 플레이어 누적 없음, 방송국마다 레벨 일정(누적 증가 없음), 항상 1곡 |
| D 터치(휴대폰 에뮬레이션) | ENTER 탭 전 재생 0, 소리 스위치를 켜도 골목에서 재생 0, 이후 모든 재생이 탭에서 시작 |

## WebKit (데스크톱) — 별도 기록

`?audiodebug`로 확인: 4버스 연결됨(routed) · AudioContext running · 차고 노래 → 라디오 NIGHT 전환에서 음악 1곡 · 음소거 시 컨텍스트 suspended · 음악 0 · 콘솔 오류 0.

## DEVICE QA REQUIRED — iPhone Safari

이 환경에서는 실기기를 쓸 수 없다(Xcode 없음). BLOCKER가 아니다. iPhone Safari에서 확인할 것:
1. 효과음과 음악의 크기 차이가 데스크톱과 비슷한가(전에는 iOS가 volume을 무시해 모두 최대 크기였다).
2. 라디오 켜기/끄기 · 방송국 바꾸기 때 페이드가 있는가(갑자기 끊기지 않는가).
3. 음소거가 모든 소리를 끄는가.
4. ENTER 전에 아무 소리도 나지 않는가.

## HUMAN LISTENING CHECKLIST (3–5분)

헤드폰 권장. 데스크톱 브라우저에서 사이트를 열고 오른쪽 위 소리 스위치를 켠다.

**LISTEN A — 기본 차고**
ENTER → 30초 가만히 듣기 → 냉장고 → 캐비닛 → PC → TV
- [ ] 배경에 음악 두 개가 겹쳐 들리지 않는다(차고는 노래 하나 + 효과음뿐)
- [ ] 냉장고 · 캐비닛 소리가 지나치게 크지 않다(들리기는 한다)
- [ ] PC · TV 소리가 음악 위로 튀지 않는다

**LISTEN B — RADIO**
라디오 열기 → 켜기(NIGHT 91.7) → 다른 방송국(예: 88.1) → NIGHT 복귀 → 패널 닫기 → 다시 열기 → 끄기
- [ ] 음악 두 곡이 겹치지 않는다
- [ ] 방송국을 바꾸는 순간 두 곡이 동시에 들리지 않는다
- [ ] 패널을 다시 열어도 음량이 커지지 않는다
- [ ] NIGHT를 2분 넘게 틀어 두었을 때 반복점(약 0.4초 끊김 후 다시 시작)이 거슬리는가 → 거슬리면 `REQUIRED AUDIO FIX`

**LISTEN C — SECRET STORAGE**
별 3개로 비밀문 열기 → 비밀 창고 음악 듣기 → 오르골 열기 → 오르골 닫기
- [ ] 창고 음악과 오르골이 겹치지 않는다
- [ ] 오르골을 닫으면 창고 음악이 멈췄던 자리부터 자연스럽게 돌아온다

**LISTEN D — MUTE**
소리 스위치 끄기 → PC → TV → 냉장고 → 캐비닛 → 라디오
- [ ] 단 하나의 소리도 나지 않는다

결과에 따라서만 코드를 고친다. 결과가 없는 동안은 자동 측정상 안전한 지금 상태를 유지한다.

## TEST

| 순서 | 검사 | 결과 |
|---|---|---|
| 1–12 | targeted: 단위 `test/audio-f.test.ts` 11개(믹서 라우팅 · iOS 경로 · 버스/마스터 gain · 역할 표가 디스크의 37개와 일치 · trim 대상 존재 · 호버 소리 없음 · 방송국에 게임 곡 없음) + e2e `e2e/audio-f.spec.ts` 12개(패널 아래 발소리 0 포함, 제스처 전 무음 · MASTER mute · 음악 최대 1곡(오르골 포함) · 라디오 5회 재오픈 · 이중 트리거/동시 4개 · 버스 소속 · 탭 숨김 · 소리 스위치 기억 · 페이지 이동 정리 · reduced motion과 독립 · 터치 첫 탭 unlock · 콘솔 오류 0) | 단위 312 / 312 · e2e 12 / 12 |
| 2 | 관련 audio/garage e2e(chromium, `8708923`): audio-f · audio · cinematic · archive · outside · sneak · delivery · living · garage-e · garage-d · garage · objects · props | **143 / 143** (27분) |
| 3 | WebKit 확인(버스 · 컨텍스트 · 라디오 · 음소거 · 오류) | 정상 |
| 최종 1차 | GitHub 러너 전체 e2e, run 37120592388 (`ffb095e`) | 362 통과 · 1 실패(`delivery.spec:66`, 위 9번) |
| 수정 후 | 단위 312 / 312 · delivery · audio-f(12개) · living · audio · sneak | 42 / 42 · 발소리 테스트 12회 반복 12 / 12 |
| 최종 2차 | **GitHub 러너 전체 e2e, run 37126843849 (`ea7681c`, verify만 · deploy skipped)** | **364 / 364** (1.1시간) · 단위 312 / 312 |

상태: **READY FOR HUMAN LISTENING** — 위 체크리스트와 iPhone Safari 기기 확인이 남아 있다. PHASE F 완료 판정은 그 뒤.
