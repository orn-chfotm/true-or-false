# Infra 외부 연동 규칙

이 규칙은 `infra` 모듈과 외부 시스템 연동 변경에 적용한다.

## Infra 책임

- DB persistence
- Spring Data JPA repository
- DB adapter
- S3/file system adapter
- SMTP adapter
- Elasticsearch adapter
- Ollama/Spring AI adapter
- 기타 외부 API client

## Persistence

- Spring Data JPA interface는 `infra.persistence` 내부에 둔다.
- Persistence adapter는 `infra.persistence` 내부에 둔다.
- JPA repository를 controller나 domain에 직접 노출하지 않는다.
- API service는 필요한 경우 infra adapter를 DI 받아 조합한다.

## 외부 시스템

- S3/file system 구현은 `infra.file` 또는 외부 저장소 패키지에 둔다.
- SMTP 구현은 `infra.smtp`에 둔다.
- Elasticsearch 구현은 `infra.vectordb`에 둔다.
- Ollama/Spring AI 구현은 `infra.ai`에 둔다.

## 금지

- Infra에 API request/response DTO를 두지 않는다.
- Infra가 controller를 알면 안 된다.
- Infra가 API response를 만들면 안 된다.
- Infra 구현 세부사항을 domain에 노출하지 않는다.
