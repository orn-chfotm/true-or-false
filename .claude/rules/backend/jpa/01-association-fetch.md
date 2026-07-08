---
description: "JPA 연관관계·페치 전략 컨벤션. 애그리거트 간에는 ID 참조, 내부에서만 연관 매핑. 모든 연관은 LAZY, @ManyToMany 금지, N+1은 fetch join·batch size로 해결한다."
---

# 01. JPA 연관관계 · 페치 전략 규칙

Opinion Brief 백엔드(JPA / Hibernate / QueryDSL)의 엔티티 연관·페치 컨벤션이다. Entity는 `domain`, 조회 구현(QueryDSL)은 `infra/persistence`에 둔다(`../00-module-structure.md`). 엔티티 불변·도메인 메서드 규칙은 `../java/01-dto-response.md`, 애그리거트/상태전이는 `../01-domain-model.md`.

## 금지 규칙 (하지 말 것)

- ❌ `@ManyToOne`/`@OneToOne`을 EAGER로 두지 않는다. `fetch = FetchType.LAZY`를 반드시 명시한다.
- ❌ `@ManyToMany`를 쓰지 않는다. 조인 엔티티로 대체한다.
- ❌ 서로 다른 애그리거트를 연관 매핑으로 잇지 않는다. ID(Long)로 참조한다.
- ❌ 컬렉션 fetch join과 페이징을 동시에 쓰지 않는다.
- ❌ EAGER로 N+1을 해결하지 않는다. fetch join·batch size로 해결한다.

## 설계 기준

### 애그리거트 간은 ID 참조, 내부에서만 연관 매핑

- 서로 다른 애그리거트 루트(OpinionBrief, BriefResponse, Report, RewardLedger 등) 사이는 **연관 객체가 아니라 ID(Long)로 참조**한다. (`../01-domain-model.md`)
- JPA 연관 매핑(`@ManyToOne`, `@OneToMany`)은 **하나의 애그리거트 내부**에서만 사용한다.

```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BriefResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 다른 애그리거트는 ID로 참조 (연관 매핑 X)
    private Long opinionBriefId;
    private Long participantSlotId;
    private Long userId;

    @Enumerated(EnumType.STRING)
    private ResponseStatus status;
}
```

### 모든 연관은 LAZY

- `@ManyToOne`, `@OneToOne`은 기본이 EAGER이므로 **항상 `fetch = FetchType.LAZY`를 명시**한다.
- `@OneToMany`, `@ManyToMany`는 기본 LAZY지만 페치는 조회 시점에 fetch join으로 제어한다.
- EAGER는 사용하지 않는다.

```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OpinionBrief {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 애그리거트 내부 자식: 연관 매핑 허용, 컬렉션은 초기화
    @OneToMany(mappedBy = "opinionBrief", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BriefAudienceRule> audienceRules = new ArrayList<>();

    // 연관 편의 메서드도 setter가 아니라 도메인 메서드로 (../java/01)
    public void addAudienceRule(BriefAudienceRule rule) {
        this.audienceRules.add(rule);
        rule.assignTo(this);
    }
}
```

```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BriefAudienceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)   // LAZY 명시
    @JoinColumn(name = "opinion_brief_id")
    private OpinionBrief opinionBrief;

    void assignTo(OpinionBrief brief) {
        this.opinionBrief = brief;
    }
}
```

### @ManyToMany 금지

`@ManyToMany`는 조인 테이블이 숨겨져 확장·추적이 어렵다. 연결 정보를 가진 **조인 엔티티**(`@OneToMany` + `@ManyToOne`)로 풀어 쓴다.

### N+1은 fetch join / batch size로 해결

EAGER로 N+1을 해결하지 않는다. 조회 최적화는 QueryDSL fetch join(`infra/persistence`) 또는 batch size로 한다.

```java
// OpinionBriefCustomRepositoryImpl (infra/persistence)
public List<OpinionBrief> findAllWithAudienceRules() {
    return queryFactory
            .selectFrom(opinionBrief)
            .leftJoin(opinionBrief.audienceRules, briefAudienceRule).fetchJoin()
            .distinct()
            .fetch();
}
```

컬렉션이 여러 개거나 페이징이 필요하면 fetch join 대신 batch size를 쓴다.

```yaml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 100
```

### 조회는 필요한 데이터만 DTO projection

목록/요약 조회는 엔티티를 로딩해 변환하지 말고, QueryDSL DTO projection으로 필요한 컬럼만 가져온다(`../spring/02-service.md`의 readOnly 조회와 연결).

```java
public List<OpinionBriefSummary> findSummaries() {
    return queryFactory
            .select(Projections.constructor(OpinionBriefSummary.class,
                    opinionBrief.id, opinionBrief.title, opinionBrief.status))
            .from(opinionBrief)
            .fetch();
}
```

## 구현 가드레일

- `@ManyToOne`, `@OneToOne`에 반드시 `fetch = FetchType.LAZY`를 명시한다. EAGER 금지.
- 애그리거트 간 참조는 ID(Long)로 한다. JPA 연관은 애그리거트 내부에서만.
- `@ManyToMany`를 쓰지 않는다. 조인 엔티티로 대체한다.
- 양방향 연관은 꼭 필요할 때만 두고, `mappedBy`로 주인/역방향을 명확히 한다. 연관 편의 메서드는 도메인 메서드로 둔다(setter 금지).
- `cascade` / `orphanRemoval`은 애그리거트 루트 → 내부 자식 관계에만 적용한다.
- 컬렉션은 필드에서 초기화(`new ArrayList<>()`)한다.
- N+1은 fetch join(QueryDSL) 또는 `default_batch_fetch_size`/`@BatchSize`로 해결한다.
- **컬렉션 fetch join과 페이징을 동시에 쓰지 않는다**(메모리 페이징 발생). batch size 또는 2단계 조회로 처리한다.
- 조회 최적화는 QueryDSL DTO projection을 우선한다.

## 검증 기준

- 모든 `@ManyToOne`/`@OneToOne`에 `LAZY`가 지정됐는지 확인.
- `@ManyToMany`가 없는지 확인.
- 목록 조회에서 N+1이 발생하지 않는지(실행 쿼리 수) 테스트.
- 컬렉션 fetch join + 페이징 조합이 없는지 확인.
- 애그리거트 간 연관이 ID 참조로 되어 있는지 확인.
