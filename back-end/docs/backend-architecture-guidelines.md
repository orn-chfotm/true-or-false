# Back-end 아키텍처 가이드

Back-end는 Java/Spring 기반 Gradle 멀티 모듈 프로젝트이며, DDD 형태로 구성한다.

세부 기준은 한 문서에 모으지 않고 책임별 문서로 분리한다.

## 책임별 문서

- [멀티 모듈 구성](backend/01-multi-module.md)
- [Core 모듈 기준](backend/02-core-module.md)
- [API 모듈 기준](backend/03-api-modules.md)
- [Domain 모듈 기준](backend/04-domain-module.md)
- [Infra 모듈 기준](backend/05-infra-module.md)
- [공통 구현 규칙](backend/06-common-implementation-rules.md)

## 확정 기술 구성

- APP DB: PostgreSQL
- AI 모델: Ollama `qwen3:8b`
- Vector DB: Elasticsearch
- API 문서화: Swagger/OpenAPI
- Build DSL: Gradle Groovy DSL (`build.gradle`, `settings.gradle`)

## 최상위 원칙

- `/api-admin`과 `/api-user`는 각각 독립적으로 build하고 각각 app server로 실행한다.
- `core`는 정말 공통적인 최소 코드만 둔다.
- 실제 비즈니스 흐름 조합은 `api-*` service에서 담당한다.
- `domain`은 외부 시스템에 의존하지 않는다.
- `infra`는 DB, S3/file system, SMTP, Elasticsearch, AI 등 app 외부 연동을 담당한다.
