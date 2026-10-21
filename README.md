# 뉴딕 웹앱

환자 앱(휴대폰 화면)과 연구자 웹을 한 앱에 담았습니다. 와이어프레임·Figma 프로토타입(P01~P13, W01~W02)과 같은 흐름입니다.

- **환자**: 간편 가입 → 연구번호 연결 → 동의 → 화면 모드 → 인솔 준비 → 홈 → 걷기(실시간 하중) → 마치기 → 결과·통증 → 저장 → 기록·처방·설정
- **연구자**: 간편 가입(가입 코드) → 환자 등록 → 환자 목록(오늘 순응 낮은 순)·상세 → 처방 변경(이력 누적)
- **관리자**: 간편 가입(관리자 코드) → 개요(확인 필요 환자·가입 현황) / 계정(역할 변경·비활성화) / 환자·연구번호(연결 해제·삭제) / 데이터·설정(CSV·샘플)
- **문의**: 환자 앱 `처방 > 병원에 문의`(또는 결과의 통증 높음 안내)에서 종류 선택·메시지를 보내면 관리자·연구자 화면에 팝업이 뜨고, 관리자 `문의` 탭에서 확인·답변합니다. 답변은 환자 앱에 팝업으로 바로 뜨고 문의 내역에 남습니다. 관리자·연구자가 먼저 환자에게 메시지를 보낼 수도 있습니다(관리자 `문의` 탭, 연구자 웹 환자 상세).
- **화면 전환**: 관리자·연구자 상단 메뉴의 `관리자 화면 · 연구자 웹 · 환자 앱 미리보기`. 미리보기는 선택한 환자의 앱을 그대로 보여 주고(저장 안 함), 상단 막대의 `돌아가기`로 복귀합니다.
- **인솔(BLE) 연동 전**이라 걷기 화면은 "지금 싣는 하중" 슬라이더로 체험합니다. 실제 센서 연결 시 `walkStep()` 입력만 바꾸면 됩니다.

## 두 가지 실행 방식
| 방식 | 설정 | 저장 위치 |
|---|---|---|
| 체험 모드 | `public/firebase-config.js` 가 `null` (기본) | 이 브라우저(localStorage). 샘플 환자 NDX-0001~0005 자동 포함 |
| Firebase | `firebaseConfig` 입력 | Firebase Auth + Firestore (여러 기기·사용자 공유) |

## Firebase 배포 (5분)
1. `npm i -g firebase-tools && firebase login`
2. 콘솔(console.firebase.google.com)에서 프로젝트 만들기 → **Authentication > 이메일/비밀번호** 사용 → **Firestore 데이터베이스** 만들기(서울 asia-northeast3) → **웹 앱 추가** 후 `firebaseConfig` 를 `public/firebase-config.js` 에 붙여넣기
3. `public/firebase-config.js` 의 `NEWDIC_RESEARCHER_CODE` 를 바꾸기
4. `./deploy.sh <프로젝트ID>` (또는 `.firebaserc.example` 를 `.firebaserc` 로 복사 후 `firebase deploy`)
5. 배포된 주소(`https://<프로젝트ID>.web.app`)에서 연구자 계정으로 가입 → **+ 환자 등록** → 환자가 휴대폰에서 가입 후 연구번호 입력

로컬 확인: `npx serve public` 또는 `firebase emulators:start`

## 데이터 구조 (Firestore)
- `users/{uid}`: role(patient|researcher|admin), disabled, name, email, studyId, mode, consent, settings
- `patients/{연구번호}`: 체중·단계·한도·의료진·메모·`rxHistory[]`·`uid`(연결된 환자 계정)
- `messages/{id}`: uid, studyId, kind, text, pain, read, reply
- `sessions/{id}`: studyId, uid, 시작·시간·걸음·초과·최대·평균·분당·순응·통증·peaks[]

## 보안 메모 (실사용 전 꼭 확인)
- `firestore.rules` 는 역할 기반입니다. 단, "연구자·관리자" 역할은 **가입 코드**(클라이언트 확인)로만 막혀 있어 간편 가입 수준입니다. 실제 임상 데이터를 다루기 전에는 연구자 계정을 관리자가 만들고 **custom claims**로 권한을 주는 방식으로 바꾸세요.
- 환자 개인정보(이름 등)는 이니셜 사용을 권장합니다. 연구 데이터 보관·동의 절차는 기관 IRB 기준을 따르세요.

## GitHub 업로드와 자동 배포
1. GitHub에서 빈 저장소를 만든 뒤 `git remote add origin <주소> && git push -u origin main`
2. (선택) 자동 배포: 저장소 Settings > Secrets and variables > Actions 에 `FIREBASE_SERVICE_ACCOUNT`(서비스 계정 JSON) 과 변수 `FIREBASE_PROJECT_ID` 를 넣으면, main 에 push 할 때마다 `.github/workflows/deploy.yml` 이 배포합니다.
3. GitHub Pages로 올리는 방법도 가능하지만, Firebase 콘솔 Authentication > 설정 > 승인된 도메인에 `사용자명.github.io` 를 추가해야 로그인이 됩니다.
