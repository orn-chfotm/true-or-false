---
name: swagger-documentation
description: 스프링 컨트롤러, 요청 DTO, 응답 DTO, entity, API operation 설명에 Swagger/OpenAPI annotation을 추가하거나 수정할 때 사용한다.
when_to_use: @Tag, @Operation, @Schema, 컨트롤러 설명, DTO 필드 설명, entity 필드 설명, OpenAPI 일관성을 다루는 API 문서화 작업에 사용한다.
paths:
  - "back-end/**/*"
  - "src/**/*"
  - "**/*.java"
---

# 스킬: Swagger 문서화

## 참조

- 규칙: `back-end/.claude/rules/swagger-documentation-rules.md`

## 절차

1. 각 컨트롤러에 `@Tag`를 추가한다.
2. 각 엔드포인트 메서드에 `@Operation`을 추가한다.
3. 요청 DTO와 응답 DTO에 `@Schema`를 추가한다.
4. Entity 필드에 도메인/DB 의미 설명을 추가한다.
5. 필요한 경우 비즈니스 의미, 제약 조건, lifecycle state를 설명한다.

## 체크리스트

- API 설명이 API 사용자에게 의미 있게 작성되어 있다.
- DTO 필드 설명이 도메인 의미를 설명한다.
- Entity 설명이 단순 기술 필드명에 그치지 않는다.
- 사용자/관리자 API 용어가 일관되어 있다.
