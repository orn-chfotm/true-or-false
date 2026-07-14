---
name: core-module-design
description: core 모듈에 공통 코드 추가 여부를 판단하거나, core에 잘못 들어간 도메인/API/외부 시스템 코드를 분리할 때 사용한다.
when_to_use: core module, 공통 response, 공통 exception, 공통 유틸리티, base entity, shared code 판단을 다룰 때 사용한다.
paths:
  - "back-end/core/**/*"
  - "back-end/.claude/rules/core-module-rules.md"
  - "back-end/docs/backend/02-core-module.md"
---

# 스킬: Core 모듈 설계

## 참조

- 규칙: `back-end/.claude/rules/core-module-rules.md`
- 문서: `back-end/docs/backend/02-core-module.md`

## 절차

1. 추가하려는 코드가 두 개 이상의 모듈에서 반드시 필요한지 확인한다.
2. 도메인 의미, API 응답 의미, 인증 구현, 외부 시스템 구현을 포함하는지 확인한다.
3. 포함한다면 `core`가 아니라 해당 모듈로 이동한다.
4. JPA 의존 코드라면 모든 persistence entity의 공통 기준인지 확인한다.
5. 판단이 애매하면 `core`에 넣기보다 더 구체적인 모듈에 둔다.

## 체크리스트

- `core`에 도메인 코드가 없다.
- `core`에 API DTO가 없다.
- `core`에 인증/AWS/S3/SMTP 같은 구현이 없다.
- `core`에 service가 없다.
