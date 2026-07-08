---
description: "enum은 @Enumerated(STRING)으로 저장하고 ORDINAL을 금지한다. DB에 코드값을 저장하거나 저장값을 name과 분리해야 하면 AttributeConverter를 사용한다. enum·컨버터는 domain에 둔다."
---

# 05. Enum · Converter 매핑 규칙

엔티티의 enum·값 타입을 **DB에 매핑**하는 컨벤션이다. Entity·enum은 `domain` 모듈에 둔다(`../00-module-structure.md`). 상태 enum은 `../01-domain-model.md`의 상태 전이와 연결된다.

FE JSON(요청/응답)의 enum 매핑(`@JsonValue`/`@JsonCreator`, value/name)은 이 문서가 아니라 `../java/02-enum-json.md`에서 다룬다. DB 저장값(@Enumerated/컨버터)과 JSON 노출값은 독립이다.

## 금지 규칙 (하지 말 것)

- ❌ enum을 `@Enumerated(EnumType.ORDINAL)`로 저장하지 않는다. 항상 `STRING`.
- ❌ 같은 필드에 `@Enumerated`와 `@Convert`를 함께 쓰지 않는다.
- ❌ 컨버터를 null 비안전하게 두지 않는다. 알 수 없는 코드는 예외로 처리한다.
- ❌ `@Converter(autoApply = true)`를 무분별하게 전역 적용하지 않는다. 특정 필드면 `@Convert` 명시.

## 설계 기준

### enum은 @Enumerated(STRING)

- 모든 enum 필드는 `@Enumerated(EnumType.STRING)`으로 저장한다.
- `EnumType.ORDINAL`은 금지한다. enum 상수 순서가 바뀌면 기존 데이터의 의미가 깨진다.
- enum은 필요 시 라벨/설명을 필드로 가진다(값은 UPPER_SNAKE_CASE).

```java
@Getter
@RequiredArgsConstructor
public enum BriefStatus {
    DRAFT("초안"),
    OPEN("공개"),
    COLLECTING("수집 중"),
    REVIEWING("검수 중"),
    REPORT_GENERATING("리포트 생성"),
    READY("완료"),
    DELIVERED("전달"),
    ARCHIVED("보관");

    private final String description;
}
```

```java
@Enumerated(EnumType.STRING)
@Column(length = 30)
private BriefStatus status;   // DB에는 "DRAFT" 등 name 저장
```

### 코드값이 필요하면 AttributeConverter

DB에 name이 아니라 **안정적인 코드**를 저장해야 하거나, 저장값을 enum name과 분리하고 싶으면 `AttributeConverter`를 쓴다.

```java
@Getter
@RequiredArgsConstructor
public enum ResponseStatus {
    SUBMITTED("01", "검수 중"),
    APPROVED("02", "유효 반영"),
    REJECTED("03", "반영 제외"),
    NEEDS_MANUAL_REVIEW("04", "추가 검수");

    private final String code;
    private final String label;

    public static ResponseStatus fromCode(String code) {
        return Arrays.stream(values())
                .filter(s -> s.code.equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 코드: " + code));
    }
}
```

```java
@Converter
public class ResponseStatusConverter implements AttributeConverter<ResponseStatus, String> {

    @Override
    public String convertToDatabaseColumn(ResponseStatus attribute) {
        return attribute == null ? null : attribute.getCode();
    }

    @Override
    public ResponseStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ResponseStatus.fromCode(dbData);
    }
}
```

```java
@Convert(converter = ResponseStatusConverter.class)
@Column(length = 2)
private ResponseStatus status;   // DB에는 "01" 등 code 저장
```

### 공통 값 타입 컨버터 (예: Boolean ↔ Y/N)

특정 타입을 전역으로 매핑해야 하면 `@Converter(autoApply = true)`를 쓴다. 전역 적용이므로 신중히 판단하고, 특정 필드만 필요하면 `@Convert`로 명시한다.

```java
@Converter(autoApply = true)
public class BooleanToYnConverter implements AttributeConverter<Boolean, String> {

    @Override
    public String convertToDatabaseColumn(Boolean attribute) {
        return (attribute != null && attribute) ? "Y" : "N";
    }

    @Override
    public Boolean convertToEntityAttribute(String dbData) {
        return "Y".equals(dbData);
    }
}
```

## 구현 가드레일

- enum 필드는 `@Enumerated(EnumType.STRING)`으로 저장한다. `ORDINAL` 금지.
- DB에 코드값 저장이 필요하거나 저장값을 name과 분리해야 하면 `AttributeConverter`를 쓴다.
- 컨버터는 null-safe하게 구현하고, 역변환에서 알 수 없는 코드는 예외로 처리한다.
- 같은 필드에 `@Enumerated`와 `@Convert`를 함께 쓰지 않는다(컨버터를 쓰면 `@Convert`만).
- enum과 컨버터는 `domain`에 둔다(enum은 도메인 모델의 일부).
- 컬럼 길이(`@Column(length = ...)`)를 저장값(name/코드) 최대 길이에 맞춘다.
- `@Converter(autoApply = true)`는 전역 적용이므로 신중히. 특정 필드만이면 `@Convert(converter = ...)`로 명시한다.

## 검증 기준

- enum이 DB에 name/코드 문자열로 저장되고 `ORDINAL`이 아닌지 확인.
- 컨버터 왕복(enum → 저장값 → enum)이 정확한지 테스트.
- 알 수 없는 코드 역변환 시 예외가 발생하는지 테스트.
- null 값이 안전하게 처리되는지 테스트.
