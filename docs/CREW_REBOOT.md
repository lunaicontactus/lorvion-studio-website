# 도깨비 5인 리부트 — 원본 분석과 Meshy 제작 준비

원본: `assets/crew-reboot/source/` — 사용자가 `~/Desktop/dokka crew/`에 넣어둔
T자 턴어라운드 5장. 이 문서와 `assets/crew-reboot/reference/`의 15장이 그 5장에서
나온 것이고, **현재 사이트에 들어가 있는 캐릭터는 기준으로 쓰지 않았다.**

---

## STEP 1 — 원본 분석

### 공통 구조 (5인 전부 동일)

| 항목 | 관측값 |
|---|---|
| 포즈 | T자, 정면/측면/후면 3뷰 |
| 배경 | 크림색 단색 (#F4EAE3 부근), 발밑 접지 그림자 있음 |
| 전신 비율 | 머리 높이가 전신의 약 45%, 2.2등신 |
| 피부 | #E0A375 ~ #EAB283 — **5인 차이 없음** |
| 눈 | 큰 검정 구체, 흰 캐치라이트 2개, 눈 사이 넓음 |
| 볼 | 진한 분홍 원형 블러셔 |
| 코·입 | 아주 작은 분홍 코, 얕은 미소 |
| 귀 | 크고 뾰족한 요정 귀, 옆으로 벌어짐 |
| 뿔 | 이마 위 2개, 광택 있는 진한 빨강 |
| 재질 | 펠트/봉제 인형 표면, 머리는 긴 털 |
| 의상 | 레오파드 무늬 팬티 1종, 색만 다름 |

### 캐릭터별 관측값

| | 머리색 | 색상각 | 명도 | 팬티 | 뿔 |
|---|---|---|---|---|---|
| MOMO | `#F5A391` 살구핑크 | 11° | 0.96 | 핑크 레오파드 | `#CD3232` |
| NUNU | `#C398B5` 라벤더 | 320° | 0.77 | 보라 레오파드 | `#C13928` |
| RUKI | `#AD9F7B` 세이지 | 44° | 0.68 | 올리브 레오파드 | `#BA3229` |
| YOMI | `#F1A866` 골드 | 28° | 0.95 | 노랑 레오파드 | `#C32A24` |
| POKO | `#BA8667` 브라운 | 22° | 0.73 | 브라운 레오파드 | `#C7312D` |

### 측정으로 드러난 문제

**1. 5인이 서로 구분되지 않는다 — 색조 하나로만 나뉜다.**

정면 실루엣 겹침(IoU)을 재보면:

| | momo | nunu | ruki | yomi | poko |
|---|---|---|---|---|---|
| momo | 1.00 | 0.95 | 0.92 | 0.90 | 0.90 |
| nunu | 0.95 | 1.00 | 0.92 | 0.90 | 0.90 |
| ruki | 0.92 | 0.92 | 1.00 | 0.96 | 0.95 |
| yomi | 0.90 | 0.90 | 0.96 | 1.00 | 0.96 |
| poko | 0.90 | 0.90 | 0.95 | 0.96 | 1.00 |

어느 두 명을 골라도 윤곽선이 90~96% 겹친다. 즉 **한 캐릭터의 색만 바꾼 5장**이다.

흑백으로 바꾸면 머리 밝기가 190 / 184 / 174 / 165 / 149 로, MOMO와 YOMI는 차이 6,
NUNU와 RUKI는 차이 8이다. 차고 화면에서 캐릭터는 화면 높이의 1/4 이하로 그려지므로
이 정도 차이는 사실상 같은 캐릭터로 읽힌다.

**2. 후면이 털뭉치다.** 5인 전부 뒷모습이 둥근 털 덩어리 하나이고, 그 외에 읽히는
형태가 없다. 사용자가 금지 항목으로 적은 "뒤에서 보면 털뭉치처럼만 보이는 구조"에
원본이 이미 해당한다.

**3. 뿔이 광택 진빨강이다.** 5인 전부 채도 0.76~0.81, 색상각 0~7°. 작아도 눈에
가장 먼저 띄는 고채도 빨강 두 점이라 "피 묻은 뿔"로 읽힌 원인이 이것이다.

**4. 머리 부피가 크다.** 머리(털 포함)가 전신의 45%, 측면에서는 털이 머리 전체를
삼킨다. 귀여움의 근원이기도 하므로 없애면 안 되고, 줄이되 형태를 줘야 한다.

### Meshy에서 문제가 될 요소

| 요소 | 왜 문제인가 | 대응 |
|---|---|---|
| 긴 털가닥 | 실루엣 경계가 수천 갈래라 메시가 깨지거나 노이즈가 됨 | 털을 "펠트 덩어리" 한 겹으로 단순화, 가닥 표현은 텍스처로 |
| 귀 뿌리가 얇음 | 얇은 접합부는 분리되거나 녹아 붙음 | 귀 뿌리를 두껍게, 머리와 명확히 접합 |
| 뿔이 작고 뾰족 | 작은 돌기는 소실되기 쉬움 | 밑면이 넓은 둥근 원뿔로 |
| 팔이 몸통에 붙음 | T자여도 겨드랑이가 닫히면 한 덩어리가 됨 | 겨드랑이에 명확한 간격 |
| 접지 그림자 | 바닥 그림자를 메시로 오인 | 레퍼런스에서 제거 완료 |
| 팬티 무늬 | 얇은 무늬는 지오메트리로 안 나옴 | 텍스처 전용, 형태는 매끈한 팬티 |

---

## STEP 2 — Meshy용 리디자인 원칙

원본의 얼굴·재질·비율은 **그대로 둔다.** 바꾸는 것은 위 4개 문제뿐이다.

### 전 캐릭터 공통

1. 털 표현을 "부드러운 펠트 한 겹"으로 정리. 가닥 실루엣 금지.
2. 뿔: 밑면이 넓고 끝이 둥근 무광 원뿔. 진빨강 금지, 캐릭터별 파스텔.
3. 머리 부피를 전신의 45% → 약 38%로. 얼굴은 그만큼 더 크게 읽힌다.
4. 귀 뿌리 두껍게, 머리에서 확실히 분리된 형태로.
5. T자 유지, 겨드랑이 간격 확보.
6. 눈은 지금 크기 유지 (작은 화면에서 얼굴이 읽히는 유일한 이유).
7. **뒤에서도 누구인지 알 수 있는 요소를 1인당 최소 1개** 부여.

### 5인 구분 설계

색이 아니라 **형태**로 나눈다. 머리 모양과 소지품을 다르게 해서 실루엣 겹침을
0.90대에서 0.6대까지 떨어뜨리는 것이 목표다.

| | 머리 형태 | 뒤에서 읽히는 요소 | 뿔 | 의상 |
|---|---|---|---|---|
| MOMO | 둥근 돔, 짧게, 정수리에 작은 상투 | 상투와 묶은 끈 | 둥근 혹 2개 · 딸기우유 | 짧은 앞치마 |
| NUNU | 낮고 납작한 더벅, 가장 김 | 어깨에 두른 누비 담요 | 짝 안 맞는 혹 2개 · 라일락 | 담요 |
| RUKI | 짧게 친 머리, 윗면 평평 | 멜빵 끈이 등에서 X자 | 낮고 넓은 혹 2개 · 민트크림 | 멜빵바지 |
| YOMI | 위로 솟은 뾰족 다발 | 사선으로 멘 작은 가방 | 가늘고 둥근 혹 2개 · 살구 | 가방끈 |
| POKO | 중간 길이, 가르마, 펠트 감투 | 감투 | 감투 밑 아주 작은 혹 · 장미 | 감투 · 둥근 안경 |

POKO의 안경은 기존 미니게임 설정(부장님)과 사이트의 CSS 안경을 잇는 요소이므로
유지한다.

---

## 캐릭터별 산출물

### MOMO — 핑크, 밝고 명랑한 메이커

작업대에서 무언가를 만들고 있는 쪽. 다섯 중 가장 먼저 말을 걸고 가장 먼저 손을
흔든다. 정수리에 작게 묶은 상투가 표식이고, 뒤에서도 그 매듭으로 알아본다.
짧은 작업 앞치마를 걸치고 있으나 팬티의 핑크 레오파드는 그대로 보인다.
성격은 밝지만 시끄럽지 않고, 하던 일을 놓지 않는다.

- 대표색 `#F5A391` / 뿔 `#F2A6A0` 딸기우유 / 앞치마 오트밀
- 시각 포인트: 정수리 상투, 앞치마, 5인 중 가장 둥근 머리
- 기준 이미지: `assets/crew-reboot/reference/momo/{front,side,back}.png`

```
A cute Korean dokkaebi plush character, chibi proportions, soft rounded body,
cream felted fabric skin, large expressive glossy black eyes with white catch
lights, round pink blush cheeks, tiny pink nose, gentle closed smile,
oversized pointed elf ears with thick roots, two small rounded matte
strawberry-milk horns with wide bases, short salmon-pink felt hair in a neat
dome with a small top-knot tied at the crown, cozy handmade oatmeal apron,
pink leopard-print briefs, warm pastel palette, stylized game character,
clean silhouette, T-pose, arms clear of the body, plain white background,
no shadow, full body visible, suitable for a casual indie game website.
Negative: horror, monster, creepy, realistic demon, sharp teeth, grotesque
expression, disturbing proportions, dark fantasy, long stringy fur strands,
hair covering the face, thin floating accessories.
```

### NUNU — 라벤더, 졸리고 나른한

큰 쿠션이 자리다. 언제나 막 깬 참이고, 누비 담요를 어깨에 두른 채로 돌아다닌다.
다섯 중 머리가 가장 길고 낮게 눌려 있어서 실루엣이 넓적하다. 담요가 뒤에서 보이는
표식이고, 뿔 두 개의 길이가 서로 조금 다른 것이 이 캐릭터의 농담이다.
서두르는 법이 없고, 그래서 방의 속도를 늦춘다.

- 대표색 `#C398B5` / 뿔 `#D8B4DC` 라일락 / 담요 연회색보라 누비
- 시각 포인트: 어깨 담요, 낮고 넓은 머리, 짝 안 맞는 뿔
- 기준 이미지: `assets/crew-reboot/reference/nunu/{front,side,back}.png`

```
A cute Korean dokkaebi plush character, chibi proportions, soft rounded body,
cream felted fabric skin, large expressive glossy black eyes with white catch
lights, round pink blush cheeks, tiny pink nose, sleepy gentle smile,
oversized pointed elf ears with thick roots, two small rounded matte lilac
horns of slightly different lengths, low flat lavender felt hair sitting
heavily over the ears, a small quilted blanket draped over both shoulders,
purple leopard-print briefs, warm pastel palette, stylized game character,
clean silhouette, T-pose, arms clear of the body, plain white background,
no shadow, full body visible, suitable for a casual indie game website.
Negative: horror, monster, creepy, realistic demon, sharp teeth, grotesque
expression, disturbing proportions, dark fantasy, long stringy fur strands,
hair covering the face, thin floating accessories.
```

### RUKI — 세이지, 기계와 수리 담당

고치는 쪽. 머리를 짧게 쳐서 윗면이 평평하고, 고글을 이마에 올려두고 있다.
멜빵바지의 끈이 등에서 X자로 만나므로 뒤에서 가장 알아보기 쉽다. 일하다 말고
컵라면을 먹는 습관이 있어 자리 옆에 늘 컵이 하나 놓여 있다. 말수가 적다.

- 대표색 `#AD9F7B` / 뿔 `#CFE0C8` 민트크림 / 멜빵 올리브 · 고글 놋쇠
- 시각 포인트: 이마 위 고글, 등의 X자 멜빵, 평평한 머리
- 기준 이미지: `assets/crew-reboot/reference/ruki/{front,side,back}.png`

```
A cute Korean dokkaebi plush character, chibi proportions, soft rounded body,
cream felted fabric skin, large expressive glossy black eyes with white catch
lights, round pink blush cheeks, tiny pink nose, small calm smile, oversized
pointed elf ears with thick roots, two low wide rounded matte mint-cream horns,
cropped sage-green felt hair with a flat top, chunky brass goggles pushed up on
the forehead, cozy handmade olive dungarees with thick straps crossing in an X
on the back, warm pastel palette, stylized game character, clean silhouette,
T-pose, arms clear of the body, plain white background, no shadow, full body
visible, suitable for a casual indie game website.
Negative: horror, monster, creepy, realistic demon, sharp teeth, grotesque
expression, disturbing proportions, dark fantasy, long stringy fur strands,
hair covering the face, thin floating accessories.
```

### YOMI — 골드, 호기심 많은

냉장고를 열어보고 잠긴 문을 들여다보는 쪽. 머리가 위로 솟아 있어서 다섯 중 가장
키가 커 보이고, 실제로는 같다. 작은 가방을 사선으로 메고 다니며 주운 것을 넣는다.
가방끈이 뒤에서 보이는 표식이다. 무엇이든 먼저 만져보고 나중에 생각한다.

- 대표색 `#F1A866` / 뿔 `#F5C9A0` 살구 / 가방 낡은 캔버스
- 시각 포인트: 위로 솟은 머리 다발, 사선 가방끈, 가장 높은 실루엣
- 기준 이미지: `assets/crew-reboot/reference/yomi/{front,side,back}.png`

```
A cute Korean dokkaebi plush character, chibi proportions, soft rounded body,
cream felted fabric skin, large expressive glossy black eyes with white catch
lights, round pink blush cheeks, tiny pink nose, curious open smile, oversized
pointed elf ears with thick roots, two slim rounded matte apricot horns,
golden-yellow felt hair swept upward into a tall pointed tuft, a small worn
canvas satchel on a thick diagonal shoulder strap, yellow leopard-print briefs,
warm pastel palette, stylized game character, clean silhouette, T-pose, arms
clear of the body, plain white background, no shadow, full body visible,
suitable for a casual indie game website.
Negative: horror, monster, creepy, realistic demon, sharp teeth, grotesque
expression, disturbing proportions, dark fantasy, long stringy fur strands,
hair covering the face, thin floating accessories.
```

### POKO — 브라운, 차분하고 따뜻한 부장님

미니게임에서 "부장님"으로 불리는 쪽. 둥근 안경과 펠트 감투가 표식이고, 감투 덕에
뒤에서도 머리 형태가 털뭉치로 뭉개지지 않는다. TV 앞이 자리다. 목소리를 높이는
일이 없고, 누가 사고를 쳐도 먼저 상황을 본다. 뿔은 감투 밑으로 아주 조금만 나온다.

- 대표색 `#BA8667` / 뿔 `#E4A9A4` 장미 / 감투 진갈색 펠트 · 안경 놋쇠 둥근테
- 시각 포인트: 둥근 안경, 펠트 감투, 유일하게 모자 쓴 실루엣
- 기준 이미지: `assets/crew-reboot/reference/poko/{front,side,back}.png`
- 기존 사이트의 CSS 안경과 `poko_boss_glasses.glb`를 잇는 요소이므로 유지

```
A cute Korean dokkaebi plush character, chibi proportions, soft rounded body,
cream felted fabric skin, large expressive glossy black eyes with white catch
lights behind round brass-rimmed glasses, round pink blush cheeks, tiny pink
nose, warm gentle smile, oversized pointed elf ears with thick roots, two very
small rounded matte rose horns peeking from under the hat, medium brown felt
hair with a side parting, a small dark-brown felt Korean gamtu cap, cozy
handmade look, brown leopard-print briefs, warm pastel palette, stylized game
character, clean silhouette, T-pose, arms clear of the body, plain white
background, no shadow, full body visible, suitable for a casual indie game
website.
Negative: horror, monster, creepy, realistic demon, sharp teeth, grotesque
expression, disturbing proportions, dark fantasy, long stringy fur strands,
hair covering the face, thin floating accessories.
```

---

## STEP 3 — 기준 이미지 세트 (완료)

`assets/crew-reboot/reference/<이름>/`

| 파일 | 내용 |
|---|---|
| `front.png` `side.png` `back.png` | 1024×1024, 흰 배경, 그림자 제거 |
| `*_alpha.png` | 같은 것의 투명 배경판 |

처리 내용: 3뷰 분리 → 배경을 테두리에서만 자라는 플러드 필로 제거(살색을 배경으로
오인하지 않게) → 접지 그림자 제거 → 캐릭터별 한 배율(정면 기준)로 정규화 →
전원 동일한 바닥선(캔버스 94%)에 정렬 → 중앙 배치.

전체 대조표: `assets/crew-reboot/reference/_contact_sheet.png`

**주의: 이 15장은 원본 그대로다.** STEP 2의 리디자인(상투·담요·멜빵·가방·감투,
뿔 색, 머리 부피)은 아직 반영되어 있지 않다. 반영하려면 이미지를 새로 만들어야
하고 그것은 크레딧을 쓴다. 아래 참조.

## STEP 4 — Meshy 생성 기준

| 항목 | 값 | 이유 |
|---|---|---|
| 도구 | `multi_image_to_3d` | 정면/측면/후면 3장을 함께 넣어야 뒤통수가 추측이 아니게 됨 |
| 모델 | `meshy-7` (= latest) | 캐릭터 형태 정확도가 meshy-5와 확연히 다름 |
| `pose_mode` | `t-pose` | 리깅 예정이므로 T자 |
| `should_texture` | true | |
| `texture_resolution` | `2k` | 차고에서 210px로 그려지므로 4k/8k는 낭비 |
| `enable_pbr` | false | 무광 펠트에 금속/러프니스 맵이 필요 없음 |
| `remove_lighting` | true | 레퍼런스의 스튜디오 조명을 텍스처에 굽지 않기 위해 |
| `topology` | `quad` | 리깅과 변형에 유리 |
| `target_polycount` | 20,000 | 웹에서 5인을 띄우는 상한 |
| `target_formats` | `["glb"]` | 사이트가 쓰는 것만 |
| `should_remesh` | true | |
| `origin_at` | `bottom` | 발밑이 원점이어야 바닥에 세우기 쉬움 |

비용: 캐릭터당 30 크레딧(meshy-7 + 텍스처). 5인 = **150 크레딧**. 현재 잔액 828.

### 생성 후 정리 기준

- 스케일 통일: 5인 전부 발바닥에서 정수리까지 동일 높이로 맞춘 뒤 export
- 정면 방향 통일: +Z가 정면
- pivot: 두 발 사이 바닥면
- 파일명: `poko.glb` 처럼 소문자 이름
- 표정 없는 neutral, T자 유지본을 원본으로 보관하고 A자는 파생으로

### 사이트 적용 시 주의사항 (공통)

1. 기존 스프라이트 파이프라인(`scripts/export_sprites.py`)은 640px 마스터 PNG를
   전제로 한다. GLB에서 프레임을 렌더해 `assets/sprites/<이름>/<동작>/<방향>/`에
   넣는 순서는 그대로 쓸 수 있다.
2. 바닥 기준선 604px, 출력 420px webp 규격을 유지해야 `navigation.ts`의 height와
   보폭 계산이 어긋나지 않는다.
3. 새 모델은 머리 부피가 줄어 프레임 안 여백이 달라진다. `figureRatio`를 다시
   재지 않으면 그림자 크기와 말풍선 높이가 어긋난다.
4. POKO의 안경은 모델에 포함되므로, 사이트의 CSS 안경 오버레이는 제거해야 이중으로
   보이지 않는다.
5. 리깅은 MOMO 골격을 RUKI·YOMI·POKO가 공유하던 기존 방식이 깨진다. 머리 형태와
   소지품이 달라졌으므로 캐릭터별로 리깅해야 한다.
