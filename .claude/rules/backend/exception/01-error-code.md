---
description: "예외/에러코드 체계. RuntimeException을 상속한 ApplicationException 최상위 + 도메인별 하위 예외, 각 예외는 ErrorCode(enum: HttpStatus+message)를 가진다. @RestControllerAdvice에서 구체→광범위 순으로 처리하고 공통 FailResponse로 반환한다."
---

# 01. 예외 · 에러코드 체계 규칙

이 문서는 예외 계층, ErrorCode와 공통 오류 응답 처리 기준을 정의한다.

# 연관 관계

- Java DTO · Response 규칙 참조: @.claude/rules/backend/java/01-dto-response.md
- 모듈 구조 규칙 (멀티 모듈 DDD) 참조: @.claude/rules/backend/00-module-structure.md

# 적용 기준

에러는 `@RestControllerAdvice`에서 처리하고, 공통 `FailResponse`(`../java/01-dto-response.md`)로 반환한다. 배치: `ErrorCode` 공통 타입·`CommonErrorCode`·`ApplicationException`·`ApiExceptionHandler`·`FailResponse`는 `core`, 도메인별 `ErrorCode` enum·예외는 `domain`(`../00-module-structure.md`).

# [금지사항]

- 메시지 문자열을 직접 담아 예외를 던지지 않는다. 모든 예외는 `ErrorCode`를 보유한 `ApplicationException`(또는 하위)로 던진다.
- Controller/Service에서 `try/catch`로 응답을 조립하지 않는다. 예외는 던지고 `@RestControllerAdvice`가 처리한다.
- `ErrorCode` 없이 `HttpStatus`를 임의로 하드코딩해 실패 응답을 만들지 않는다.
- 예외 스택트레이스·내부 메시지·SQL 등 내부 정보를 클라이언트 응답에 노출하지 않는다.
- 검증 실패를 단일 문자열로 뭉뚱그리지 않는다. 어떤 필드가 어떤 제약에 걸렸는지(field + 검증 메시지) 전달한다.
- 사용자가 입력한 원값(`rejectedValue`)을 검증 실패 응답에 담지 않는다(민감 정보 에코 방지).
- 도메인 로직에서 `RuntimeException`/`Exception`을 광범위하게 catch해 삼키지 않는다. fallback 처리는 advice에서만 한다.

# 설계 기준

## 예외 계층 — ApplicationException 최상위

- `RuntimeException`을 상속한 커스텀 최상위 예외 `ApplicationException`을 둔다.
- 그 하위로 도메인별 예외를 두고, 필요 시 계층을 확장한다.
- `ApplicationException`과 모든 하위 예외는 **`ErrorCode`(enum)를 반드시 보유**한다. 이 ErrorCode가 공통 응답 처리의 기준이 된다.

```java
@Getter
public class ApplicationException extends RuntimeException {

    private final ErrorCode errorCode;

    public ApplicationException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
```

```java
// 도메인별 하위 예외 (domain)
public class BriefNotFoundException extends ApplicationException {
    public BriefNotFoundException() {
        super(BriefErrorCode.BRIEF_NOT_FOUND);
    }
}
```

## ErrorCode — 별도 enum (HttpStatus + message)

- `ErrorCode`는 공통 interface로 두고, 공통 enum(`CommonErrorCode`)과 **도메인별 enum**(`BriefErrorCode` 등)이 구현한다. 이렇게 하면 예외가 공통/도메인 어느 enum이든 `ErrorCode`로 보유할 수 있다.
- 각 enum 상수는 `HttpStatus`와 `message`를 지정한다.

```java
public interface ErrorCode {
    HttpStatus getHttpStatus();
    String getMessage();
}
```

```java
@Getter
@RequiredArgsConstructor
public enum CommonErrorCode implements ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 입력입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
```

```java
// 도메인별 (domain)
@Getter
@RequiredArgsConstructor
public enum BriefErrorCode implements ErrorCode {
    BRIEF_NOT_FOUND(HttpStatus.NOT_FOUND, "브리프를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
```

## @RestControllerAdvice — 구체 → 광범위 순으로 처리

`@ExceptionHandler`는 예외 타입 계층에서 **가장 구체적인 핸들러**가 선택된다. 따라서 커스텀 `ApplicationException`(하위 도메인 예외 모두 포함)과 구체적인 Spring 예외를 각각 처리하고, `RuntimeException`/`Exception`은 **마지막 fallback**으로 둔다. 여러 advice로 나눌 경우 `@Order`로 우선순위를 준다.

처리 대상:
- `ApplicationException` (및 모든 하위) → 보유한 `ErrorCode`로 응답
- `MethodArgumentNotValidException` / `BindException` (jakarta validation) → 400 + 필드별 오류
- `AccessDeniedException` (Spring Security, `@PreAuthorize` 사용) → 403
- `Exception` (광범위 fallback) → 500

