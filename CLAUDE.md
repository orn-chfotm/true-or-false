@.ai-prompts/CLAUDE.md

# 프로젝트 규칙

## Claude Adapter Boundary

- `.claude/rules/`는 프로젝트 공통 정책이면 커밋한다.
- `.claude/skills/`는 프로젝트 공통 절차이면 커밋한다.
- `.claude/settings.json`은 공유 가능한 기본값만 둔다.
- `.claude/settings.local.json`은 개인 로컬 설정이므로 커밋하지 않는다.
- `.claude/agents/`는 역할이 팀 공통으로 합의된 경우에만 둔다.

## Backend (Opinion Brief)

@.claude/rules/backend/config/01-build-config.md
@.claude/rules/backend/00-module-structure.md
@.claude/rules/backend/01-domain-model.md
@.claude/rules/backend/02-review-pipeline.md
@.claude/rules/backend/03-report-snapshot.md
@.claude/rules/backend/04-reward-ledger.md
@.claude/rules/backend/05-participation-slot.md
@.claude/rules/backend/06-privacy.md

### Java 컨벤션
@.claude/rules/backend/java/01-dto-response.md
@.claude/rules/backend/java/02-enum-json.md

### JPA 컨벤션
@.claude/rules/backend/jpa/01-association-fetch.md
@.claude/rules/backend/jpa/02-base-time-entity.md
@.claude/rules/backend/jpa/03-soft-delete.md
@.claude/rules/backend/jpa/04-querydsl.md
@.claude/rules/backend/jpa/05-enum-converter.md

### Spring 컨벤션
@.claude/rules/backend/spring/01-controller.md
@.claude/rules/backend/spring/02-service.md

### 예외 · 에러코드
@.claude/rules/backend/exception/01-error-code.md

### 보안 · JWT
@.claude/rules/backend/security/01-jwt.md
@.claude/rules/backend/security/02-filter-chain.md
@.claude/rules/backend/security/03-jwt-provider.md
@.claude/rules/backend/security/04-authorization.md

### Swagger 문서화
@.claude/rules/backend/swagger/01-api-docs.md

## Frontend (Opinion Brief)

@.claude/rules/frontend/00-architecture.md
@.claude/rules/frontend/01-app-surfaces.md
@.claude/rules/frontend/02-state-management.md
@.claude/rules/frontend/03-forms-validation.md
@.claude/rules/frontend/04-async-status-ui.md
@.claude/rules/frontend/05-report-view.md

### TypeScript 컨벤션
@.claude/rules/frontend/typescript/01-dto-types.md
@.claude/rules/frontend/typescript/02-api-client-auth.md
