---
name: infra-external-integration
description: infra 모듈에서 DB persistence, JPA repository, S3/file system, SMTP, Elasticsearch, Ollama/Spring AI adapter를 추가하거나 변경할 때 사용한다.
when_to_use: infra.persistence, JpaRepository, DB adapter, S3/file system, SMTP, Elasticsearch, Spring AI, Ollama, 외부 API client 구현을 다룰 때 사용한다.
paths:
  - "back-end/infra/**/*"
  - "back-end/**/*"
  - "**/*.java"
---

# 스킬: Infra 외부 연동 구현

## 참조

- 규칙: `back-end/.claude/rules/infra-external-integration-rules.md`
- 문서: `back-end/docs/backend/05-infra-module.md`

## 절차

1. 외부 연동 종류를 확인한다.
2. DB/JPA는 `infra.persistence`에 둔다.
3. S3/file system은 `infra.file` 또는 외부 저장소 패키지에 둔다.
4. SMTP는 `infra.smtp`에 둔다.
5. Elasticsearch는 `infra.vectordb`에 둔다.
6. Ollama/Spring AI는 `infra.ai`에 둔다.
7. API service가 사용할 adapter 형태로 제공한다.
8. Domain이 infra 구현체를 직접 알지 않게 한다.

## 체크리스트

- JPA repository가 `infra.persistence`에 있다.
- Infra에 API request/response DTO가 없다.
- Infra가 controller를 알지 않는다.
- Infra 구현 세부사항이 domain에 노출되지 않는다.