```java
@RestControllerAdvice
public class ApiExceptionHandler {

    // 1) 커스텀 최상위 (하위 도메인 예외 전부 포함)
    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<FailResponse<Void>> handleApplication(ApplicationException e) {
        return FailResponse.of(e.getErrorCode());
    }

    // 2) 검증 실패 — 어떤 필드가 어떤 제약에 걸렸는지 함께 전달 (원값은 미포함)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<FailResponse<List<ValidationError>>> handleValidation(MethodArgumentNotValidException e) {
        List<ValidationError> errors = e.getBindingResult().getFieldErrors().stream()
                .map(ValidationError::from)
                .toList();
        return FailResponse.of(CommonErrorCode.INVALID_INPUT, errors);
    }

    // 3) Spring Security 접근 거부 (@PreAuthorize 메서드 보안)
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<FailResponse<Void>> handleAccessDenied(AccessDeniedException e) {
        return FailResponse.of(CommonErrorCode.ACCESS_DENIED);
    }

    // 4) 광범위 fallback — 마지막
    @ExceptionHandler(Exception.class)
    public ResponseEntity<FailResponse<Void>> handleException(Exception e) {
        log.error("처리되지 않은 예외", e);
        return FailResponse.of(CommonErrorCode.INTERNAL_ERROR);
    }
}
```

필터 단계(URL 보안)에서 발생하는 인증/인가 예외는 advice가 아니라 `AuthenticationEntryPoint`/`AccessDeniedHandler`로 처리한다. `@PreAuthorize` 같은 메서드 보안 예외는 위 advice에서 처리된다.

## FailResponse는 ErrorCode 기반 + 검증 상세

- `FailResponse`는 `ErrorCode`로부터 `HttpStatus`와 `message`를 만들어 반환한다(`../java/01-dto-response.md`에 `of(ErrorCode)` 팩토리).
- 검증 실패는 어떤 필드가 어떤 제약에 걸렸는지(field + 검증 메시지)를 `data`에 담아 전달한다. 입력 원값은 담지 않는다.

```java
public record ValidationError(
        String field,    // 어떤 값(필드)이 제약에 걸렸는지
        String message   // 어떤 검증 메시지인지 (RequestDTO의 validation message)
) {
    public static ValidationError from(FieldError fieldError) {
        return new ValidationError(fieldError.getField(), fieldError.getDefaultMessage());
    }
}
```

사용자가 입력한 원값(`rejectedValue`)은 응답에 담지 않는다. 비밀번호 같은 민감 입력이 에러 응답에 에코되는 것을 막기 위해서다. "어떤 값이 제약되었는지"는 `field`(필드명) + `message`(검증 메시지)로 전달한다.

```json
{
  "status": 400,
  "timestamp": "2026-07-08T10:00:00",
  "message": "잘못된 입력입니다.",
  "data": [
    { "field": "deadlineAt", "message": "마감 시각은 미래여야 합니다." },
    { "field": "requiredApprovedCount", "message": "필요 승인 수는 1 이상이어야 합니다." }
  ]
}
```

# 구현 가드레일

- 커스텀 최상위 예외는 `RuntimeException`을 상속한 `ApplicationException`, 도메인 예외는 그 하위로 둔다.
- 모든 `ApplicationException`(및 하위)은 `ErrorCode`를 보유한다. 메시지 문자열을 직접 던지지 않는다.
- `ErrorCode`는 공통 interface로 두고 공통/도메인 enum이 구현한다. 각 상수에 `HttpStatus` + `message` 지정.
- `@RestControllerAdvice`에서 구체 예외(ApplicationException, 검증, AccessDenied)를 처리하고 `Exception`은 마지막 fallback으로 둔다.
- Controller/Service에서 try/catch로 응답을 조립하지 않는다. 예외를 던지고 advice가 처리한다.
- `FailResponse`는 `ErrorCode` 기반으로 생성한다. 검증 실패는 `ValidationError` 목록을 `data`로 전달한다.
- 도메인별 `ErrorCode` enum·예외는 `domain`, 공통 요소는 `core`에 둔다.

# 검증 기준

- 도메인 예외가 보유한 `ErrorCode`의 `HttpStatus`/`message`로 응답되는지 테스트.
- 검증 실패 시 400 + 위반 필드·검증 메시지가 `data`로 전달되고, 입력 원값이 응답에 없는지 테스트.
- `@PreAuthorize` 위반이 403으로 처리되는지 테스트.
- 처리되지 않은 예외가 500 fallback으로 처리되는지 테스트.
