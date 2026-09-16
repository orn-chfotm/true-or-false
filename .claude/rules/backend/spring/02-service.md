---
description: "Spring Service 컨벤션. @Service + 생성자 주입, 클래스에 @Transactional(쓰기 기본), 조회 메서드에 @Transactional(readOnly = true), 영속은 도메인 포트로 접근."
---

# 02. Service 규칙 (Spring)

이 문서는 Service의 의존성 주입, 영속 접근과 트랜잭션·반환 경계를 정의한다.

# 연관 관계

- async-job-design 참조: @.claude/skills/async-job-design/SKILL.md
- 모듈 구조 규칙 (멀티 모듈 DDD) 참조: @.claude/rules/backend/00-module-structure.md
- Spring 규칙 참조: @.claude/rules/harness/technical/02-spring.md
- Java DTO · Response 규칙 참조: @.claude/rules/backend/java/01-dto-response.md
- 응답 검수 파이프라인 규칙 참조: @.claude/rules/backend/02-review-pipeline.md

# 적용 기준

Opinion Brief의 Service 컨벤션이다. Service는 `domain` 모듈의 도메인별 `service`에 둔다(`../00-module-structure.md`). 트랜잭션 경계는 Service 계층에서 명확히 한다(하네스 `.claude/rules/harness/technical/02-spring.md`).

# [금지사항]

- 조회 전용 메서드에 `@Transactional(readOnly = true)`를 빠뜨리지 않는다.
- Service가 `infra`·외부 SDK를 직접 호출하지 않는다. 도메인 포트로 접근한다.
- Entity 상태를 setter로 변경하지 않는다. 도메인 메서드를 호출한다.
- 필드 주입을 쓰지 않는다. `final` + `@RequiredArgsConstructor`로 생성자 주입한다.
- Entity를 반환하지 않는다. DTO(`toDto`)로 변환한다.
- Spring Data `Page<>`를 Service 경계 밖으로 반환하지 않는다. `PageResponse.of()`로 변환해 반환한다(`../java/01-dto-response.md`).
- 외부 연동(AI/알림/파일)을 트랜잭션 경계 안에서 동기로 묶지 않는다.

# 설계 기준

## @Service + 생성자 주입

- `@Service`를 붙이고, 의존성은 `final` 필드 + `@RequiredArgsConstructor`로 생성자 주입한다.
- 영속 접근은 도메인 포트 interface(예: `[Domain]Repository`)로 한다. `infra`를 직접 import하지 않는다(`../00`).

## 트랜잭션 경계

- 클래스에 `@Transactional`을 붙여 쓰기 트랜잭션을 기본으로 둔다.
- 조회 전용 메서드에는 `@Transactional(readOnly = true)`를 지정한다.

```java
@Service
@RequiredArgsConstructor
@Transactional
public class BriefService {

    private final OpinionBriefRepository opinionBriefRepository;

    public OpinionBrief create(OpinionBrief brief) {
        return opinionBriefRepository.save(brief);
    }

    public void open(Long briefId) {
        OpinionBrief brief = opinionBriefRepository.findById(briefId)
                .orElseThrow(() -> new BriefNotFoundException(briefId));
        brief.open(); // 상태 변경은 도메인 메서드로 (../java/01, ../01-domain-model)
    }

    @Transactional(readOnly = true)
    public OpinionBriefResponse getResponse(Long briefId) {
        OpinionBrief brief = opinionBriefRepository.findById(briefId)
                .orElseThrow(() -> new BriefNotFoundException(briefId));
        return OpinionBriefResponse.toDto(brief);
    }

    @Transactional(readOnly = true)
    public PageResponse<OpinionBriefSummary> search(BriefSearchCondition condition, Pageable pageable) {
        Page<OpinionBriefSummary> page = opinionBriefRepository.search(condition, pageable); // Page는 내부에서만
        return PageResponse.of(page); // 경계 밖으로는 PageResponse만 반환 (../java/01)
    }
}
```

# 구현 가드레일

- Service 클래스에 `@Transactional`(쓰기 기본), 조회 메서드에 `@Transactional(readOnly = true)`를 둔다.
- 영속은 도메인 포트 interface로만 접근한다. Service가 `infra`/외부 SDK를 직접 호출하지 않는다.
- Entity 상태 변경은 Service에서 setter로 하지 않고 도메인 메서드를 호출한다.
- 필드 주입 대신 `final` + `@RequiredArgsConstructor` 생성자 주입을 쓴다.
- Entity를 반환하지 않고 DTO(`toDto`)로 변환해 반환한다.
- 페이지 조회는 `Page<>`를 내부에서만 쓰고, `PageResponse.of(page)`로 변환해 반환한다. `Page<>`를 Service 밖으로 노출하지 않는다.
- AI 호출·알림·파일 저장 같은 외부 연동은 트랜잭션 경계 안에서 동기로 묶지 않는다(`../02-review-pipeline.md`, `async-job-design` 스킬).

# 검증 기준

- 조회 메서드가 `readOnly = true`로 동작하는지 확인.
- Service가 도메인 포트로만 영속에 접근하는지(‑ infra 직접 의존 없음) 확인.
- Service 반환 타입에 Entity가 노출되지 않는지 확인.
