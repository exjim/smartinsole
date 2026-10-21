#!/usr/bin/env bash
# 사용법: ./deploy.sh <firebase-프로젝트-ID>
# 사전 준비: npm i -g firebase-tools && firebase login
set -e
PID="${1:?Firebase 프로젝트 ID를 넣어 주세요. 예: ./deploy.sh newdic-app}"
firebase projects:create "$PID" --display-name "뉴딕" 2>/dev/null || echo "(프로젝트가 이미 있으면 그대로 사용합니다)"
echo "{ \"projects\": { \"default\": \"$PID\" } }" > .firebaserc
echo
echo "다음 두 가지는 콘솔에서 한 번만 켜 주세요 (CLI로는 불가):"
echo "  1) Authentication > 로그인 방법 > 이메일/비밀번호 사용 설정"
echo "  2) Firestore Database > 데이터베이스 만들기 (프로덕션 모드, 서울 asia-northeast3)"
echo "  3) 프로젝트 설정 > 내 앱 > 웹 앱 추가 후 firebaseConfig 를 public/firebase-config.js 에 붙여넣기"
read -p "위 3가지를 마쳤으면 Enter: " _
firebase deploy --only firestore:rules,hosting --project "$PID"
