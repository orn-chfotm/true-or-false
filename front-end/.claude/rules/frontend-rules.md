# Front-end Rules

## Next.js

- App Router를 기본으로 사용한다.
- URL 구조는 `front-end/CLAUDE.md`의 URL Structure를 따른다.
- 서버 상태와 클라이언트 입력 상태를 분리한다.
- API base URL은 환경 변수로 관리한다.

## Pages

- `/`는 관리자 대시보드다.
- `/policies`는 규정집 목록과 상태 확인 중심이다.
- `/policies/upload`는 PDF 업로드와 업로드 후 job 상태 이동을 제공한다.
- `/policies/[documentId]`는 추출 텍스트와 metadata 확인 화면이다.
- `/policies/[documentId]/edit`는 추출 텍스트 수정 화면이다.
- `/prompts`는 default prompt 관리 화면이다.
- `/chat-test`는 관리자 테스트 채팅 화면이다.

## Auth

- 초기 구현에서 로그인 화면을 만들지 않는다.
- 추후 SSO/내부 DB 연동을 위해 auth 관련 코드는 격리 가능한 구조로 둔다.

## State

- 문서 처리 상태는 polling 가능한 hook 또는 feature module로 관리한다.
- 실패 상태는 관리자에게 실패 사유를 보여줄 수 있어야 한다.

