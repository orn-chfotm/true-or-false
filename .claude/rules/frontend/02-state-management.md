---
description: "서버 상태(TanStack Query)와 클라이언트 상태(Zustand/Context)를 분리하고, API 호출을 UI 컴포넌트에서 분리한다."
---

# 02. 상태 관리 규칙

근거 문서:
- `.docs/prd/opinion-brief-technology-summary.md` 6.1, 6.2
- 하네스 `docs/10-technical/03-javascript.md` (상태·API·UI 책임 분리)

## 설계 기준

### 서버 상태와 클라이언트 상태를 분리한다

- 서버에서 온 데이터(Brief 목록, 응답 상태, 리포트, 보상)는 **TanStack Query**로 관리한다. 이 데이터를 전역 클라이언트 스토어에 복제해 보관하지 않는다.
- UI 로컬 상태(모달 열림, 폼 임시값, 스텝)는 **Zustand 또는 React Context**로 관리한다.
- 폼 입력 상태는 React Hook Form이 관리한다. (`03-forms-validation.md`)

### API 호출을 UI에서 분리한다

- fetch/axios 호출은 컴포넌트 본문이 아니라 API 클라이언트 계층(query/mutation 훅)에 둔다.
- 컴포넌트는 훅이 반환한 데이터·상태·mutation만 사용한다.

## 구현 가드레일

- 서버 데이터를 `useState`/전역 스토어로 수동 캐싱하지 않는다. TanStack Query 캐시를 단일 소스로 쓴다.
- 검수 상태처럼 서버에서 바뀌는 값은 폴링/`invalidateQueries`로 갱신한다. (`04-async-status-ui.md`)
- 타입은 `any`를 피하고, API 응답 타입을 Zod 스키마 또는 명시적 타입으로 표현한다.
- mutation 성공 후 관련 query를 무효화해 화면과 서버 상태를 일치시킨다.

## 검증 기준

- 서버 데이터가 Query 캐시 한 곳에서만 관리되는지 리뷰.
- mutation 후 관련 목록/상세가 갱신되는지 테스트.
