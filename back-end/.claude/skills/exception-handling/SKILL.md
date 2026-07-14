---
description: CustomException, ErrorCode enum, ExceptionHandler, 공통 error response, 도메인별 예외/enum을 추가하거나 수정할 때 사용한다.
when_to_use: RuntimeException 기반 CustomException, @RestControllerAdvice, @ExceptionHandler, HttpStatus enum 관리, error message 관리, 도메인별 예외 확장을 다룰 때 사용한다.
paths:
  - "back-end/**/*"
  - "src/**/*"
  - "**/*.java"
---

# 스킬: Exception 처리 구현

## 참조

- 규칙: `back-end/.claude/rules/exception-handling-rules.md`
- 전체 가이드: `back-end/docs/backend-architecture-guidelines.md`

## 절차

1. 공통 예외인지 도메인 전용 예외인지 먼저 판단한다.
2. 공통 예외라면 `core.exception`에 error enum과 exception을 둔다.
3. 도메인 전용 예외라면 해당 domain의 `exception` 패키지에 enum과 exception을 둔다.
4. 비즈니스 예외는 `RuntimeException`을 상속한 `CustomException` 계열로 만든다.
5. Exception message와 HTTP status는 enum에서 제공하게 한다.
6. `ExceptionHandler`는 `CustomException`을 받아 공통 error response로 변환한다.
7. Validation 예외와 예상하지 못한 예외는 별도 handler로 처리한다.
8. Controller와 service에 HTTP status/message 문자열이 흩어지지 않게 정리한다.

## 권장 구조

```text
core/
  exception/
    CustomException.java
    ErrorCode.java
    GlobalExceptionHandler.java

domain/
  policy/
    exception/
      PolicyErrorCode.java
      PolicyException.java
```

## 권장 흐름

```text
Service 또는 domain에서 CustomException 발생
ExceptionHandler가 CustomException 처리
ErrorCode enum에서 code/message/HttpStatus 조회
공통 error response DTO로 응답
```

## 체크리스트

- 비즈니스 예외가 `RuntimeException` 기반 `CustomException` 계열이다.
- Error message와 HTTP status가 enum에 있다.
- 도메인별 예외 확장이 공통 처리 흐름을 벗어나지 않는다.
- Controller가 error response를 직접 만들지 않는다.
- Service가 HTTP status를 직접 결정하지 않는다.
