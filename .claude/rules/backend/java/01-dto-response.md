---
description: "Java DTO/Response/Entity 변환 규칙. DTO는 record + Builder + 정적 팩토리(toDto/toEntity), null 제외, 요청은 jakarta.validation, Entity는 @NoArgsConstructor + 도메인 메서드로 불변 변경. 공통 응답은 Success/Fail 래퍼."
---

# 01. Java DTO · Response 규칙

Opinion Brief 백엔드(Java 21 / Spring Boot 3 / JPA)의 DTO·응답·엔티티 변환 컨벤션이다. 이 문서는 순수 Java/데이터 형태 규칙만 다룬다. Controller는 `../spring/01-controller.md`, Service는 `../spring/02-service.md`, 문서화(@Schema 등)는 `../swagger/01-api-docs.md`. 모듈 배치는 `../00-module-structure.md`(DTO·Entity는 `domain`, 공통 응답은 `core`).

## 금지 규칙 (하지 말 것)

- ❌ DTO를 `record`가 아닌 형태로 만들거나 DTO에 `@NoArgsConstructor`를 쓰지 않는다.
- ❌ Entity를 API 응답으로 직접 직렬화하지 않는다. `toDto`로 변환한다.
- ❌ enum 필드를 `.name()`·`String`으로 변환해 담지 않는다(`02-enum-json.md`).
- ❌ Entity에 `@Setter`를 두지 않는다. 상태 변경은 도메인 메서드로만.
- ❌ `@JsonInclude(JsonInclude.Include.NON_NULL)` 없이 DTO를 두지 않는다(null 노출 금지).
- ❌ Spring Data `Page<>` 등 프레임워크 타입을 응답으로 반환하지 않는다. `PageResponse<T>`로 변환한다.

## 설계 기준

### DTO는 record

- 요청/응답 DTO는 `record`로 통일한다(불변).
- `record`는 canonical 생성자를 이미 가지므로 `@NoArgsConstructor`를 쓰지 않는다. 생성은 `@Builder` + 정적 팩토리(`toDto`/`toEntity`)로 통제한다.
- `@JsonInclude(JsonInclude.Include.NON_NULL)`로 null 필드는 직렬화/역직렬화에서 제외한다.
- Swagger `@Schema` 같은 문서화 어노테이션도 DTO에 붙지만, 그 정책은 `../swagger/01-api-docs.md`에서 정의한다.

### ResponseDTO — Entity를 toDto로 변환

Entity를 받아 응답 형태로 변환하는 정적 팩토리 `toDto`로 생성한다. Entity를 그대로 API에 노출하지 않는다(`../00`, `../06`).

```java
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OpinionBriefResponse(
        Long id,
        String title,
        BriefStatus status,   // enum 타입 그대로 (JSON 매핑은 02-enum-json)
        LocalDateTime deadlineAt
) {
    public static OpinionBriefResponse toDto(OpinionBrief entity) {
        return OpinionBriefResponse.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .status(entity.getStatus())   // enum 자체, .name() 아님
                .deadlineAt(entity.getDeadlineAt())
                .build();
    }
}
```

### RequestDTO — jakarta.validation + 정적 toEntity

필수값·제약은 `jakarta.validation` 어노테이션(+ 한글 message)으로 표현한다. Controller에서 `@Valid`로 검증한다(`../spring/01-controller.md`). RequestDTO는 정적 `toEntity(request)`로 Entity를 Builder로 생성한다.

```java
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CreateBriefRequest(
        @NotBlank(message = "제목을 입력해주세요.")
        String title,

        @NotNull(message = "마감 시각을 입력해주세요.")
        @Future(message = "마감 시각은 미래여야 합니다.")
        LocalDateTime deadlineAt,

        @NotNull(message = "필요 승인 수를 입력해주세요.")
        @Positive(message = "필요 승인 수는 1 이상이어야 합니다.")
        Integer requiredApprovedCount
) {
    public static OpinionBrief toEntity(CreateBriefRequest request) {
        return OpinionBrief.builder()
                .title(request.title())
                .deadlineAt(request.deadlineAt())
                .requiredApprovedCount(request.requiredApprovedCount())
                .status(BriefStatus.DRAFT)
                .build();
    }
}
```

### Entity — @NoArgsConstructor + 도메인 메서드로 불변 변경

