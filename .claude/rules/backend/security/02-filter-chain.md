---
description: "Spring Security 필터체인 설정. SecurityFilterChain 빈 방식, STATELESS 세션, JWT 인증 필터, 401/403을 FailResponse로 반환, CORS allowCredentials, @EnableMethodSecurity(@PreAuthorize), BCrypt. user-api/admin-api가 각자 필터체인을 둔다."
---

# 02. Spring Security 필터체인 규칙

Opinion Brief의 시큐리티 필터체인 구성이다. JWT 토큰 정책은 `01-jwt.md`, 401/403 처리는 `../exception/01-error-code.md`, `@PreAuthorize` 메서드 보안은 `04-authorization.md`. 필터체인은 각 api 모듈(`user-api`/`admin-api`)에 두고, JWT 유틸은 `core`(`../00-module-structure.md`).

## 금지 규칙 (하지 말 것)

- ❌ `WebSecurityConfigurerAdapter`를 쓰지 않는다(제거됨). `SecurityFilterChain` 빈 방식으로 구성한다.
- ❌ 세션을 쓰지 않는다. `SessionCreationPolicy.STATELESS`.
- ❌ 인증/인가 실패를 기본 HTML·기본 응답으로 두지 않는다. `FailResponse` JSON으로 반환한다.
- ❌ 401/403 응답을 Map 등으로 수동 조립하지 않는다. `ErrorCode`에서 status·message를 가져와 `FailResponse`를 직렬화한다.
- ❌ CORS `allowedOrigins`를 와일드카드(`*`)로 열면서 `allowCredentials(true)`를 함께 쓰지 않는다.
- ❌ 인증이 필요한 엔드포인트를 `permitAll`로 열지 않는다. `login`/`refresh` 등만 허용한다.
- ❌ 비밀번호를 평문·약한 해시로 저장하지 않는다. `BCrypt` 등 강한 해시를 쓴다.
- ❌ `formLogin`/`httpBasic` 등 불필요한 기본 인증 방식을 켜두지 않는다.

## 설계 기준

### SecurityFilterChain (컴포넌트 방식)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // @PreAuthorize 기본 활성(prePostEnabled) (04-authorization.md)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ApiAuthenticationEntryPoint authenticationEntryPoint; // 401
    private final ApiAccessDeniedHandler accessDeniedHandler;           // 403

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)     // stateless Bearer API (refresh 쿠키는 SameSite로 방어)
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/v1/auth/login", "/v1/auth/refresh").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint) // 401
                .accessDeniedHandler(accessDeniedHandler)           // 403
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### JWT 인증 필터

`OncePerRequestFilter`로 `Authorization: Bearer` access token을 검증하고 `SecurityContext`에 인증을 설정한다. 검증 실패 시 인증을 설정하지 않고 통과시켜, 인가 단계에서 401/403으로 처리되게 한다.

```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider; // core

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = resolveToken(request);
        if (token != null && jwtProvider.validate(token)) {
            SecurityContextHolder.getContext().setAuthentication(jwtProvider.getAuthentication(token));
        }
        chain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader(HttpHeaders.AUTHORIZATION);
        return (bearer != null && bearer.startsWith("Bearer ")) ? bearer.substring(7) : null;
    }
}
```

### 401 / 403을 FailResponse로 반환

필터 단계의 인증 실패(401)·인가 실패(403)는 `AuthenticationEntryPoint`·`AccessDeniedHandler`에서 공통 `FailResponse` JSON으로 반환한다(`../exception/01`, `../java/01`).

status·message는 임의 문자열이 아니라 항상 `ErrorCode`에서 가져온다(`../exception/01-error-code.md`). advice에서 `ApplicationException.getErrorCode()`로 처리하는 것과 같은 원칙이다.

```java
@Component
@RequiredArgsConstructor
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper; // LocalDateTime 직렬화를 위해 JavaTimeModule 등록 필요

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException e) throws IOException {
        ErrorCode errorCode = CommonErrorCode.UNAUTHORIZED; // status·message의 단일 소스

        res.setStatus(errorCode.getHttpStatus().value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");

        FailResponse<Void> body = FailResponse.<Void>builder()
                .status(errorCode.getHttpStatus().value())
                .timestamp(LocalDateTime.now())
                .message(errorCode.getMessage())
                .build();
        objectMapper.writeValue(res.getWriter(), body); // Map 수동 조립 금지, FailResponse 그대로 직렬화
    }
}
```

`ApiAccessDeniedHandler`도 같은 방식으로 `CommonErrorCode.ACCESS_DENIED`에서 status·message를 가져와 403 `FailResponse`를 만든다. **메서드 보안(`@PreAuthorize`)에서 던지는 `AccessDeniedException`은 이 핸들러가 아니라 `@RestControllerAdvice`가 처리한다**(`../exception/01`). 필터 단계(`authorizeHttpRequests`)의 인가 실패만 `AccessDeniedHandler`가 처리한다.

### CORS

FE `withCredentials`(httpOnly 쿠키)를 위해 origin을 명시하고 `allowCredentials(true)`로 둔다(`01-jwt.md`).

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://app.example.com")); // 와일드카드 금지
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

### user-api / admin-api 필터체인 분리

`user-api`와 `admin-api`는 각자 `SecurityConfig`를 둔다. 허용 경로와 역할 기준이 다르다(예: `admin-api`는 대부분 `ROLE_ADMIN` 요구). 역할 세부는 `@PreAuthorize`(메서드 보안)로 표현한다(`04-authorization.md`).

## 구현 가드레일

- `SecurityFilterChain` 빈으로 구성하고, `STATELESS` 세션 + JWT 필터를 쓴다.
- `login`/`refresh` 등 최소 엔드포인트만 `permitAll`, 나머지는 `authenticated`.
- 401/403은 `AuthenticationEntryPoint`/`AccessDeniedHandler`에서 `FailResponse` JSON으로 반환한다.
- `@EnableMethodSecurity`(기본 `prePostEnabled`)로 `@PreAuthorize`를 활성화한다.
- CORS는 origin 명시 + `allowCredentials(true)`.
- 비밀번호는 `BCryptPasswordEncoder`로 해시한다.
- JWT 유틸은 `core`, 필터체인·핸들러는 각 api 모듈에 둔다.

## 검증 기준

- 미인증 요청이 401, 권한 부족(필터 단계)이 403 `FailResponse`로 반환되는지 테스트.
- 유효 Bearer 토큰이 `SecurityContext`에 인증을 설정하는지 테스트.
- `permitAll` 경로가 토큰 없이 접근되는지, 그 외는 차단되는지 테스트.
- CORS preflight가 명시 origin + credentials로 통과하는지 확인.
