---
description: "Opinion Brief 백엔드 도메인 모델 규칙. OpinionBrief를 최상위 모델로 두고, 신뢰점수는 버전 스냅샷으로 보관한다."
---

# 01. 도메인 모델 규칙 (OpinionBrief 중심)

이 문서는 Opinion Brief의 핵심 도메인 모델, 상태 전이와 신뢰점수 스냅샷 기준을 정의한다.

# 연관 관계

- 제품 기술 검토 근거 참조: @.docs/prd/opinion-brief-engineering-review.md
- 제품 도메인 정의 참조: @.docs/prd/opinion-brief-domain-definition.md
- 참여 슬롯 동시성 규칙 참조: @.claude/rules/backend/05-participation-slot.md
- 응답 검수 파이프라인 규칙 참조: @.claude/rules/backend/02-review-pipeline.md
- 리포트 스냅샷 규칙 참조: @.claude/rules/backend/03-report-snapshot.md
- 보상 원장 규칙 참조: @.claude/rules/backend/04-reward-ledger.md

# 적용 기준

이 문서는 Opinion Brief 백엔드의 도메인 모델을 어떻게 잡을지에 대한 **설계 기준**과, 실제 Spring/JPA 코드로 옮길 때 지킬 **구현 가드레일**을 함께 정의한다.

근거 문서:
- `.docs/prd/opinion-brief-engineering-review.md` 2.1, 2.3(2.4는 04 문서), 4.2, 4.3
- `.docs/prd/opinion-brief-domain-definition.md` 1, 6, 8

# [금지사항]

- 범용 `Poll`/`Survey`/`Post` 엔티티로 시작하지 않는다. `OpinionBrief`를 최상위로 둔다.
- 상태값을 `String`으로 두거나 서비스에서 상태 필드를 직접 set하지 않는다. `enum` + 도메인 메서드로만 전이한다.
- 정의되지 않은 상태 전이(예: `draft` → `delivered` 직행)를 허용하지 않는다.
- 리포트/집계에서 실시간 `UserTrustProfile` 점수를 참조하지 않는다. 스냅샷 값을 쓴다.

# 설계 기준

## OpinionBrief가 최상위 도메인 모델이다

이 제품은 "투표 게시판"이 아니라 "품질 검수 파이프라인이 있는 리포트 생성 시스템"이다. 따라서 범용 `Poll` / `Survey` / `Post` 모델에서 시작하지 않는다. 범용 모델에서 시작하면 광고 카피, 브랜드 인식, 사회 이슈 같은 템플릿을 나중에 억지로 붙이게 된다.

핵심 모델 목록(권장 이름):

- `OpinionBrief` — 구조화된 의견 요청서. 주제, 판단 축, 응답자 조건, 필요 응답 수, 마감 시간, 리포트 형식을 가진다.
- `BriefTemplate` — 광고 카피 검증 리포트 등 사전 정의된 Brief 유형.
- `BriefQuestion` / `BriefAudienceRule` — Brief의 질문과 타깃 조건.
- `BriefParticipantSlot` — 참여 슬롯. 동시성 규칙은 `05-participation-slot.md`.
- `BriefResponse` — 참여자의 선택 + 근거 의견.
- `ResponseReview` — AI/사람 검수 결과. 상세는 `02-review-pipeline.md`.
- `Report` — 승인 응답의 스냅샷. 상세는 `03-report-snapshot.md`.
- `RewardLedger` — 보상 원장. 상세는 `04-reward-ledger.md`.
- `UserTrustProfile` — 사용자 신뢰 점수(현재값).

## 상태는 명시적 전이로만 바뀐다

임의 boolean 플래그 조합이 아니라 명시적 상태값으로 관리한다.

```text
OpinionBrief:
  draft -> open -> collecting -> reviewing -> report_generating -> ready -> delivered -> archived

BriefResponse:
  submitted -> reviewing -> approved | rejected | needs_manual_review

RewardLedger:
  pending -> confirmed -> paid_out | cancelled
```

## 신뢰점수는 버전 스냅샷이다 (R8)

`UserTrustProfile`에는 현재 점수를 두되, 응답이 리포트에 반영되는 시점의 점수를 `BriefResponse.trust_score_snapshot`으로 복사해 보관한다. 계산식이 바뀌어도 과거 리포트 결과가 흔들리면 안 되기 때문이다.

# 예시

```java
// 상태 전이는 도메인 메서드로만 (java/01-dto-response.md의 Entity 규칙과 함께)
public void startCollecting() {
    if (this.status != BriefStatus.OPEN) {
        throw new IllegalStateException("open 상태에서만 수집을 시작할 수 있습니다: " + this.status);
    }
    this.status = BriefStatus.COLLECTING; // 정의된 전이만 허용
}
```

# 구현 가드레일

- 도메인 엔티티 이름은 위 권장 이름을 따른다. 범용 `Poll` / `Survey` / `Post` 엔티티를 새로 만들지 않는다.
- 상태값은 `String`이 아니라 `enum`으로 정의하고, 전이는 도메인 메서드 안에서만 수행한다. 서비스 계층에서 상태 필드를 직접 set하지 않는다.
- 정의되지 않은 상태 전이(예: `draft -> delivered` 직행)는 허용하지 않는다. 필요하면 이 문서에 전이를 먼저 추가한다.
- `trust_score`를 리포트/집계에서 참조할 때는 항상 스냅샷 값을 쓴다. 실시간 `UserTrustProfile` 점수를 리포트에 직접 넣지 않는다.
- Brief/Response/Report/Ledger 간 연관은 ID 참조를 기본으로 하고, JPA 양방향 연관은 꼭 필요한 경우로 제한한다.

# 검증 기준

- 상태 전이 단위 테스트: 허용된 전이는 성공, 금지된 전이는 예외.
- `trust_score_snapshot`이 응답 생성/반영 시점 값으로 고정되는지 테스트.
