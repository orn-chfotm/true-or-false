# Domain 모듈 기준

`domain`은 DDD 형태로 구성한다.

## 책임

- 도메인 entity
- value object
- domain enum
- domain service
- domain exception
- entity 분리/조합 포인트
- 여러 entity를 조합하는 도메인 규칙

## Domain Service 책임

Domain service는 entity 자체로 표현하기 어려운 도메인 조합을 담당한다.

- 여러 entity의 관계 조합
- entity 상태 전환 규칙
- 도메인 정책 검증
- value object 생성/검증
- domain exception 발생

## 금지 사항

`domain`은 외부에 의존하지 않는다.

- DB DI 금지
- JPA repository DI 금지
- SMTP DI 금지
- S3/file system DI 금지
- Elasticsearch DI 금지
- Ollama/Spring AI DI 금지
- API DTO 의존 금지
- infra module 의존 금지

## 패키지 예시

```text
domain/
  policy/
    entity/
    value/
    enums/
    service/
    exception/
```

## Domain과 Infra 연결

Domain은 infra를 직접 호출하지 않는다.

외부 연동이 필요한 경우:

- API service가 domain 결과를 바탕으로 infra adapter를 호출한다.
- 또는 domain에 순수 port/interface를 둘 수 있으나, 구현체와 DI는 infra/API 영역에서 처리한다.
- port를 둘 경우에도 JPA, SMTP, S3, Elasticsearch 같은 기술 세부사항을 노출하지 않는다.
