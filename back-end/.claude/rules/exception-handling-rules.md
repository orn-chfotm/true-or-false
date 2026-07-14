# Exception 처리 규칙

이 규칙은 back-end 예외 처리, 에러 응답, 도메인별 예외 확장 작업에 적용한다.

## 공통 처리

- Exception은 `ExceptionHandler`에서 공통으로 관리한다.
- 공통 handler는 `@RestControllerAdvice` 기반으로 작성한다.
- API layer와 service layer에서 에러 응답 DTO를 직접 조립하지 않는다.
- 모든 API 에러 응답은 공통 error response DTO를 사용한다.

## CustomException

- 비즈니스 예외는 `RuntimeException`을 상속한 `CustomException` 계열로 처리한다.
- `CustomException`은 error enum을 보유한다.
- `CustomException`은 message와 HTTP status를 직접 문자열/상수로 중복 관리하지 않는다.
- 도메인별 예외가 필요하면 `CustomException`을 상속한 도메인 exception을 추가할 수 있다.

## Error Enum

- Exception 관련 message와 HTTP status code는 enum으로 관리한다.
- 공통 error enum은 `core.exception`에 둔다.
- 도메인별 error enum은 각 domain의 exception 패키지에 둘 수 있다.
- Error enum은 최소한 error code, message, HTTP status를 제공해야 한다.
- Controller나 service에서 HTTP status와 message 문자열을 직접 흩뿌리지 않는다.

## 확장 규칙

- 공통 예외는 `core.exception`에서 관리한다.
- 도메인 전용 예외는 해당 domain 내부 exception 패키지에서 관리한다.
- Domain별 enum과 exception은 공통 `CustomException` 처리 흐름에 연결되어야 한다.
- `ExceptionHandler`는 공통 `CustomException`을 우선 처리하고, validation 예외와 예상하지 못한 예외를 별도로 처리한다.

권장 구조:

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
