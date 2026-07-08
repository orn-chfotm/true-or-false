---
description: "JWT 인증 정책. access token은 짧은 만료로 Authorization Bearer, refresh token은 httpOnly secure SameSite 쿠키로 발급·회전한다. 시크릿은 환경변수, 검증 실패는 401/403. JWT 유틸은 core, 필터·쿠키 설정은 api 모듈."
---

# 01. JWT 인증 규칙

Opinion Brief의 JWT 인증 정책이다. FE 토큰 정책(`frontend/typescript/02-api-client-auth.md`)과 짝을 이룬다. 배치: JWT 유틸(발급·검증)은 `core`(`../00-module-structure.md`의 "core: jwt 공통"), 시큐리티 필터체인·쿠키 설정은 각 api 모듈(`user-api`/`admin-api`), refresh 무효화 저장소는 `infra`(Redis).

## 금지 규칙 (하지 말 것)

- ❌ refresh token을 응답 본문(JSON)으로 내려주지 않는다. httpOnly + Secure + SameSite 쿠키로만 설정한다.
- ❌ access token을 긴 만료로 발급하지 않는다. 짧게 둔다.
- ❌ JWT 시크릿/키를 코드·설정 파일에 하드코딩하거나 커밋하지 않는다. 환경변수/시크릿 매니저를 쓴다.
- ❌ 서명·만료·issuer 검증 없이 토큰을 신뢰하지 않는다.
- ❌ refresh 쿠키를 `HttpOnly`/`Secure`/`SameSite` 없이 설정하지 않는다.
- ❌ CORS `allowedOrigins`를 와일드카드(`*`)로 열면서 `allowCredentials`를 켜지 않는다(withCredentials 대응).

## 설계 기준

### 토큰 종류

- **Access token**: 짧은 만료(예: 15~30분). `Authorization: Bearer`로 전달. 검증 후 `SecurityContext`에 인증 설정.
- **Refresh token**: 긴 만료(예: 7~14일). httpOnly + Secure + SameSite 쿠키로 발급. `/refresh`에서만 사용.

### 로그인

access token은 응답 본문(`SuccessResponse<data>`)에, refresh token은 Set-Cookie로 내린다.

```text
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/v1/auth; Max-Age=1209600
```

`SameSite` 값은 아래 "배포 전제 · CORS"의 도메인 구성 기준을 따른다(서브도메인이면 Strict, 다른 도메인이면 None).

### 재발급 (/refresh)

쿠키의 refresh token을 검증해 새 access token을 본문으로 발급한다. **refresh 회전(rotation)** 을 권장한다: 사용 시 새 refresh를 재발급하고 기존 것을 무효화한다.

### 로그아웃

refresh 쿠키를 만료(`Max-Age=0`)시키고, 필요 시 refresh 무효화 저장소(Redis 블랙/화이트리스트)로 폐기한다.

### 검증·필터

- JWT 필터에서 `Authorization: Bearer` access token을 검증(서명·만료·issuer)하고, 유효하면 `SecurityContext`에 인증을 설정한다.
- 인증 실패(비로그인·토큰 만료) → **401**(`AuthenticationEntryPoint`), 권한 부족 → **403**(`AccessDeniedHandler`). 이 필터 단계 예외는 `@RestControllerAdvice`가 아니라 시큐리티 핸들러에서 처리한다(`../exception/01-error-code.md`).
- 메서드 보안(`@PreAuthorize`)과 함께 사용한다(`04-authorization.md`).

### 서명·시크릿

- HS256(대칭 시크릿) 또는 RS256(키쌍)을 쓴다. 시크릿/키는 환경변수·시크릿 매니저로 주입한다.

### 배포 전제 · CORS

- **FE와 BE는 별도 서버에 배포한다(cross-origin).** BE가 CORS로 FE origin을 명시 허용하는 방식으로 통신한다.
- FE `withCredentials`(httpOnly refresh 쿠키 전송)를 위해 `allowedOrigins`를 명시(와일드카드 금지)하고 `allowCredentials = true`로 설정한다(`02-filter-chain.md`).
- refresh 쿠키의 `SameSite`는 도메인 구성에 따라 정한다.
  - FE/BE가 **같은 등록 도메인의 서브도메인**(예: `app.example.com` ↔ `api.example.com`)이면 `SameSite=Strict` 유지.
  - FE/BE가 **서로 다른 도메인**이면 `SameSite=None; Secure`로 설정한다(그렇지 않으면 브라우저가 쿠키를 전송하지 않음). 이 경우 CSRF 노출면이 넓어지므로 CORS origin 명시 허용을 CSRF 방어선으로 유지한다.

## 예시

```java
// 로그인: access는 본문, refresh는 httpOnly 쿠키 (03-jwt-provider의 JwtToken)
@PostMapping("/v1/auth/login")
public ResponseEntity<SuccessResponse<LoginResponse>> login(
        @Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    JwtToken token = authService.login(request);

    ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", token.refreshToken())
            .httpOnly(true).secure(true).sameSite("Strict")
            .path("/v1/auth").maxAge(Duration.ofDays(14))
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

    return SuccessResponse.of(HttpStatus.OK, new LoginResponse(token.accessToken())); // refresh는 본문에 없음
}
```

```java
// 로그아웃: refresh 쿠키 만료
ResponseCookie expired = ResponseCookie.from("refreshToken", "")
        .httpOnly(true).secure(true).sameSite("Strict").path("/v1/auth").maxAge(0).build();
response.addHeader(HttpHeaders.SET_COOKIE, expired.toString());
```

## 구현 가드레일

- access는 짧은 만료, refresh는 httpOnly + Secure + SameSite 쿠키로 발급한다.
- refresh token은 응답 본문에 노출하지 않는다. 쿠키로만 관리한다.
- JWT 시크릿/키는 환경변수·시크릿 매니저로 주입하고 커밋하지 않는다.
- 토큰 검증 실패는 401, 권한 부족은 403으로 처리한다.
- refresh 회전과 무효화 저장소를 둔다.
- JWT 유틸은 `core`, 필터·쿠키 설정은 api 모듈, 무효화 저장소는 `infra`.

## 검증 기준

- access 만료 후 `/refresh`로 재발급되는지, refresh 회전이 동작하는지 테스트.
- refresh 쿠키가 `HttpOnly`/`Secure`/`SameSite`로 설정되고 본문에 없는지 확인.
- 만료·위조 토큰이 401로 거부되는지, 권한 부족이 403인지 테스트.
- CORS가 origin 명시 + `allowCredentials`로 설정됐는지 확인.
