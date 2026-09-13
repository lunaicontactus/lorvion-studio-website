# 새 크루 → 사이트 스프라이트

## 런타임 계약 (코드에서 읽은 값, 추측 아님)

| 항목 | 값 | 출처 |
|---|---|---|
| 마스터 캔버스 | 높이 **640**, 폭은 캐릭터마다 다름 | `assets/sprites/*` 실측 |
| 바닥 기준선 | **y = 604** | `scripts/export_sprites.py` `FLOOR_ROW` |
| 출력 프레임 | 높이 **420** webp, 폭 가변 | 같은 파일 `HEIGHT` |
| 경로 | `/assets/images/dokkaebi/<id>/<action>/<dir>/` | `src/data/sprites.ts` `ROOT` |
| 파일명 | `<id>_<action>_<dir>_<NN>.webp` (NN 2자리) | 같은 파일 `frame()` |
| 상태 | `idle walk work sit wave look` | 같은 파일 `DIRS` |
| 방향 | idle·walk = front/back/left/right · work = back/front · sit = front/left/right · wave·look = front | 같은 파일 |
| 프레임 수 | 캐릭터마다 다름 (`SHEETS`) | 같은 파일 |
| idle 재생 | 4프레임을 **1-2-3-4-3-2**로 왕복 | 같은 파일 `IDLE_ORDER` |
| 기본 FPS | idle 3 · walk 9 · work 5 · sit 2 · wave 6 · look 4 | 같은 파일 `BASE_FPS` |
| walk FPS | 캐릭터별 보폭에서 유도된 값. 자유롭게 못 바꿈 | 같은 파일 주석 |
| 프레임 앵커 | 프레임 **아래쪽 가장자리**가 발 위치 | `src/scenes/npc.ts` `place()` |
| 크기 | `frameHeight = graph.height / figureRatio` | 같은 파일 |
| 히트박스 | 몸폭의 0.7, 높이의 0.9 | `src/data/sprites.ts` `HIT_BOX` |
| 데스크톱/모바일 차이 | 에셋은 동일. 상주 인원만 3명/2명 | `src/scenes/garage.ts` `ON_STAGE` |

방향 이름은 직관과 반대로 보일 수 있으나 **기존 계약을 그대로 따랐다.**
원래 렌더러(`scripts/render_sprites.py`)가 `left`를 방위각 90도로 뽑았고, 새 렌더러의
+90도가 같은 그림을 준다. 의미를 고치지 않고 파일만 갈아끼운다.

## 새 파이프라인

1. `scripts/pose_arms.py <in.glb> <out.glb>` — T자에서 팔을 내린다.
   리그가 없으므로 메시를 직접 돌린다. 팔은 어깨 높이에서 옆으로 뻗은 유일한
   덩어리라 규칙으로 고를 수 있다. 회전은 어깨에서만 섞어서(앞 28%) 팔이
   바나나로 휘지 않게 한다.
2. `scripts/render_idle.html` — 브라우저에서 마스터를 렌더한다.
   **카메라와 조명은 다섯이 하나를 공유한다.** 직교 투영, 고정 프러스텀, 고정 3등.
   각 모델은 바운딩박스 높이를 1로 정규화하고 발을 y=0에 놓는다.
3. `scripts/export_sprites.py <char> --src <마스터> --dst <출력> --no-grade --room-light`
   — 잘라내고 줄이고, 방 조명에 맞춘다.
4. `scripts/sprite_qa.py <출력>` — 프레임마다 테두리를 검사한다.

## 방 조명 보정이 필요한 이유

렌더는 중성 스튜디오에서 나오고 차고는 백열등 하나로 켜져 있다. 보정 없이 넣으면
캐릭터만 빛난다. 취향이 아니라 측정값이다 — 보정 전 하이라이트 luma 247.5, 기존
크루 216.1, 초록 채널이 40 높았다. `ROOM_WARM (1.000, 0.930, 0.862)`와
`ROOM_EXPOSURE 0.90`을 곱하면 218.8이 되어 기존 크루와 맞는다.

## 전환 방법

`?newCrew=on` — 기존 크루는 지우지 않았다. `src/systems/flags.ts`의 기본값은 `false`.
회귀가 나오면 플래그 하나로 되돌린다.

**여섯 상태 전부 렌더됐다** (idle walk work sit wave look, 5인 × 60프레임 = 300장).
`glance`는 코드에 없는 상태라 만들지 않았다. 방은 `look`으로 처리한다.

## 상태별 제작 방식

리그가 없으므로 `scripts/render_states.html`이 브라우저에서 정점을 직접 움직인다.
관절은 실제 위치에서 작은 각도로만 돈다. 머리는 어떤 상태에서도 변형하지 않는다.

| 상태 | 방식 | 프레임 |
|---|---|---|
| walk | 다리 ±13도 스윙, 몸통 상하 bob, 롤 1.6도, 팔 9도 반대 스윙 | 4 |
| work | 상체 앞으로, 팔 6도, 고개 작은 bob | 4 |
| sit | **접지 않는다.** 다리 26도만 굽히고 몸 전체를 11.5% 내린다 | 4 |
| wave | 한쪽 팔만 78도 올리고 ±13도 흔든다. 몸은 고정 | 4 |
| look | 목 위만 ±17도 회전 | 4 |

### sit을 다시 설계한 이유

처음에는 다리를 78도 접었다. 측면에서 허벅지가 납작한 판자가 되고 팬티 무늬가
늘어났다 — 지시서가 금지한 "녹아내린" 모습 그대로였다. 프레임이 바닥 행에서 잘린다는
점을 이용하는 편이 낫다: 다리를 거의 굽히지 않고 몸을 내리면 정강이가 바닥선 아래로
사라지고, 남는 것은 낮게 앉은 실루엣이다. 변형이 적을수록 모델이 안전하다.

## 다음에 렌더할 때 주의

`export_sprites.py`는 한 캐릭터의 **모든** png에서 공통 크롭 창을 계산한다. walk·sit을
추가하면 창이 넓어지므로 그때는 idle도 함께 다시 내보내야 한다. `figureRatio`와
`bodyWidth`도 다시 재야 한다(`src/data/sprites.ts`의 `V2`).
