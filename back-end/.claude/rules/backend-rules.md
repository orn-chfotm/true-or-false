# Back-end 공통 규칙

이 파일은 Back-end 작업의 상위 요약 규칙이다.
세부 규칙은 같은 디렉터리의 책임별 rule을 따른다.

## 모듈

- Back-end는 Gradle 멀티 모듈 프로젝트로 구성한다.
- 실행 app server는 `api-admin`, `api-user` 두 개로 분리한다.
- `core`, `domain`, `infra`는 library module이다.
- `api-member` 명칭은 사용하지 않는다.

## Core

- `core`는 정말 공통적인 최소 코드만 둔다.
- 도메인 코드, API DTO, 인증 구현, AWS/S3 구현, 전체 service를 `core`에 두지 않는다.

## API

- 모든 controller는 `@RestController`를 사용한다.
- 관리자 API는 `/api-admin/**`를 사용한다.
- 사용자 API는 `/api-user/**`를 사용한다.
- 실제 비즈니스 흐름 조합은 `api-*` service에서 담당한다.
- Controller는 entity 또는 `Page`를 직접 반환하지 않는다.

## Domain

- `domain`은 DDD 형태로 구성한다.
- Domain service는 entity 조합, 상태 전환, 도메인 정책 검증을 담당한다.
- `domain`은 DB, SMTP, S3/file system, Elasticsearch, AI 구현체에 의존하지 않는다.
- `domain`은 `infra`에 의존하지 않는다.

## Infra

- DB persistence는 `infra.persistence`에 둔다.
- S3/file system은 `infra.file` 또는 외부 저장소 패키지에 둔다.
- SMTP는 `infra.smtp`에 둔다.
- Elasticsearch는 `infra.vectordb`에 둔다.
- Ollama/Spring AI는 `infra.ai`에 둔다.

## Exception

- Exception은 `ExceptionHandler`에서 공통 관리한다.
- 비즈니스 예외는 `RuntimeException` 기반 `CustomException` 계열로 처리한다.
- Exception message와 HTTP status는 enum으로 관리한다.
