# Gradle 모듈 경계 규칙

이 규칙은 back-end Gradle 멀티 모듈 구조에 적용한다.

## 모듈

기본 모듈은 다음과 같다.

```text
core
domain
infra
api-admin
api-user
```

- `api-admin`은 관리자 API app server로 별도 build/run한다.
- `api-user`는 사용자 API app server로 별도 build/run한다.
- `core`, `domain`, `infra`는 단독 app server가 아닌 library module이다.
- `api-member` 명칭은 사용하지 않는다.

## 의존 방향

허용 의존 방향:

```text
api-admin -> core, domain, infra
api-user  -> core, domain, infra
infra     -> core, domain
domain    -> core
core      -> no project dependency
```

금지 의존 방향:

```text
core   -> api-admin, api-user, domain, infra
domain -> api-admin, api-user, infra
infra  -> api-admin, api-user
```

## 모듈 책임

- `core`: 정말 공통적인 최소 코드
- `domain`: DDD 도메인 모델, entity, value object, domain service
- `infra`: DB persistence, S3/file system, SMTP, Elasticsearch, AI 등 외부 연동
- `api-admin`: 관리자 controller, DTO, API service, application server
- `api-user`: 사용자 controller, DTO, API service, application server

## 금지 사항

- `core`에 도메인 코드, API DTO, 인증 구현, AWS/S3 구현, 전체 service를 넣지 않는다.
- `domain`은 `infra`에 의존하지 않는다.
- API 모듈은 JPA repository interface를 직접 사용하지 않는다.
- API 모듈의 controller가 infra 구현체를 직접 조합하지 않는다.
