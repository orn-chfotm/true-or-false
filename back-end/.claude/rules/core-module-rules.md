# Core 모듈 규칙

`core`는 정말 공통적인 최소 코드만 둔다.

## 허용

- 공통 exception 기반 타입
- 공통 error response
- 공통 response wrapper
- 공통 annotation 또는 marker
- 여러 모듈에서 반드시 필요한 순수 Java 유틸리티
- 외부 의존이 없거나 매우 낮은 공통 계약

## 금지

`core`에는 아래 코드를 두지 않는다.

```text
ProductUtil             ❌ 상품 도메인 코드
UserResponse            ❌ API 응답 DTO
SecurityUtil            ❌ 인증 관련
S3Util                  ❌ AWS/S3 관련
모든 프로젝트 Service   ❌
```

## 판단 보류

```text
JpaBaseEntity           △ JPA 의존 여부에 따라 판단
```

- JPA 의존 공통 base entity는 모든 persistence entity에 동일하게 필요할 때만 검토한다.
- 특정 domain 또는 infra 구현에만 필요한 코드는 `core`에 두지 않는다.
