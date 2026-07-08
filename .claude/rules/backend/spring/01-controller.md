---
description: "Spring Controller 컨벤션. @RestController + 생성자 주입(@RequiredArgsConstructor), 버전 경로(/v1), @PreAuthorize 권한, @Valid 검증, SuccessResponse/FailResponse 반환, @RestControllerAdvice 공통 예외 처리."
---

# 01. Controller 규칙 (Spring Web)

Opinion Brief의 Controller 컨벤션이다. Controller는 `user-api` / `admin-api` 모듈에 둔다(`../00-module-structure.md`). 문서화 어노테이션(@Tag, @ApiResponses, @Schema)은 `../swagger/01-api-docs.md`.

## 금지 규칙 (하지 말 것)

- ❌ Controller에 비즈니스 로직을 넣지 않는다. 매핑 → service 위임 → 응답 변환만 한다.
- ❌ 필드 주입(`@Autowired`)을 쓰지 않는다. `final` + `@RequiredArgsConstructor` 생성자 주입.
- ❌ 응답을 Entity·원시 타입 그대로 반환하지 않는다. `SuccessResponse`/`FailResponse`로 감싼다.
- ❌ Controller에서 `try/catch`로 예외 응답을 조립하지 않는다. `@RestControllerAdvice`가 처리한다.
- ❌ `@Valid` 대신 수동 null 체크로 검증을 대체하지 않는다.

## 설계 기준

### 모든 Controller는 @RestController

응답은 전부 JSON API이므로 `@RestController`를 사용한다. 의존성은 `final` 필드 + `@RequiredArgsConstructor`로 생성자 주입한다.

- 경로는 버전 prefix를 둔다: `@RequestMapping("/v1/...")`.
- 권한은 `@PreAuthorize`로 표현한다(`../security/04-authorization.md`). 사용자/관리자 표면 분리(`../00`, `frontend/01-app-surfaces.md`)와 함께 역할을 명시한다.
- 요청 본문은 `@Valid @RequestBody`로 검증한다(`../java/01-dto-response.md`).
- 반환은 공통 `SuccessResponse` / `FailResponse`를 사용한다.

```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/briefs")
@PreAuthorize("hasRole('USER')")
public class BriefController {

    private final BriefService briefService;

    @PostMapping
    public ResponseEntity<SuccessResponse<OpinionBriefResponse>> create(
            @Valid @RequestBody CreateBriefRequest request
    ) {
        OpinionBrief saved = briefService.create(CreateBriefRequest.toEntity(request));
        return SuccessResponse.of(HttpStatus.CREATED, OpinionBriefResponse.toDto(saved));
    }

    @GetMapping("/{briefId}")
    public ResponseEntity<SuccessResponse<OpinionBriefResponse>> get(@PathVariable Long briefId) {
        OpinionBriefResponse response = briefService.getResponse(briefId);
        return SuccessResponse.of(HttpStatus.OK, response);
    }
}
```

### 공통 예외 처리 — @RestControllerAdvice

`@Valid` 검증 실패, 도메인 예외, Spring 보안 예외는 Controller에서 try/catch로 조립하지 않고 던지며, 공통 `@RestControllerAdvice`가 `FailResponse`로 변환한다. 예외 계층(`ApplicationException`)·`ErrorCode`·advice 상세는 `../exception/01-error-code.md`를 따른다.

## 구현 가드레일

- Controller에 비즈니스 로직을 넣지 않는다. 요청 매핑 → service 위임 → 응답 변환만 한다(`../00`).
- 필드 주입(`@Autowired`) 대신 `final` + `@RequiredArgsConstructor` 생성자 주입을 쓴다.
- 요청 검증은 `@Valid`로 한다. Controller에서 수동 null 체크로 대체하지 않는다.
- 응답은 항상 `SuccessResponse`/`FailResponse`로 감싼다. Entity나 원시 타입을 그대로 반환하지 않는다.
- 예외 응답은 `@RestControllerAdvice`에서 처리한다.
- 경로에 버전(`/v1`)을 둔다.

## 검증 기준

- 모든 API 응답이 `SuccessResponse`/`FailResponse` 구조인지 확인.
- 권한 없는 역할의 접근이 `@PreAuthorize`에서 차단되는지 테스트.
- 검증 실패가 `@RestControllerAdvice`를 통해 `FailResponse`로 반환되는지 테스트.
