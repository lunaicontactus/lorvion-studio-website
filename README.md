# EUN GARAGE

EUN GARAGE — 감정과 이야기를 중심으로 게임과 디지털 경험을 만드는 게임·앱 스튜디오의 공식 웹사이트입니다.
운영 주체(게임·앱·법률 문서 주체)는 EUN GARAGE입니다.

> 참고: 이 저장소 이름과 GitHub Pages 경로는 여전히 `lorvion-studio-website`(구 브랜드 시절 생성)입니다.
> 저장소 이름 변경 계획/권한이 확정되지 않아 아직 변경하지 않았습니다. 공식 문의 이메일도 기존
> `lorvionstudio@gmail.com`을 그대로 사용합니다(신규 EUN GARAGE 이메일은 아직 준비되지 않음).

LUNAI, LIMINAL, WORM UP! 대표 이미지와 EUN GARAGE 로고를 사용해 제작한 반응형 시네마틱 정적 웹사이트입니다.

## 포함 파일
- `index.html` — 브랜드 및 게임 메인페이지
- `privacy.html` — LUNAI 개인정보처리방침 초안
- `terms.html` — LUNAI 이용약관 초안
- `support.html` — 고객지원
- `account-deletion.html` — 계정 및 데이터 삭제 안내
- `404.html`
- SEO용 `robots.txt`, `sitemap.xml`, OG 이미지, favicon
- Cloudflare Pages용 `_headers`

## 로컬 미리보기
압축을 푼 폴더에서:

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## 가장 쉬운 배포 방법: Cloudflare Pages
1. GitHub에 새 저장소를 만들고 이 폴더의 파일을 업로드
2. Cloudflare Dashboard → Workers & Pages → Create → Pages
3. GitHub 저장소 연결
4. Framework preset: None
5. Build command: 비워두기
6. Output directory: `/`
7. 배포 완료 후 Custom domains에서 `eungarage.com` 연결

## Vercel 배포
1. GitHub 저장소를 Vercel에 Import
2. Framework preset: Other
3. Build command: 비워두기
4. Output directory: `.`
5. 배포 후 Domains에서 도메인 연결

## 공개 전 반드시 확인
1. 개인정보처리방침의 실제 수집 항목, 보유기간, 국외 이전, 외부 처리업체
2. 이용약관의 음악 생성 제공업체 라이선스와 상업적 이용 조건
3. 앱 내부 실제 계정 삭제 경로
4. 게임 출시 상태 문구
5. 공식 이메일을 도메인 이메일로 바꿀 경우 전체 링크 교체
6. `sitemap.xml`의 도메인이 실제 구매 도메인과 일치하는지 확인

현재 공식 문의 이메일은 `lorvionstudio@gmail.com`으로 연결되어 있습니다.
법률 문서는 디자인·구조 및 운영 초안이며 전문 법률 검토를 대신하지 않습니다.


## v5 additions
- Separate high-resolution symbol and wordmark in the hero
- Cinematic logo reveal, metallic light sweep, subtle floating animation
- First-screen four-point starlight cursor trail
- Mouse-based micro-parallax on the logo


## v6 변경 사항
- EUN GARAGE 로고 에셋을 새로 교체했습니다.
- 검은 배경에서 추출한 깨끗한 워드마크/심볼/조합형으로 업데이트했습니다.
- 히어로 로고 필터를 줄여 가장자리 잔상이 덜 보이도록 조정했습니다.


## v7 Premium Polish
- 첫 화면 로고 크기와 여백을 재조정했습니다.
- 로고 등장·부유·광택 애니메이션을 더 느리고 절제되게 다듬었습니다.
- 커서를 작은 궤도형 별빛으로 변경했습니다.
- 마우스 별빛 입자의 수, 크기, 밝기, 지속시간을 줄여 더 고급스럽게 조정했습니다.


## v8 변경 사항
- 첫 화면 반짝이는 별빛 커서를 더 잘 보이도록 다시 강화했습니다.
- WORM UP! 대표 이미지를 새 9:16 포스터로 교체했습니다.
- og-image.jpg도 최신 WORM UP! 포스터 기준으로 갱신했습니다.


## v9 이메일 변경
- 공식 문의 이메일을 `lorvionstudio@gmail.com`으로 교체했습니다.


## v10 GitHub Ready
- GitHub Pages 자동 배포 워크플로 추가
- GitHub 프로젝트 경로에서도 작동하도록 링크를 상대경로로 변경
- LUNAI 프로젝트 영역에 개인정보처리방침 링크 추가
- 개인정보처리방침 공개 주소: `privacy.html`
- 공식 이메일: `lorvionstudio@gmail.com`
