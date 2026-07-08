---
description: "QueryDSL 컨벤션. 포트는 domain, 구현은 infra/persistence의 [Domain]CustomRepositoryImpl. 동적 조건은 null-safe BooleanExpression, 조회는 record DTO projection, 페이징은 content+별도 count."
---

# 04. QueryDSL 규칙

동적/커스텀 쿼리를 QueryDSL로 작성하는 컨벤션이다. 모듈 배치는 `../00-module-structure.md`(포트 interface는 `domain`, 구현은 `infra/persistence`), 페치·projection은 `01-association-fetch.md`, soft delete 상호작용은 `03-soft-delete.md`.

## 금지 규칙 (하지 말 것)

- ❌ QueryDSL 구현을 `domain`에 두지 않는다. `infra/persistence`의 `...Impl`에 둔다.
- ❌ `@QueryProjection`으로 domain DTO를 QueryDSL에 결합하지 않는다. `Projections.constructor`를 쓴다.
- ❌ `fetchResults()`/`fetchCount()`(deprecated)를 쓰지 않는다. content + 별도 count.
- ❌ 구현체에서 `EntityManager`를 직접 new 하지 않는다. `JPAQueryFactory` 빈을 주입한다.
- ❌ `BooleanBuilder`를 남발하지 않는다. null-safe `BooleanExpression` + `where` 가변인자로 조합한다.
- ❌ Repository가 반환한 Spring Data `Page<>`를 Service 경계 밖으로 노출하지 않는다. Service에서 `PageResponse.of()`로 변환한다.

## 설계 기준

### Repository 구조 (포트/구현 분리)

- 기본 CRUD는 `[Domain]Repository extends JpaRepository<Entity, Id>, [Domain]CustomRepository`.
- 커스텀/동적 쿼리는 `[Domain]CustomRepository`(포트 interface, `domain`) + `[Domain]CustomRepositoryImpl`(구현, `infra/persistence`)로 분리한다. 구현 클래스명은 Spring Data fragment 규칙에 맞춰 반드시 `...Impl`로 둔다.

```java
// domain: 포트
public interface OpinionBriefCustomRepository {
    Page<OpinionBriefSummary> search(BriefSearchCondition condition, Pageable pageable);
}
```

```java
// infra/persistence: 구현
@RequiredArgsConstructor
public class OpinionBriefCustomRepositoryImpl implements OpinionBriefCustomRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<OpinionBriefSummary> search(BriefSearchCondition condition, Pageable pageable) {
        List<OpinionBriefSummary> content = queryFactory
                .select(Projections.constructor(OpinionBriefSummary.class,
                        opinionBrief.id, opinionBrief.title, opinionBrief.status, opinionBrief.deadlineAt))
                .from(opinionBrief)
                .where(
                        statusEq(condition.status()),
                        titleContains(condition.title()),
                        deadlineBefore(condition.deadlineBefore())
                )
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(opinionBrief.id.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(opinionBrief.count())
                .from(opinionBrief)
                .where(
                        statusEq(condition.status()),
                        titleContains(condition.title()),
                        deadlineBefore(condition.deadlineBefore())
                );

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    // 동적 조건은 null-safe BooleanExpression (값 없으면 null → where에서 무시)
    private BooleanExpression statusEq(BriefStatus status) {
        return status != null ? opinionBrief.status.eq(status) : null;
    }

    private BooleanExpression titleContains(String title) {
        return StringUtils.hasText(title) ? opinionBrief.title.contains(title) : null;
    }

    private BooleanExpression deadlineBefore(LocalDateTime dateTime) {
        return dateTime != null ? opinionBrief.deadlineAt.before(dateTime) : null;
    }
}
```

### JPAQueryFactory는 설정 빈으로 주입

`JPAQueryFactory`는 설정 빈으로 등록하고 생성자 주입한다. 구현체에서 `EntityManager`를 직접 다루지 않는다. 설정은 `infra`.

```java
@Configuration
public class QueryDslConfig {

    @PersistenceContext
    private EntityManager entityManager;

    @Bean
    public JPAQueryFactory jpaQueryFactory() {
        return new JPAQueryFactory(entityManager);
    }
}
```

### 동적 조건은 null-safe BooleanExpression

- 조건은 `BooleanExpression`을 반환하는 private 메서드로 분리하고, 값이 없으면 `null`을 반환한다. `where(a, b, c)`는 `null` 인자를 무시하므로 조건이 자연스럽게 빠진다.
- `BooleanBuilder`를 남발하지 않는다. 조건 조합·재사용이 필요할 때만 제한적으로 쓴다.

### 조회는 record DTO projection

- 목록/요약 조회는 엔티티를 로딩하지 말고 필요한 컬럼만 projection한다(`01-association-fetch.md`).
- record DTO는 `Projections.constructor`로 매핑한다(생성자 파라미터 순서·타입 일치). `@QueryProjection`은 domain DTO를 QueryDSL에 결합시키므로 사용하지 않는다.

### 페이징은 content + 별도 count

- QueryDSL 5의 `fetchResults()` / `fetchCount()`는 deprecated이므로 쓰지 않는다.
- content를 `fetch()`로 조회하고, count는 별도 쿼리로 만든 뒤 `PageableExecutionUtils.getPage`로 감싼다(마지막 페이지 등에서 count 쿼리를 생략해 최적화).
- Repository는 `Page<XxxResponse>`(projection)를 반환한다. **`Page<>`는 Repository → Service 내부에서만 쓰고**, Service가 `PageResponse.of(page)`로 변환해 경계 밖으로 내보낸다(`../java/01-dto-response.md`, `../spring/02-service.md`). 응답은 항상 `PageResponse<T>`로 통일한다.

### 정렬·페치조인·soft delete

- 동적 정렬이 필요하면 `Pageable`의 `Sort`를 `OrderSpecifier`로 변환한다.
- 컬렉션 fetch join과 페이징을 동시에 쓰지 않는다. batch size로 처리한다(`01-association-fetch.md`).
- `@SQLRestriction("deleted_at IS NULL")`은 QueryDSL 엔티티 쿼리에 자동 적용된다. native query만 예외이므로 필터를 직접 건다(`03-soft-delete.md`).

## 구현 가드레일

- QueryDSL 구현은 `infra/persistence`의 `[Domain]CustomRepositoryImpl`(포트는 `domain`)에 둔다. 구현명은 `...Impl`.
- 동적 조건은 null-safe `BooleanExpression` + `where` 가변인자로 조합한다. `BooleanBuilder` 남발 금지.
- record DTO projection은 `Projections.constructor`를 쓴다. `@QueryProjection`으로 domain DTO를 QueryDSL에 결합하지 않는다.
- 페이징은 content + 별도 count(`PageableExecutionUtils`). `fetchResults`/`fetchCount` 금지.
- `JPAQueryFactory`는 설정 빈으로 주입한다. 구현체에서 `EntityManager`를 직접 new 하지 않는다.
- 조회 메서드를 호출하는 Service 메서드는 `@Transactional(readOnly = true)`로 둔다(`../spring/02-service.md`).
- 반환은 DTO를 우선한다. 엔티티를 반환하면 Service에서 `toDto`로 변환한다(`../java/01-dto-response.md`).

## 검증 기준

- 동적 조건이 모두 null일 때 where가 무시되어 전체 조회가 되는지 테스트.
- 페이징 total count가 정확하고 count 최적화가 동작하는지 테스트.
- soft-deleted 행이 QueryDSL 조회에서 제외되는지 테스트.
- projection 결과의 타입·필드 매핑이 정확한지 테스트.
