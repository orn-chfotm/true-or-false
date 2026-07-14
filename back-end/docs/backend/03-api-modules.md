# API 모듈 기준

API 모듈은 `api-admin`, `api-user`로 분리한다.

## 모듈 책임

`api-admin`:

- 관리자 API application
- 관리자 controller
- 관리자 request/response DTO
- 관리자 API service
- 관리자 API 조합 흐름

`api-user`:

- 사용자 API application
- 사용자 controller
- 사용자 request/response DTO
- 사용자 API service
- 사용자 API 조합 흐름

## API Service 책임

실제 비즈니스 흐름은 `api-*` service 영역으로 한정한다.

API service는 다음 조합을 담당한다.

- controller request를 application 흐름으로 변환
- domain service 호출
- domain entity 또는 domain 결과 조합
- infra adapter 호출
- transaction 경계 설정
- response DTO 변환
- 비동기 job 시작/상태 조합

## Controller 책임

- `@RestController`만 사용한다.
- request DTO를 입력으로 받는다.
- response DTO를 반환한다.
- entity를 직접 반환하지 않는다.
- Spring Data `Page`를 직접 반환하지 않는다.

## API 모듈 금지 사항

- Controller에 비즈니스 흐름을 넣지 않는다.
- Controller에서 infra 구현체를 직접 조합하지 않는다.
- Controller에서 JPA repository를 직접 사용하지 않는다.
- API DTO를 domain으로 넘겨 domain이 API DTO에 의존하게 만들지 않는다.
- API service 외부에 API 조합 로직을 흩뿌리지 않는다.

## URL prefix

- 관리자 API: `/api-admin/**`
- 사용자 API: `/api-user/**`
