---
name: domain-ddd-implementation
description: domain 모듈에서 DDD entity, value object, domain service, domain exception, entity 조합 규칙을 추가하거나 변경할 때 사용한다.
when_to_use: domain module, entity, value object, aggregate boundary, domain service, domain exception, 도메인 순수성, 외부 의존 제거를 다룰 때 사용한다.
paths:
  - "back-end/domain/**/*"
  - "back-end/**/*"
  - "**/*.java"
---

# 스킬: Domain DDD 구현

## 참조

- 규칙: `back-end/.claude/rules/domain-ddd-rules.md`
- 문서: `back-end/docs/backend/04-domain-module.md`

## 절차

1. 도메인 코드는 `domain` 모듈에 둔다.
2. Entity, value object, enum, domain service, exception을 도메인별로 묶는다.
3. Domain service는 entity 조합, 상태 전환, 도메인 정책 검증을 담당한다.
4. DB, SMTP, S3/file system, Elasticsearch, AI 구현체를 domain에 주입하지 않는다.
5. API DTO를 domain에 넘기지 않는다.
6. 외부 연동은 API service가 domain 결과를 바탕으로 infra adapter를 호출하는 구조를 우선한다.

## 체크리스트

- Domain이 `infra`에 의존하지 않는다.
- Domain이 API DTO에 의존하지 않는다.
- Domain service에 외부 시스템 호출이 없다.
- Entity 조합 규칙이 controller나 infra에 흩어져 있지 않다.
