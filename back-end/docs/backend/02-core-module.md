# Core 모듈 기준

`core`는 정말 공통적인 최소 코드만 둔다.

## 허용 범위

- 공통 exception 기반 타입
- 공통 error response
- 공통 response wrapper
- 공통 annotation 또는 marker
- 여러 모듈에서 반드시 공유해야 하는 순수 Java 유틸리티
- 외부 의존이 없거나 매우 낮은 공통 계약

## 금지 범위

`core`에는 아래 내용을 두지 않는다.

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

`JpaBaseEntity`처럼 특정 기술 의존이 있는 코드는 신중히 판단한다.

- 모든 persistence entity가 같은 기준을 공유하고, JPA 의존을 프로젝트 공통 기준으로 확정한 경우에만 검토한다.
- 특정 도메인 또는 특정 infra 구현에만 필요한 경우 `core`에 두지 않는다.

## 판단 기준

아래 질문에 모두 답할 수 있어야 `core`에 둘 수 있다.

- 두 개 이상의 모듈에서 반드시 필요한가?
- 특정 도메인 의미를 포함하지 않는가?
- 특정 API 응답 구조에 묶이지 않는가?
- 특정 외부 시스템 구현에 묶이지 않는가?
- `core`에 둬도 의존 방향이 복잡해지지 않는가?
