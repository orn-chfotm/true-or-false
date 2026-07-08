---
description: "인가는 @PreAuthorize로 통일한다. 한 계정 = 한 권한(다중 권한·AND 조건 없음). 여러 역할 허용은 hasAnyRole(OR)로 넓힌다. 컨트롤러 기본 + 메서드 override, 역할은 Role enum."
---

# 04. 인가(권한) 규칙 — @PreAuthorize 통일

권한 검사 방식을 정의한다. 권한 검사는 api 모듈 컨트롤러에서 `@PreAuthorize`로 한다. 역할 모델(`Role` enum)은 `core`, 필터·401/403은 `02-filter-chain.md`, JWT 권한 주입은 `03-jwt-provider.md`.

## 금지 규칙 (하지 말 것)

- ❌ `@Secured`/`@RolesAllowed`를 쓰지 않는다. `@PreAuthorize`로 통일한다.
- ❌ 한 계정에 여러 권한을 부여하거나 AND 조건(`hasRole(...) and hasRole(...)`)을 쓰지 않는다. **한 계정 = 한 권한**.
- ❌ 인가를 컨트롤러 코드 내부 `if` 분기로 처리하지 않는다. `@PreAuthorize`로 선언한다.
- ❌ 메서드에서 권한을 재정의할 때 일부만 적지 않는다. 메서드 `@PreAuthorize`가 클래스 것을 override하므로 필요한 역할을 **전부** 명시한다.
- ❌ `hasRole` 인자에 `ROLE_` 접두어를 넣지 않는다(`hasRole('ADMIN')`). authority 문자열에만 `ROLE_`을 둔다.

## 설계 기준

### @PreAuthorize로 통일

모든 권한 검사는 `@PreAuthorize`로 한다. `@EnableMethodSecurity`는 기본값(`prePostEnabled = true`)으로 활성화한다(`02-filter-chain.md`). `@Secured`/`@RolesAllowed`는 쓰지 않는다.

### 한 계정 = 한 권한 (AND 없음)

- 계정마다 권한 유형은 **1개**다(예: `ROLE_USER` 또는 `ROLE_ADMIN`). 다중 권한·AND 조건은 존재하지 않는다.
- 하나의 API를 여러 역할이 접근할 수 있어야 하면 **OR(`hasAnyRole`)** 로 넓힌다. AND는 쓰지 않는다.

### 역할 모델

- `ROLE_USER`: `user-api` 일반 사용자. **요청자(의뢰자)와 참여자는 별도 역할이 아니다** — 사용자는 요청자가 될 수 있고, 권한은 우선 하나(`USER`)다. 요청자/참여자 구분은 역할이 아니라 **소유권·도메인 검증**으로 한다(자기 Brief만 접근하는 IDOR 방지, 유효 슬롯 보유 여부 등 — `../06-privacy.md`, `backend-api-design` 스킬).
- `ROLE_ADMIN`: `admin-api` 관리자. **우선 단일 권한**으로 간다.
- 관리자 권한 세분화(예: `ROLE_OPERATE_ADMIN`)가 추후 생길 수 있어 공통 구조로 잡되, 지금은 `ADMIN` 하나다.

```java
// core
@Getter
@RequiredArgsConstructor
public enum Role {
    USER("ROLE_USER"),
    ADMIN("ROLE_ADMIN");

    private final String authority;
}
```

### 컨트롤러 기본 + 메서드 override

컨트롤러 클래스에 기본 권한을 `@PreAuthorize`로 두고, 특정 메서드가 다른 역할 범위를 요구하면 메서드에 `@PreAuthorize`를 둔다. 메서드가 클래스 것을 override하므로 **필요한 역할을 전부 다시 명시**한다.

```java
@RestController
@RequestMapping("/v1/admin/briefs")
@PreAuthorize("hasRole('ADMIN')")   // 클래스 기본: 관리자만
public class AdminBriefController {

    @PostMapping("/{id}/approve")
    public ResponseEntity<SuccessResponse<Void>> approve(@PathVariable Long id) {
        // ADMIN
    }

    // 추후 여러 관리자 역할 허용(OR). 메서드가 클래스를 override → ADMIN도 다시 명시
    @PostMapping("/{id}/operate")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATE_ADMIN')")
    public ResponseEntity<SuccessResponse<Void>> operate(@PathVariable Long id) {
        // ADMIN 또는 OPERATE_ADMIN 계정
    }
}
```

`hasAnyRole('ADMIN','OPERATE_ADMIN')`은 "이 API를 **ADMIN 또는 OPERATE_ADMIN 계정**이 접근 가능"이라는 OR 확장이다. 한 계정이 두 권한을 동시에 갖는 AND가 아니다(한 계정 = 한 권한).

`user-api` 컨트롤러는 `@PreAuthorize("hasRole('USER')")`를 기본으로 둔다.

## 구현 가드레일

- 모든 권한 검사는 `@PreAuthorize`. `@Secured`/`@RolesAllowed` 금지.
- 한 계정 한 권한. AND 조건 없음. 역할 확장은 `hasAnyRole`(OR).
- 클래스 기본 `@PreAuthorize` + 메서드 override 시 필요한 역할 전부 명시.
- 역할은 `Role` enum(`core`), authority는 `ROLE_` 접두어. `hasRole` 인자엔 접두어 제외.
- `@EnableMethodSecurity`는 기본(prePostEnabled) 활성.

## 검증 기준

- `user-api`는 `ROLE_USER`, `admin-api`는 `ROLE_ADMIN` 계정만 접근되는지 테스트.
- `hasAnyRole`(OR) 메서드가 해당 역할들에서 접근되는지 테스트.
- 권한 없는 접근이 403으로 처리되는지 테스트(`02-filter-chain.md`, `../exception/01-error-code.md`).
