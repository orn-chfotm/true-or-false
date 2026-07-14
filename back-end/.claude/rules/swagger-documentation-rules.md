# Swagger 문서화 규칙

이 규칙은 API 문서화와 모델 설명 작성에 적용한다.

## OpenAPI

- API 문서화는 Swagger/OpenAPI를 사용한다.
- 컨트롤러에는 `@Tag`를 작성한다.
- API 메서드에는 `@Operation`을 작성한다.
- Request DTO에는 의미 있는 `@Schema` 설명을 작성한다.
- Response DTO에는 의미 있는 `@Schema` 설명을 작성한다.
- Entity에는 DB/도메인 의미를 설명하는 schema 또는 필드 설명을 작성한다.

## 설명 품질

- 문서 설명은 단순 기술 필드명이 아니라 도메인 의미를 설명해야 한다.
- 필요한 경우 제약 조건, lifecycle status, 비즈니스 의미를 함께 설명한다.
- 설명은 사용자 API와 관리자 API에서 사용하는 도메인 용어와 일관되어야 한다.
