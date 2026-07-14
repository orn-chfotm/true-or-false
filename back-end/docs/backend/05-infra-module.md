# Infra 모듈 기준

`infra`는 app 외부 호출과 외부 시스템 구현체를 담당한다.

## 책임

- DB persistence
- Spring Data JPA repository
- DB adapter
- S3/file system adapter
- SMTP adapter
- Elasticsearch adapter
- Ollama/Spring AI adapter
- 기타 외부 API client

## 패키지 예시

```text
infra/
  persistence/
  file/
  smtp/
  vectordb/
  ai/
```

## Persistence

- JPA repository interface는 `infra.persistence`에 둔다.
- DB entity mapping과 persistence 세부 구현은 `infra.persistence`에 둔다.
- API service가 사용할 adapter 또는 port 구현체를 제공한다.
- JPA repository를 API controller나 domain에 직접 노출하지 않는다.

## 외부 시스템

- S3/file system은 `infra.file` 또는 별도 외부 저장소 패키지에 둔다.
- SMTP는 `infra.smtp`에 둔다.
- Elasticsearch는 `infra.vectordb`에 둔다.
- Ollama/Spring AI는 `infra.ai`에 둔다.

## 금지 사항

- Infra에 API request/response DTO를 두지 않는다.
- Infra가 controller를 알면 안 된다.
- Infra가 API response를 만들면 안 된다.
- Infra 구현 세부사항을 domain에 노출하지 않는다.
