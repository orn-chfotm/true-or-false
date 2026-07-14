---
description: Next.js 관리자 화면, App Router URL, 비동기 job polling UI, 테스트 채팅 화면을 설계하거나 구현할 때 사용한다.
paths:
  - "front-end/**/*"
---

# Skill: Admin Next.js UI

Next.js 관리자 화면을 설계하거나 구현할 때 따르는 절차다.

## Steps

1. 현재 작업 URL이 `front-end/CLAUDE.md`의 URL Structure와 맞는지 확인한다.
2. 필요한 백엔드 API request/response type을 먼저 정의한다.
3. API 호출 코드는 `lib/api` 또는 feature api module에 둔다.
4. 화면은 관리자 업무 흐름 중심으로 구성한다.
5. 로그인/회원가입 화면은 만들지 않는다.
6. 비동기 작업은 `jobId`와 상태 표시를 포함한다.
7. 테스트 채팅은 async job polling으로 처리하고 답변 전에는 loading UI를 표시한다.

## Required Views

- Dashboard
- Policy list
- Policy upload
- Policy extracted text detail
- Policy text editor
- Prompt editor
- Chat test
- Job status

