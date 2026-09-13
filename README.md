# EUNGARAGE

EUNGARAGE — 감정과 이야기를 중심으로 게임과 디지털 경험을 만드는 게임·앱 스튜디오의 공식 웹사이트입니다.

공식 주소: **https://eungarage.com/**
운영 주체(게임·앱·법률 문서 주체)는 EUNGARAGE입니다.

> 참고: GitHub 저장소 이름은 `lorvion-studio-website`(구 브랜드 시절 생성)입니다. 커스텀 도메인이
> 연결되어 있어 공개 주소에는 드러나지 않습니다. 공식 문의 이메일은 `eungarage@gmail.com`입니다.

LUNAI, LIMINAL, WORM UP! 대표 이미지와 EUNGARAGE 로고를 사용해 제작한 반응형 시네마틱 정적 웹사이트입니다.

## 구조

```
index.html …            페이지 진입점 (URL 고정 — LUNAI 앱이 privacy.html 을 링크)
public/                 그대로 배포되는 파일 (이미지, CNAME, robots, sitemap, manifest)
src/
  main.ts               부트 진입
  app/boot.ts           서브시스템 마운트 + 에러 경계
  systems/              tick · storage · flags · motion · sound · clock · assets · log
  ui/                   intro · dialog · nav · reveal · soundToggle
  data/                 characters · projects · garageObjects · easterEggs
  types/                타입 정의
  scenes/               씬 라이프사이클
  legacy/               구 우주 히어로 (flags.legacyHero, STEP 2 에서 삭제 예정)
  styles/               tokens · base · layout · nav · intro · pages · legacy-home · responsive
test/                   vitest 단위 테스트
```

## 명령

```bash
npm install
npm run dev        # 개발 서버
npm run verify     # lint + typecheck + test + build (CI 와 동일)
npm run build      # 프로덕션 빌드 → dist/
```

## 배포

`main` 에 push 하면 GitHub Actions 가 lint · typecheck · test · build 를 돌리고
`dist/` 를 GitHub Pages 에 올립니다. Pull request 에서도 같은 검증이 돌기 때문에
빌드가 깨진 상태로는 라이브에 도달할 수 없습니다.

## 소품 원본과 키잉

`public/assets/images/garage/prop_*.webp` 는 2026-09-11 에 받은 녹색 배경 렌더
(택배 닫힘/열림, 태엽 자동차 닫힘/열림, 부품 트레이, 먹던 컵라면, 음료)를
`scripts/key_green.py` 와 같은 방식으로 키잉한 것입니다. 열림/닫힘 한 쌍은
같은 캔버스에 잘라 두어 전환 시 위치가 움직이지 않습니다(자동차는 원본이
이미 같은 캔버스, 택배는 열린 쪽을 1.10배 키워 바닥 꼭짓점을 맞춤). 원본
PNG 는 저장소에 넣지 않습니다. 안경(정면 렌더, `poko_boss_glasses.glb`)은
사용하지 않았습니다: 게임 속 부장님 안경은 CSS 오버레이 그대로이고, GLB 를
머리에 맞춰 볼 포코 원본 모델이 이 작업 환경에 없습니다.

## 개발용 쿼리 파라미터

```
?debug=on          시스템 로그 출력
?t=night           낮/밤 단계 강제 (morning|day|evening|night|lateNight, 또는 0-23)
?alley=on          아직 만들어지지 않은 기능 플래그 켜기
?legacyHero=off    구 우주 히어로 끄기
```

## 공개 전 반드시 확인
1. 개인정보처리방침의 실제 수집 항목, 보유기간, 국외 이전, 외부 처리업체
2. 이용약관의 음악 생성 제공업체 라이선스와 상업적 이용 조건
3. 앱 내부 실제 계정 삭제 경로
4. 게임 출시 상태 문구

현재 공식 문의 이메일은 `eungarage@gmail.com` 입니다.
법률 문서는 디자인·구조 및 운영 초안이며 전문 법률 검토를 대신하지 않습니다.
