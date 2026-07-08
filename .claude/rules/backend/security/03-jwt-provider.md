---
description: "JwtProvider는 토큰 생성(JwtPayload 입력)과 검증(String 토큰 입력)을 담당하는 OO 컴포넌트다. 설정은 @Value가 아니라 @ConfigurationProperties record(JwtProperties)로 제약과 함께 주입한다. JWT 타입은 core."
---

# 03. JwtProvider 규칙

토큰 생성·검증을 담당하는 `JwtProvider`와 값 객체·설정 규칙이다. 정책은 `01-jwt.md`, 필터 사용은 `02-filter-chain.md`. 배치: `JwtProvider`·`JwtPayload`·`JwtToken`·`JwtProperties`는 `core`(`../00-module-structure.md`의 "core: jwt 공통").

## 금지 규칙 (하지 말 것)

- ❌ `@Value`로 프로퍼티에 접근하지 않는다. `@ConfigurationProperties` record(`JwtProperties`)로 주입한다.
- ❌ `JwtProvider`를 `static` 유틸 클래스로 만들지 않는다. 주입 가능한 컴포넌트 + 불변 값 객체로 OO 구성한다.
- ❌ 토큰 생성 입력을 원시 파라미터 나열로 받지 않는다. `JwtPayload` DTO로 받는다.
- ❌ 검증 메서드에 `JwtPayload`를 받지 않는다. 검증은 `String` 토큰을 받는다.
- ❌ 시크릿·만료를 코드에 하드코딩하지 않는다. properties + 환경변수(`01-jwt.md`).
- ❌ 프로퍼티 제약(시크릿 길이·만료 양수 등) 검증을 생략하지 않는다.

## 설계 기준

### 역할 분리: 생성은 JwtPayload, 검증은 String

- **생성**: `JwtProvider`는 `JwtPayload`(값 객체)를 받아 토큰을 만든다. `JwtPayload`는 로그인 성공 후 토큰 발급 시 사용하는 DTO다(subject·role 등 클레임). 한 계정 = 한 권한이므로 `role`은 단일이다(`04-authorization.md`).
- **검증**: `JwtProvider`는 `String` JWT 토큰을 받아 유효성·인증을 처리한다.

### JwtPayload (토큰 생성 입력 값 객체)

```java
// core
public record JwtPayload(
        Long userId,
        String email,
        Role role   // 한 계정 = 한 권한 (04-authorization.md)
) {
}
```

### JwtProvider (OO 컴포넌트)

```java
// core
@Component
@RequiredArgsConstructor
public class JwtProvider {

    private final JwtProperties jwtProperties;
    private SecretKey key;

    @PostConstruct
    void init() {
        this.key = Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(JwtPayload payload) {
        return createToken(payload, jwtProperties.accessTokenValidityMs());
    }

    public String createRefreshToken(JwtPayload payload) {
        return createToken(payload, jwtProperties.refreshTokenValidityMs());
    }

    public boolean validate(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false; // 만료·위조·형식 오류
        }
    }

    public Authentication getAuthentication(String token) {
        Claims claims = parseClaims(token);
        // JJWT는 작은 숫자를 Integer로 역직렬화할 수 있으므로 Number로 받아 변환한다
        Long userId = ((Number) claims.get("userId")).longValue();
        // 한 계정 = 한 권한 → 단일 authority
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(claims.get("role", String.class)));
        CustomUserDetails principal = new CustomUserDetails(userId, claims.getSubject(), authorities);
        return new UsernamePasswordAuthenticationToken(principal, null, authorities);
    }

    private String createToken(JwtPayload payload, long validityMs) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(payload.email())
                .issuer(jwtProperties.issuer())
                .claim("userId", payload.userId())
                .claim("role", payload.role().getAuthority())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(validityMs)))
                .signWith(key)
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .requireIssuer(jwtProperties.issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

### 토큰 결과 DTO (access + refresh)

로그인 인증 성공 처리 결과로 access·refresh를 담은 토큰 DTO를 반환한다. 컨트롤러에서 **access는 응답 본문, refresh는 httpOnly 쿠키**로 분리한다(`01-jwt.md`).

```java
// core
public record JwtToken(
        String accessToken,
        String refreshToken
) {
    public static JwtToken of(JwtProvider provider, JwtPayload payload) {
        return new JwtToken(provider.createAccessToken(payload), provider.createRefreshToken(payload));
    }
}
```

> 이 DTO가 "인증 처리 시 accessToken·refreshToken을 담아 전달"하는 형태다. 이름은 프로젝트 컨벤션에 맞게 조정 가능하다(예: `JwtToken` / `TokenResult`).

### JwtProperties (@ConfigurationProperties record + 제약)

`@Value` 대신 타입 있는 record로 받고, 프로퍼티 제약을 검증한다.

```java
// core
@Validated
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        @NotBlank @Size(min = 32) String secret,   // HS256: 최소 32바이트(256bit)
        @NotNull @Positive Long accessTokenValidityMs,
        @NotNull @Positive Long refreshTokenValidityMs,
        @NotBlank String issuer
) {
}
```

활성화(앱/모듈 config):

```java
@ConfigurationPropertiesScan // 또는 @EnableConfigurationProperties(JwtProperties.class)
```

### properties 설정

```yaml
jwt:
  secret: ${JWT_SECRET}                  # 환경변수 주입, 커밋 금지 (01-jwt)
  access-token-validity-ms: 1800000      # 30분
  refresh-token-validity-ms: 1209600000  # 14일
  issuer: opinion-brief
```

## 구현 가드레일

- `JwtProvider`는 `@Component`로 두고 `JwtProperties`를 주입한다. 시크릿에서 키를 유도한다(`@PostConstruct`).
- 생성은 `JwtPayload`, 검증은 `String` 토큰을 받는다.
- 설정은 `JwtProperties` record(`@ConfigurationProperties` + `@Validated`)로 받는다. `@Value` 금지.
- 프로퍼티 제약을 둔다: `secret` `@NotBlank`+`@Size(min=32)`, 만료 `@Positive`, `issuer` `@NotBlank`.
- `JwtPayload`/`JwtToken`/`JwtProperties`는 불변 record(값 객체)로 두고, 동작은 `JwtProvider`에 둔다(OO).
- JWT 관련 타입은 `core`에 둔다.

## 검증 기준

- `JwtPayload`로 생성한 토큰이 `validate`를 통과하고, 만료·위조 토큰은 `false`인지 테스트.
- `getAuthentication`이 userId·role로 올바른 단일 권한을 부여하는지 테스트.
- 잘못된 프로퍼티(빈 시크릿·32바이트 미만·음수 만료)에서 기동이 실패하는지 테스트.
- 코드에서 `@Value` 사용이 없는지 확인.
