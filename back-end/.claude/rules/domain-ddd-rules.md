# Domain DDD 규칙

이 규칙은 `domain` 모듈과 도메인 모델 변경에 적용한다.

## 책임

- 도메인 entity
- value object
- domain enum
- domain service
- domain exception
- entity 분리/조합 포인트
- 여러 entity를 조합하는 도메인 규칙

## Domain Service

- Domain service는 entity 자체로 표현하기 어려운 도메인 조합을 담당한다.
- 여러 entity 관계 조합, 상태 전환, 도메인 정책 검증을 처리한다.
- Domain service는 외부 시스템 호출을 직접 수행하지 않는다.

## 금지

`domain`은 외부에 의존하지 않는다.

- DB DI 금지
- JPA repository DI 금지
- SMTP DI 금지
- S3/file system DI 금지
- Elasticsearch DI 금지
- Ollama/Spring AI DI 금지
- API DTO 의존 금지
- `infra` 의존 금지

## Port 사용 기준

- 외부 연동이 필요하면 API service가 domain 결과를 바탕으로 infra adapter를 호출하는 것을 우선한다.
- domain에 port/interface를 둘 수 있으나 기술 세부사항을 노출하지 않는다.
- port/interface에는 JPA, SMTP, S3, Elasticsearch 같은 구현 세부사항을 드러내지 않는다.
