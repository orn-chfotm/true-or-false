# 공통 구현 규칙

## DTO

- Entity와 DTO는 분리한다.
- Request DTO와 response DTO는 API 모듈에 둔다.
- DTO 이름은 `{Domain}{ApiPurpose}{Request|Response}Dto` 형식을 따른다.
- Entity를 API response로 직접 반환하지 않는다.

## Page 응답

- 내부 목록 조회는 Spring Data `Page`를 사용할 수 있다.
- API 응답으로 `Page`를 직접 노출하지 않는다.
- `Page<T>`는 API 전용 response DTO로 변환한다.

## Exception

- Exception은 `ExceptionHandler`에서 공통 관리한다.
- 비즈니스 예외는 `RuntimeException`을 상속한 `CustomException` 계열로 처리한다.
- Exception message와 HTTP status는 enum으로 관리한다.
- 공통 exception은 `core.exception`에 둔다.
- 도메인별 exception과 enum은 domain 내부에서 확장할 수 있다.

## Swagger/OpenAPI

- Controller에는 `@Tag`를 작성한다.
- API method에는 `@Operation`을 작성한다.
- Request/response DTO에는 `@Schema`를 작성한다.
- Entity에도 필요한 경우 도메인 의미 설명을 작성한다.

## 확정 기술

- APP DB: PostgreSQL
- AI 모델: Ollama `qwen3:8b`
- Vector DB: Elasticsearch
- PostgreSQL 연동: `infra.persistence`
- Elasticsearch 연동: `infra.vectordb`
- Ollama/Spring AI 연동: `infra.ai`
