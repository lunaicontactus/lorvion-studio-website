#!/bin/bash
set -e

cd "$(dirname "$0")"

REPO_NAME="lorvion-studio-website"

echo ""
echo "EUNGARAGE GitHub 배포를 시작합니다."
echo ""

if ! command -v git >/dev/null 2>&1; then
  echo "오류: Git이 설치되어 있지 않습니다."
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI가 없습니다."
  echo "먼저 아래 명령을 실행한 뒤 이 파일을 다시 실행하세요:"
  echo ""
  echo "  brew install gh"
  echo ""
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub 로그인이 필요합니다. 브라우저 인증을 진행합니다."
  gh auth login --web
fi

OWNER="$(gh api user --jq .login)"
echo "GitHub 계정: $OWNER"

if [ ! -d ".git" ]; then
  git init
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "Launch EUNGARAGE website"
fi
git branch -M main

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "기존 저장소를 사용합니다: $OWNER/$REPO_NAME"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  fi
  git push -u origin main
else
  echo "새 공개 저장소를 만듭니다: $OWNER/$REPO_NAME"
  gh repo create "$OWNER/$REPO_NAME" \
    --public \
    --description "Official website for EUNGARAGE" \
    --source=. \
    --remote=origin \
    --push
fi

echo "GitHub Pages를 GitHub Actions 방식으로 활성화합니다."
gh api --method POST "repos/$OWNER/$REPO_NAME/pages" -f build_type=workflow >/dev/null 2>&1 || true

git commit --allow-empty -m "Trigger GitHub Pages deployment"
git push

echo ""
echo "완료했습니다."
echo "저장소: https://github.com/$OWNER/$REPO_NAME"
echo "사이트: https://$OWNER.github.io/$REPO_NAME/"
echo "LUNAI 개인정보처리방침: https://$OWNER.github.io/$REPO_NAME/privacy.html"
echo ""
echo "첫 배포는 GitHub Actions 완료 후 표시됩니다."
