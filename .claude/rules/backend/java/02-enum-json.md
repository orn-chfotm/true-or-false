---
description: "enum은 계층을 관통해 enum 타입으로 전달한다. FE JSON은 enum의 value(있으면)/name(없으면)으로 매핑하고, DTO·Entity·JPA에는 enum 자체를 넘긴다. String 변환 금지."
---

# 02. Enum ↔ JSON 매핑 규칙

이 문서는 Java enum의 계층 간 전달과 요청·응답 JSON 매핑을 정의한다.

# 연관 관계

- Enum · Converter 매핑 규칙 참조: @.claude/rules/backend/jpa/05-enum-converter.md
- Java DTO · Response 규칙 참조: @.claude/rules/backend/java/01-dto-response.md

# 적용 기준

FE 요청/응답(JSON)과 내부 계층 사이에서 enum을 어떻게 다루는지 정의한다. DB 저장 형태(@Enumerated/컨버터)는 `../jpa/05-enum-converter.md`, DTO 구조는 `01-dto-response.md`.

# [금지사항]

- 요청/응답 DTO의 enum 필드를 `String`으로 받거나 내보내지 않는다. enum 타입으로 둔다.
- `toEntity`/`toDto`/Service/JPA/Entity에 enum을 `.name()`·문자열로 넘기지 않는다. enum 자체를 전달한다.
- `@JsonValue`(JSON 노출값)와 `@Enumerated`/컨버터(DB 저장값)를 혼동하지 않는다.

# 설계 기준

## enum은 enum 타입으로 관통한다

- 요청/응답 DTO의 enum 필드는 **enum 타입 그대로** 둔다. `String`으로 받거나 내보내지 않는다.
- `toEntity`/`toDto`/Service/JPA/Entity에는 enum 자체(`Status.SUCCESS`)를 넘긴다. `.name()` 같은 String 변환으로 전달하지 않는다.
- Entity 필드도 enum 타입이며, DB 저장 형태는 `../jpa/05-enum-converter.md`를 따른다.

## FE JSON 매핑: value 있으면 value, 없으면 name

- enum에 지정 `value`가 있으면 JSON은 그 value로 직렬화/역직렬화한다: `@JsonValue`(직렬화) + `@JsonCreator`(역직렬화).
- `value`가 없는 enum은 기본 동작(enum name)을 쓴다. 별도 어노테이션이 필요 없다.
- `value`의 타입·형식은 **도메인/구현에 따라 정한다**. 문자열(`"success"`)일 수도, 숫자(`0/1/2`)일 수도 있다. 내부에서는 enum 상수(`SUCCESS`/`PENDING`/`FAIL`)로 처리하고, FE 노출값만 구조에 맞게 value로 바꾼다.

value가 문자열인 enum:

```java
@Getter
@RequiredArgsConstructor
public enum Status {
    SUCCESS("success"),
    FAIL("fail");

    private final String value;

    @JsonValue
    public String getValue() {
        return value;   // 응답 JSON: "success" / "fail"
    }

    @JsonCreator
    public static Status from(String input) {
        return Arrays.stream(values())
                .filter(s -> s.value.equals(input) || s.name().equals(input))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 값: " + input));
    }
}
```

value가 숫자인 enum(예: FE에는 `0/1/2`, 내부는 enum 상수):

```java
@Getter
@RequiredArgsConstructor
public enum Status {
    SUCCESS(0),
    PENDING(1),
    FAIL(2);

    private final int value;

    @JsonValue
    public int getValue() {
        return value;   // 응답 JSON: 0 / 1 / 2
    }

    @JsonCreator
    public static Status from(int value) {
        return Arrays.stream(values())
                .filter(s -> s.value == value)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 값: " + value));
    }
}
```

value가 없는 enum(기본 name 매핑):

```java
public enum BriefStatus {
    DRAFT, OPEN, COLLECTING, REVIEWING, REPORT_GENERATING, READY, DELIVERED, ARCHIVED
    // JSON: "DRAFT" 등 name 그대로
}
```

## DTO는 enum 타입, JPA에는 enum 자체 전달

```java
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderResponse(
        Long orderId,
        Status status   // enum 타입 그대로 (JSON은 value/name으로 매핑)
) {
    public static OrderResponse toDto(Order entity) {
        return OrderResponse.builder()
                .orderId(entity.getId())
                .status(entity.getStatus())   // enum 자체, .name() 아님
                .build();
    }
}
```

```java
// Entity: enum 자체를 보관, DB 매핑은 jpa/05
@Enumerated(EnumType.STRING)
@Column(length = 20)
private Status status;   // Status.SUCCESS 그대로 들어감
```

## JSON 값과 DB 저장값은 독립

`@JsonValue`는 JSON에만 영향을 준다. `@Enumerated(EnumType.STRING)`은 enum **name**을 저장하므로, JSON이 `"success"`여도 DB에는 `"SUCCESS"`가 저장된다. DB에도 value(`success`)를 저장하려면 컨버터를 쓴다(`../jpa/05-enum-converter.md`). 두 매핑을 혼동하지 않는다.

# 구현 가드레일

- 요청/응답 DTO의 enum 필드는 enum 타입으로 둔다. String으로 받거나 내보내지 않는다.
- `value`가 있는 enum은 `@JsonValue` + `@JsonCreator`로 value(또는 name) ↔ enum을 매핑한다.
- `value`가 없는 enum은 기본 name 매핑을 쓴다(어노테이션 불필요).
- `toEntity`/`toDto`/Service/JPA/Entity에는 enum 자체를 전달한다. `.name()`·문자열 변환으로 넘기지 않는다.
- Entity 필드는 enum 타입이다. DB 저장 형태(@Enumerated/컨버터)는 `../jpa/05-enum-converter.md`를 따른다.
- `@JsonValue`(JSON)와 `@Enumerated`/컨버터(DB)는 독립임을 인지한다.

# 검증 기준

- value enum이 응답에서 value로 직렬화되고, 요청에서 value/name 모두 역직렬화되는지 테스트.
- value 없는 enum이 name으로 매핑되는지 테스트.
- 알 수 없는 값 역직렬화 시 예외(400)로 처리되는지 테스트.
- Entity·JPA에 enum 자체가 전달·저장되는지 확인.
