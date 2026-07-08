---
description: "Swagger(OpenAPI) 문서화 규칙. DTO 필드는 @Schema, Controller는 @Tag + @ApiResponses로 응답 코드·스키마를 문서화한다. 설명은 한글, 에러 응답도 명시한다."
---

# 01. Swagger 문서화 규칙 (springdoc-openapi)

Opinion Brief API의 문서화 컨벤션이다. 문서화 가능한 지점(DTO, Entity 노출부, Controller)에 Swagger 어노테이션을 붙인다. 이 규칙은 Java/Spring 규칙과 분리한다(`../java/01-dto-response.md`, `../spring/01-controller.md`).

## 금지 규칙 (하지 말 것)

- ❌ 공개 DTO 필드·주요 Controller에 문서화 어노테이션을 빠뜨리지 않는다.
- ❌ description을 영어로만 쓰지 않는다. 한글로 작성한다.
- ❌ 성공 응답만 문서화하고 주요 에러 응답(404 등)을 빠뜨리지 않는다.
- ❌ 민감 정보(원문 PII 등)를 예시 값·스키마에 노출하지 않는다.

## 설계 기준

### DTO 필드는 @Schema

요청/응답 DTO의 각 필드에 `@Schema(description = ...)`를 붙인다. 설명은 한글로 쓴다. 요청 DTO는 validation message와 함께 둔다.

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderResponse(
        @Schema(description = "주문번호")
        Long orderId,
        @Schema(description = "주문상태")
        String status,
        @Schema(description = "주문 총 금액")
        BigDecimal totalAmount,
        @Schema(description = "주문 내역 상세")
        List<OrderedDetail> orderedDetail
) {
}
```

```java
public record AddressRequest(
        @NotNull(message = "주소지 형식을 선택해주세요.")
        @Schema(description = "주소 타입 (예: REGION_ADDR, ROAD_ADDR)")
        AddressType addressType,

        @NotNull(message = "주소지를 입력해야 합니다.")
        @Schema(description = "주소지")
        String address
) {
}
```

### Controller는 @Tag + @ApiResponses

Controller에 `@Tag(name, description)`로 그룹을 지정하고, `@ApiResponses`로 성공/실패 응답 코드와 스키마를 문서화한다. 에러 응답도 예외 스키마로 명시한다.

```java
@RestController
@RequestMapping("/v1/address")
@Tag(name = "배송지", description = "배송지 관련 Api")
@ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successful",
                content = @Content(mediaType = "application/json",
                        schema = @Schema(implementation = AddressResponse.class))),
        @ApiResponse(responseCode = "404", description = "사용자 정보를 찾을 수 없습니다.",
                content = @Content(mediaType = "application/json",
                        schema = @Schema(implementation = UserNotFoundException.class)))
})
public class AddressController {
    // ...
}
```

### Entity

Entity는 API로 직접 노출하지 않지만(응답은 DTO), 필드 의미를 문서/주석으로 남길 필요가 있으면 `@Schema` 또는 주석을 단다. 문서 표면은 DTO·Controller가 우선이다.

## 구현 가드레일

- 문서화 가능한 곳(DTO 필드, Controller)에 Swagger 어노테이션을 빠짐없이 붙인다.
- 설명(description)은 한글로 쓴다.
- 성공 응답뿐 아니라 주요 에러 응답(404 등)도 `@ApiResponse`로 문서화한다.
- 문서화 어노테이션이 Java/Spring 규칙 파일이 아니라 이 규칙에 따라 관리된다는 점을 유지한다. (DTO record 정의 자체는 `../java/01`, Controller 웹 설정은 `../spring/01`)
- 민감 정보(원문 PII 등)는 예시 값·스키마에 노출하지 않는다(`../06-privacy.md`).

## 검증 기준

- 주요 Controller에 `@Tag`와 성공/실패 `@ApiResponse`가 있는지 확인.
- 공개 DTO 필드에 `@Schema` 설명이 있는지 확인.
- Swagger UI에서 요청/응답 스키마와 에러 코드가 노출되는지 확인.
