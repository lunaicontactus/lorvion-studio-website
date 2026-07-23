# EUN GARAGE — GitHub 연결 안내

이 폴더는 GitHub Pages 자동 배포 준비가 완료되어 있습니다.

## 포함된 설정
- `.github/workflows/deploy-pages.yml`: main 브랜치에 올릴 때 자동 배포
- `.nojekyll`: 정적 파일을 그대로 제공
- `publish-to-github.sh`: GitHub 저장소 생성 및 업로드 도우미
- `privacy.html`: LUNAI 개인정보처리방침 고정 주소
- 메인 LUNAI 영역에 `PRIVACY POLICY` 링크 연결

## 가장 쉬운 실행
터미널에서 아래처럼 실행합니다.

```bash
cd 
```

`cd` 뒤에 띄어쓰기를 둔 채 이 폴더를 터미널로 드래그하고 Enter를 누릅니다.

그다음:

```bash
bash publish-to-github.sh
```

`gh`가 없다고 나오면:

```bash
brew install gh
```

설치 후 다시:

```bash
bash publish-to-github.sh
```

## 최종 URL 형식
GitHub 사용자명이 `example`이라면:

- 사이트: `https://example.github.io/lorvion-studio-website/`
- LUNAI 개인정보처리방침: `https://example.github.io/lorvion-studio-website/privacy.html`

나중에 `eungarage.com`을 연결하면 개인정보처리방침 주소는:

`https://eungarage.com/privacy.html`

## 앱에 넣을 주소
GitHub Pages 배포가 끝난 뒤 LUNAI의 개인정보처리방침 URL 상수에 실제 공개 URL을 넣습니다.
