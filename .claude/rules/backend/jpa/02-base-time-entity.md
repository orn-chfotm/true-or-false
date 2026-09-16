---
description: "BaseTimeEntity 감사 필드 규칙. reg/mod 등록자·수정자·시간을 @MappedSuperclass로 분리하고, AuditingEntityListener로 입력·수정 시 자동 주입한다. 엔티티는 필요 시 상속한다."
---

# 02. BaseTimeEntity (감사 필드) 규칙

이 문서는 등록·수정 감사 필드의 공통 모델과 자동 주입 기준을 정의한다.

# 연관 관계

- 모듈 구조 규칙 (멀티 모듈 DDD) 참조: @.claude/rules/backend/00-module-structure.md
- Java DTO · Response 규칙 참조: @.claude/rules/backend/java/01-dto-response.md
- Soft Delete 규칙 참조: @.claude/rules/backend/jpa/03-soft-delete.md

# 적용 기준

row 데이터의 등록자/등록시간, 수정자/수정시간을 공통 base로 분리하고 자동 주입하는 컨벤션이다. Entity는 `domain` 모듈에 있으므로 BaseTimeEntity도 `domain`에 둔다(`../00-module-structure.md`). 엔티티 불변·도메인 메서드 규칙은 `../java/01-dto-response.md`.

# [금지사항]

- 감사 필드(등록/수정 시간·수정자)를 개별 엔티티에 중복 정의하지 않는다. `BaseTimeEntity`를 상속한다.
- 감사 필드를 도메인 코드·setter로 직접 채우지 않는다. `AuditingEntityListener`가 자동 주입한다.
- 수정자를 email·이름 등 회원 정보로 저장하지 않는다. 사용자 entity id(Long)로 저장한다.
- `regId`/`regDate`를 수정 가능하게 두지 않는다(`@Column(updatable = false)`).

# 설계 기준

## BaseTimeEntity — 감사 필드 분리

등록/수정의 **수정자(사람)와 시간**을 `@MappedSuperclass`로 분리한다. `@EntityListeners(AuditingEntityListener.class)`로 자동 주입한다.

```java
@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTimeEntity {

    @CreatedBy
    @Column(updatable = false)
    private Long regId;            // 등록자

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime regDate; // 등록 시간

    @LastModifiedBy
    private Long modId;            // 수정자

    @LastModifiedDate
    private LocalDateTime modDate; // 수정 시간
}
```

- `@CreatedBy` / `@CreatedDate`: **입력(persist) 시** 1회 주입, 이후 불변(`updatable = false`).
- `@LastModifiedBy` / `@LastModifiedDate`: **입력·수정(update) 시** 자동 갱신.

수정자(`regId`/`modId`)는 email·이름 같은 회원 정보가 아니라 **사용자 entity id(Long)** 로 저장한다. 이유: 회원 정보가 바뀌어도 감사 필드를 가진 모든 엔티티를 갱신할 필요 없이 **회원 엔티티만 수정**하면 되고, 표시가 필요할 때 id로 **join 조회**하면 되기 때문이다(정규화). 같은 이유로 soft delete의 `deletedBy`도 id로 둔다(`03-soft-delete.md`).

## 엔티티는 필요 시 상속

감사 필드가 필요한 엔티티만 `BaseTimeEntity`를 상속한다.

```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OpinionBrief extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    // ...
}
```

## Auditing 활성화 + 현재 사용자 주입

`@EnableJpaAuditing`을 켜고, 수정자(`regId`/`modId`)에 넣을 현재 사용자 id를 `AuditorAware`로 제공한다. 인증 정보는 Spring Security `SecurityContext`에서 가져온다. 설정은 `infra`(또는 앱 config)에 둔다.

```java
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<Long> auditorAware() {
        return () -> {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return Optional.empty(); // 비인증(시스템/배치) 시 미주입
            }
            if (authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
                return Optional.of(userDetails.getId());
            }
            return Optional.empty();
        };
    }
}
```

## 삭제(delete) 주의

JPA Auditing은 **입력·수정 시에만** 자동 주입된다. 물리 삭제(`delete`)에는 감사 필드가 남지 않는다. 삭제 이력이 필요하면 soft delete(`@SQLDelete` + `deletedAt`/`deletedBy` + 조회 필터)를 별도로 도입한다. (이 규칙 범위 밖, 필요 시 별도 규칙으로 정의)

# 구현 가드레일

- 감사 필드가 필요한 엔티티는 `BaseTimeEntity`를 상속한다. 개별 엔티티에 등록/수정 시간·수정자를 중복 정의하지 않는다.
- `regId`/`regDate`는 `@Column(updatable = false)`로 최초 값을 고정한다.
- 감사 필드는 도메인 코드나 setter로 직접 채우지 않는다. `AuditingEntityListener`가 자동 주입한다.
- `@EnableJpaAuditing` + `AuditorAware`를 설정한다. 수정자 id는 `SecurityContext`에서 가져온다.
- 비인증 컨텍스트(시스템/배치)에서는 `AuditorAware`가 `Optional.empty()`(또는 시스템 계정 id)를 반환하도록 한다.
- `BaseTimeEntity`는 `domain`, Auditing 설정은 `infra`(또는 앱 config)에 둔다.

# 검증 기준

- 입력 시 `regId`/`regDate`/`modId`/`modDate`가 모두 채워지는지 테스트.
- 수정 시 `modId`/`modDate`만 갱신되고 `regId`/`regDate`는 불변인지 테스트.
- 비인증 컨텍스트에서 감사자 주입이 예외 없이 처리되는지 확인.
- (`@DataJpaTest` 사용 시 auditing 활성화 설정이 포함됐는지 확인)
