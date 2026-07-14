---
name: api-module-implementation
description: api-admin/api-user 컨트롤러, DTO, API service, 공통 응답, API 페이지네이션을 추가하거나 변경할 때 사용한다.
when_to_use: @RestController, /api-admin, /api-user, 요청/응답 DTO, API service 조합, Page-to-DTO 변환, controller 응답 구조를 다룰 때 사용한다.
paths:
  - "back-end/api-admin/**/*"
  - "back-end/api-user/**/*"
  - "back-end/**/*"
  - "**/*.java"
---

# 스킬: API 모듈 구현

## 참조

- 규칙: `back-end/.claude/rules/api-module-rules.md`
- DTO/page 규칙: `back-end/.claude/rules/dto-response-pagination-rules.md`
- 문서: `back-end/docs/backend/03-api-modules.md`

## 절차

1. 엔드포인트가 `api-admin`인지 `api-user`인지 결정한다.
2. 컨트롤러, DTO, API service를 해당 API 모듈에 둔다.
3. 컨트롤러는 `@RestController`로 작성한다.
4. 관리자 경로는 `/api-admin/**`, 사용자 경로는 `/api-user/**`를 사용한다.
5. 실제 비즈니스 흐름 조합은 API service에 둔다.
6. API service에서 domain service와 infra adapter를 조합한다.
7. Entity는 response DTO로 변환해서 반환한다.
8. `Page<T>`는 API 전용 목록 response DTO로 변환한다.

## 체크리스트

- `api-member` 명칭을 사용하지 않는다.
- Controller에 비즈니스 흐름이 없다.
- API service가 조합 흐름을 담당한다.
- Controller가 entity 또는 `Page`를 직접 반환하지 않는다.
- Domain이 API DTO에 의존하지 않는다.
