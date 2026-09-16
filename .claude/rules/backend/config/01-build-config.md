---
description: "BE 빌드·설정 규칙. Gradle 멀티모듈(user-api/admin-api/domain/infra/core) + application.yml 프로필 분리. 설정은 @Value가 아니라 @ConfigurationProperties record로 받고, 시크릿은 환경변수로 주입한다."
---

# 01. 빌드 · 설정 규칙 (Gradle · yml)

이 문서는 백엔드 빌드 도구, 환경별 설정, 설정값 주입과 시크릿 관리 방식을 정의한다.

# 연관 관계

- 모듈 구조 규칙 (멀티 모듈 DDD) 참조: @.claude/rules/backend/00-module-structure.md
- JwtProvider 규칙 참조: @.claude/rules/backend/security/03-jwt-provider.md

# 적용 기준

Opinion Brief 백엔드의 빌드 도구와 설정 방식이다. 모듈 구조는 `../00-module-structure.md`, 설정 주입 원칙은 `../security/03-jwt-provider.md`(JwtProperties)와 동일하다.

# [금지사항]

- Maven을 쓰지 않는다. Gradle 멀티모듈로 구성한다.
- `application.properties`를 쓰지 않는다. `application.yml`을 쓴다.
- `@Value`로 설정에 접근하지 않는다. `@ConfigurationProperties` record로 받는다.
- 시크릿(JWT 시크릿·DB 비밀번호·PG 키 등)을 yml에 평문으로 커밋하지 않는다. 환경변수/시크릿 매니저로 주입한다.
- 모듈 `build.gradle`에서 의존을 역방향으로 걸지 않는다(`domain`이 `infra`를 compile 의존 금지).

# 설계 기준

## Gradle 멀티모듈

`settings.gradle`에 모듈을 등록하고, 루트 `build.gradle`에 공통 플러그인·의존 버전을 두며, 모듈별 `build.gradle`에서 의존을 선언한다.

```groovy
// settings.gradle
rootProject.name = 'opinion-brief'
include 'core', 'domain', 'infra', 'user-api', 'admin-api'
```

의존 방향은 `../00-module-structure.md`를 따른다. 실행 모듈(`*-api`)은 `domain`·`core`에 compile 의존하고, `infra`는 런타임에 조립한다(포트는 domain, 구현은 infra).

```groovy
// user-api/build.gradle (admin-api도 동일 패턴)
dependencies {
    implementation project(':domain')
    implementation project(':core')
    runtimeOnly project(':infra')   // 구현체는 런타임 조립 (domain은 infra를 compile 의존하지 않음)
}
```

```groovy
// domain/build.gradle
dependencies {
    implementation project(':core')   // infra 참조 금지
}

// infra/build.gradle
dependencies {
    implementation project(':domain')
    implementation project(':core')
}
```

## application.yml — 프로필 분리

공통 `application.yml` + 환경별 `application-{env}.yml`로 나누고, `spring.profiles.active`로 선택한다.

```text
src/main/resources/
  application.yml           # 공통
  application-local.yml
  application-dev.yml
  application-prod.yml
```

## 설정 주입은 @ConfigurationProperties record

설정은 `@Value`가 아니라 타입 있는 record(`@ConfigurationProperties` + `@Validated`)로 받고 제약을 검증한다(`../security/03-jwt-provider.md`의 `JwtProperties` 참고). 활성화는 `@ConfigurationPropertiesScan`.

## 시크릿은 환경변수

yml에는 환경변수 placeholder만 두고 값은 주입한다.

```yaml
spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:local}
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

jwt:
  secret: ${JWT_SECRET}                  # 커밋 금지 (../security/01-jwt.md)
  access-token-validity-ms: 1800000
  refresh-token-validity-ms: 1209600000
  issuer: opinion-brief
```

# 구현 가드레일

- 빌드는 Gradle 멀티모듈, 모듈 경계·의존 방향은 `../00-module-structure.md`와 일치시킨다.
- 설정은 `application.yml` + 프로필 분리로 관리한다.
- 설정 접근은 `@ConfigurationProperties` record(`@Validated`)로 하고 `@Value`를 쓰지 않는다.
- 시크릿은 환경변수로 주입하고 yml에 평문으로 두지 않는다.

# 검증 기준

- 모듈 의존이 `*-api → domain`, `infra → domain`, `domain → core`만 있고 `domain → infra` 역방향이 없는지 확인.
- 프로필별 yml이 활성 프로필로 로드되는지 확인.
- 설정이 record로 바인딩되고 제약 위반 시 기동 실패하는지 확인.
- 시크릿이 yml에 평문으로 없는지 확인.