Entity는 `@Setter`를 두지 않는다. 생성은 생성자 `@Builder`, 상태 변경은 의도가 드러나는 도메인 메서드로만 한다(`../01-domain-model.md`의 상태 전이). JPA를 위해 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`를 둔다(외부 무분별 생성 차단).

```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OpinionBrief {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Enumerated(EnumType.STRING)
    private BriefStatus status;

    private LocalDateTime deadlineAt;

    private Integer requiredApprovedCount;

    @Builder
    private OpinionBrief(String title, BriefStatus status, LocalDateTime deadlineAt, Integer requiredApprovedCount) {
        this.title = title;
        this.status = status;
        this.deadlineAt = deadlineAt;
        this.requiredApprovedCount = requiredApprovedCount;
    }

    // 상태 변경은 setter가 아니라 도메인 메서드로
    public void open() {
        if (this.status != BriefStatus.DRAFT) {
            throw new IllegalStateException("draft 상태에서만 공개할 수 있습니다: " + this.status);
        }
        this.status = BriefStatus.OPEN;
    }
}
```

### 공통 응답 — SuccessResponse / FailResponse

성공/실패 응답은 공통 구조(HTTP 상태 코드, 응답 시각, `<T> data`)를 가진다. 정적 팩토리로 공통 필드를 채운다. 위치는 `core`(전 api 모듈 공유).

```java
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SuccessResponse<T>(
        int status,
        LocalDateTime timestamp,
        T data
) {
    public static <T> ResponseEntity<SuccessResponse<T>> of(HttpStatus status, T data) {
        SuccessResponse<T> body = SuccessResponse.<T>builder()
                .status(status.value())
                .timestamp(LocalDateTime.now())
                .data(data)
                .build();
        return ResponseEntity.status(status).body(body);
    }
}
```

```java
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FailResponse<T>(
        int status,
        LocalDateTime timestamp,
        String message,
        T data
) {
    public static <T> ResponseEntity<FailResponse<T>> of(HttpStatus status, String message, T data) {
        FailResponse<T> body = FailResponse.<T>builder()
                .status(status.value())
                .timestamp(LocalDateTime.now())
                .message(message)
                .data(data)
                .build();
        return ResponseEntity.status(status).body(body);
    }

    public static ResponseEntity<FailResponse<Void>> of(HttpStatus status, String message) {
        return of(status, message, null);
    }

    // ErrorCode 기반 (예외 처리에서 사용, ../exception/01-error-code.md)
    public static ResponseEntity<FailResponse<Void>> of(ErrorCode errorCode) {
        return of(errorCode.getHttpStatus(), errorCode.getMessage(), null);
    }

    public static <T> ResponseEntity<FailResponse<T>> of(ErrorCode errorCode, T data) {
        return of(errorCode.getHttpStatus(), errorCode.getMessage(), data);
    }
}
```

예외는 Controller에서 try/catch로 조립하지 않고 던지며, 공통 `@RestControllerAdvice`가 `FailResponse`로 변환한다. 예외 계층·ErrorCode·advice 규칙은 `../exception/01-error-code.md`.

### 페이지 응답 — PageResponse

목록/페이지 조회에서 Spring Data `Page<>`를 응답으로 노출하지 않는다. 공통 `PageResponse<T>`로 변환해 JSON 구조를 일관되게 맞춘다. 위치는 `core`.

```java
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
    public static <T> PageResponse<T> of(Page<T> page) {
        return PageResponse.<T>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}
```

- `Page<>`는 Repository → Service 내부에서만 쓰고, Service는 `PageResponse.of(page)`로 변환해 반환한다(`../spring/02-service.md`, `../jpa/04-querydsl.md`).
- Controller는 `PageResponse<XxxResponse>`를 `SuccessResponse.of()`로 감싼다.

## 구현 가드레일

- DTO는 `record`로 통일한다. `@NoArgsConstructor`는 DTO에 쓰지 않고 Entity에만 둔다.
- DTO 생성은 `@Builder` + 정적 팩토리(`toDto`/`toEntity`)로만 한다.
- 모든 DTO·응답에 `@JsonInclude(JsonInclude.Include.NON_NULL)`를 붙인다.
- ResponseDTO는 `toDto(Entity)`로만 만든다. Entity를 직접 직렬화하지 않는다.
- enum 필드는 enum 타입으로 담는다(`.name()`·String 변환 금지). JSON 매핑은 `02-enum-json.md`.
- RequestDTO는 `jakarta.validation`(+ 한글 message)으로 제약을 표현한다. 검증 실행은 Controller `@Valid`, 도메인 규칙 검증은 `domain/service`.
- Entity에 `@Setter`를 두지 않는다. 변경은 도메인 메서드로 불변식을 지키며 수행한다.
- Entity는 `@NoArgsConstructor(access = AccessLevel.PROTECTED)` + 생성자 `@Builder`.
- `SuccessResponse`/`FailResponse`는 `core`에 둔다.

## 검증 기준

- 응답 JSON에 null 필드가 나타나지 않는지 확인.
- 필수값 누락 요청이 `@Valid`에서 400 + `FailResponse`로 반환되는지 테스트.
- Entity에 public setter가 없고 상태 변경이 도메인 메서드로만 되는지 확인.
- Response에 Entity가 직접 노출되지 않는지 확인.
