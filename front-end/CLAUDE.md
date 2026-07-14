# Front-end 규칙

Front-end 작업은 이 디렉터리 아래의 상세 md 규칙을 먼저 읽고 구현한다.

@front-end/.claude/rules/frontend-rules.md

## URL Structure

- `/`: 관리자 대시보드
- `/policies`: 규정집 목록과 상태 확인
- `/policies/upload`: PDF 업로드와 업로드 후 job 상태 이동
- `/policies/[documentId]`: 추출 텍스트와 metadata 확인
- `/policies/[documentId]/edit`: 추출 텍스트 수정
- `/prompts`: default prompt 관리
- `/chat-test`: 관리자 테스트 채팅
