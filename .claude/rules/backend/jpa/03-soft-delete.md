---
description: "삭제는 soft delete가 기본. BaseEntity에 deletedAt/deletedBy를 두고 조회에서 제외하며, 물리 삭제는 별도 스케줄러가 수행한다. 개인정보 데이터는 회원 탈퇴 시 즉시 물리 삭제한다."
---

# 03. Soft Delete 규칙

이 문서는 soft delete, 삭제 데이터 조회 제외와 물리 삭제 조건을 정의한다.

# 연관 관계

- async-job-design 참조: @.claude/skills/async-job-design/SKILL.md
- BaseTimeEntity (감사 필드) 규칙 참조: @.claude/rules/backend/jpa/02-base-time-entity.md
- 개인정보 분리 규칙 참조: @.claude/rules/backend/06-privacy.md
- 응답 검수 파이프라인 규칙 참조: @.claude/rules/backend/02-review-pipeline.md
- Service 규칙 (Spring) 참조: @.claude/rules/backend/spring/02-service.md
- 리포트 스냅샷 규칙 참조: @.claude/rules/backend/03-report-snapshot.md

# 적용 기준

데이터 삭제는 물리 삭제가 아니라 soft delete로 처리하고, 실제 물리 삭제는 별도 스케줄러가 수행한다. 감사 필드는 `02-base-time-entity.md`, 개인정보 처리는 `../06-privacy.md`. Entity는 `domain`, 스케줄/배치는 `../02-review-pipeline.md`·`async-job-design` 스킬.

# [금지사항]

- 일반 도메인 데이터를 `repository.delete()`로 물리 삭제하지 않는다. `softDelete(deleterId)`로 처리한다.
- `deletedBy`를 문자열(email 등)로 저장하지 않는다. 사용자 entity id(Long)로 저장한다.
- soft delete 엔티티에서 `@SQLRestriction("deleted_at IS NULL")` 필터를 빠뜨리지 않는다.
- 개인정보 데이터를 soft delete로 남기지 않는다. 회원 탈퇴 시 즉시 물리 삭제한다.
- native query에서 삭제 필터를 빠뜨리지 않는다(`@SQLRestriction` 미적용).

# 설계 기준

## soft delete가 기본

일반 도메인 데이터는 삭제 시 물리 삭제하지 않고 `deletedAt`/`deletedBy`를 마킹한다. `BaseEntity`는 `BaseTimeEntity`를 상속해 삭제 필드를 추가한다. 삭제자(`deletedBy`)는 **사용자 entity id(Long)** 로 저장해 join 조회가 가능하게 한다(이메일 등 문자열 금지).

```java
@Getter
@MappedSuperclass
public abstract class BaseEntity extends BaseTimeEntity {

    private LocalDateTime deletedAt;  // null이면 미삭제
    private Long deletedBy;           // 삭제자 (사용자 entity id)

    public boolean isDeleted() {
        return this.deletedAt != null;
    }

    // 삭제는 물리 삭제가 아니라 도메인 메서드로 마킹
    public void softDelete(Long deleterId) {
        this.deletedAt = LocalDateTime.now();
        this.deletedBy = deleterId;
    }
}
```

soft delete 대상 엔티티는 `BaseEntity`를 상속하고, 조회에서 삭제 행을 제외하도록 `@SQLRestriction`(Hibernate 6.4+, 이전은 `@Where`)을 둔다.

```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted_at IS NULL")
public class OpinionBrief extends BaseEntity {
    // ...
}
```

Service는 `repository.delete()`가 아니라 도메인 메서드로 삭제한다. 삭제자 id는 `SecurityContext`의 현재 사용자에서 가져와 넘긴다(`../spring/02-service.md`).

```java
public void delete(Long briefId, Long currentUserId) {
    OpinionBrief brief = opinionBriefRepository.findById(briefId)
            .orElseThrow(() -> new BriefNotFoundException(briefId));
    brief.softDelete(currentUserId);
}
```

## 물리 삭제는 별도 스케줄러

soft delete 후 보관 기간이 지난 데이터는 스케줄러/배치가 물리 삭제한다.

- `@SQLRestriction` 때문에 일반 조회로는 삭제 대상(`deleted_at IS NOT NULL`)이 잡히지 않는다. 물리 삭제 잡은 **native query 등으로 restriction을 우회**해 대상을 조회한 뒤 bulk delete한다.
- 잡 설계(스케줄, 재시도, 멱등)는 `async-job-design` 스킬을 따른다.

## 개인정보는 회원 탈퇴 시 즉시 물리 삭제 (예외)

개인정보 관련 데이터는 soft delete 대상이 아니다. 회원 탈퇴 시 즉시 물리 삭제한다(`../06-privacy.md`).

- 이런 엔티티는 `BaseEntity`(soft delete)를 상속하지 않거나, 즉시 hard delete 경로를 둔다.
- 리포트에 남는 원문은 이미 익명·마스킹된 스냅샷이어야 한다(`../03-report-snapshot.md`, `../06-privacy.md`).

# 구현 가드레일

- 일반 도메인 데이터는 `BaseEntity`를 상속하고 `softDelete(deleterId)`로 삭제한다. `repository.delete()`로 물리 삭제하지 않는다.
- `deletedBy`는 사용자 entity id(`Long`)로 저장한다. 문자열(email 등) 금지.
- soft delete 엔티티는 `@SQLRestriction("deleted_at IS NULL")`로 조회에서 제외한다.
- native query는 `@SQLRestriction`이 적용되지 않으므로 삭제 필터를 직접 건다.
- 물리 삭제 스케줄러는 restriction을 우회해 보관 기간 지난 행만 삭제한다.
- 개인정보 엔티티는 soft delete가 아니라 회원 탈퇴 시 즉시 물리 삭제한다.
- 삭제자 id는 Service에서 `SecurityContext`로부터 받아 도메인 메서드에 넘긴다.

# 검증 기준

- `softDelete` 후 일반 조회에서 제외되고 `deletedAt`/`deletedBy`가 채워지는지 테스트.
- 스케줄러가 보관 기간 지난 soft-deleted 행만 물리 삭제하는지 테스트.
- 개인정보 엔티티가 회원 탈퇴 시 즉시 물리 삭제되는지 테스트.
- native query 조회에 삭제 필터가 적용되는지 확인.
