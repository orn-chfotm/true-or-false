# Back-end 규칙

Back-end 작업은 이 디렉터리 아래의 상세 md 규칙을 먼저 읽고 구현한다.

## 사용자 의견 검수

사용자 의견 검수는 Spring AI와 OpenAI API를 사용한다. 규정집 RAG용 Ollama·Elasticsearch를 기본값으로 적용하지 않는다.

- [구현 안내와 스킬 목록](../.docs/implementation/opinion-review-skills.md)
- [Spring AI 의견 검수 스킬](../.claude/skills/spring-ai-opinion-review/SKILL.md)
- [검수 품질 평가 스킬](../.claude/skills/opinion-review-evaluation/SKILL.md)

@../.claude/rules/backend/02-review-pipeline.md

## Rules

@back-end/.claude/rules/backend-rules.md
@back-end/.claude/rules/gradle-module-boundary-rules.md
@back-end/.claude/rules/core-module-rules.md
@back-end/.claude/rules/api-module-rules.md
@back-end/.claude/rules/domain-ddd-rules.md
@back-end/.claude/rules/infra-external-integration-rules.md
@back-end/.claude/rules/ai-vector-db-rules.md
@back-end/.claude/rules/dto-response-pagination-rules.md
@back-end/.claude/rules/exception-handling-rules.md
@back-end/.claude/rules/swagger-documentation-rules.md

## Architecture Docs

@back-end/docs/backend-architecture-guidelines.md
@back-end/docs/backend/01-multi-module.md
@back-end/docs/backend/02-core-module.md
@back-end/docs/backend/03-api-modules.md
@back-end/docs/backend/04-domain-module.md
@back-end/docs/backend/05-infra-module.md
@back-end/docs/backend/06-common-implementation-rules.md
