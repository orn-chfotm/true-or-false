---
description: Elasticsearch를 Vector DB로 사용해 RAG 검색, vector 문서 저장, metadata 설계, infra.vectordb adapter를 구현하거나 수정할 때 사용한다.
when_to_use: Elasticsearch vector 검색, RAG context 구성, 규정 문서 vector 반영, chunk metadata, infra.vectordb adapter, AI 답변 근거 추적을 다룰 때 사용한다.
paths:
  - "back-end/**/*"
  - "src/**/*"
  - "**/*.java"
---

# 스킬: Elasticsearch Vector DB 구현

## 참조

- 규칙: `back-end/.claude/rules/ai-vector-db-rules.md`
- 전체 가이드: `back-end/docs/backend-architecture-guidelines.md`

## 절차

1. Elasticsearch 연동 코드는 `infra.vectordb`에 둔다.
2. Domain service는 Elasticsearch 구현체가 아니라 port/interface에 의존하게 한다.
3. Vector 저장 문서에는 규정 문서 추적 metadata를 포함한다.
4. RAG 검색 결과는 AI context로 주입 가능한 DTO 또는 domain 결과로 변환한다.
5. 검색 결과가 없거나 근거가 부족한 경우 답변하지 않는 흐름을 유지한다.
6. API layer가 Elasticsearch client, index, query DSL 세부사항을 직접 알지 않게 한다.

## 권장 metadata

```text
policyCode
policyVersion
documentId
chunkId
sectionNo
chunkNo
status
effectiveFrom
effectiveTo
```

## 체크리스트

- Vector DB 구현체가 `infra.vectordb` 밖으로 노출되지 않는다.
- RAG context가 Elasticsearch 검색 결과를 기준으로 구성된다.
- 답변 근거 추적에 필요한 metadata가 보존된다.
- `ACTIVE` 상태 문서만 기본 검색 대상이 된다.
