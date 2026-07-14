# API 모듈 규칙

이 규칙은 `api-admin`, `api-user` 모듈에 적용한다.

## API 분리

- 관리자 API는 `api-admin` 모듈에 둔다.
- 사용자 API는 `api-user` 모듈에 둔다.
- 관리자 API URL prefix는 `/api-admin/**`이다.
- 사용자 API URL prefix는 `/api-user/**`이다.
- `api-member` 명칭은 사용하지 않는다.

## Controller

- 모든 controller는 `@RestController`를 사용한다.
- Controller는 request DTO를 입력으로 받고 response DTO를 반환한다.
- Controller는 entity를 직접 반환하지 않는다.
- Controller는 Spring Data `Page`를 직접 반환하지 않는다.
- Controller에는 비즈니스 흐름을 넣지 않는다.

## API Service

- 실제 비즈니스 흐름 조합은 `api-*` service에서 담당한다.
- API service는 domain service와 infra adapter를 조합한다.
- API service는 transaction 경계를 담당할 수 있다.
- API service는 domain 결과를 response DTO로 변환한다.
- API service 외부에 API 조합 로직을 흩뿌리지 않는다.

## 금지

- Controller에서 JPA repository를 직접 사용하지 않는다.
- Controller에서 infra 구현체를 직접 조합하지 않는다.
- API DTO를 domain에 넘겨 domain이 API DTO에 의존하게 만들지 않는다.
- API 모듈에 domain entity 구현 세부사항을 복제하지 않는다.
