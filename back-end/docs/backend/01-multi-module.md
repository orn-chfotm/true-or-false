# 멀티 모듈 구성

Back-end는 Gradle 멀티 모듈 프로젝트로 구성한다.

## 모듈

```text
back-end/
  settings.gradle
  build.gradle
  core/
  domain/
  infra/
  api-admin/
  api-user/
```

## 실행 단위

- `/api-admin`은 관리자 API application server로 별도 build/run한다.
- `/api-user`는 사용자 API application server로 별도 build/run한다.
- `core`, `domain`, `infra`는 단독 app server가 아니라 library module이다.
- `api-admin`과 `api-user`는 필요한 library module을 dependency로 주입받아 실행한다.

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

## 이름 기준

- 사용자 API 모듈명은 `api-user`를 사용한다.
- `api-member` 명칭은 사용하지 않는다.
- 관리자 API 모듈명은 `api-admin`을 사용한다.
