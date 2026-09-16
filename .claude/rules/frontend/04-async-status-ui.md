---
description: "응답 제출은 즉시 결과가 나오지 않는다. 검수 상태를 단계로 표시하고, 무효/반영 제외 시 사유와 개선 가이드를 보여준다."
---

# 04. 비동기 검수 상태 UI 규칙

이 문서는 비동기 검수 상태의 화면 표시, 상태 갱신과 제외 사유 안내를 정의한다.

# 연관 관계

- 응답 검수 파이프라인 규칙 참조: @.claude/rules/backend/02-review-pipeline.md
- 제품 도메인 정의 참조: @.docs/prd/opinion-brief-domain-definition.md
- 제품 기술 검토 근거 참조: @.docs/prd/opinion-brief-engineering-review.md
- 제품 기획 근거 참조: @.docs/prd/opinion-brief-product-plan.md
- 상태 관리 규칙 참조: @.claude/rules/frontend/02-state-management.md
- 보상 원장 규칙 참조: @.claude/rules/backend/04-reward-ledger.md

# 적용 기준

백엔드 비동기 검수 파이프라인(`backend/02-review-pipeline.md`)이 프론트에서 어떻게 보여야 하는지 정의한다.

근거 문서:
- `.docs/prd/opinion-brief-domain-definition.md` 6
- `.docs/prd/opinion-brief-engineering-review.md` 2.2
- `.docs/prd/opinion-brief-product-plan.md` 5.3

# [금지사항]

- 제출 성공을 "유효 반영"으로 확정 표시하지 않는다. "제출 완료" → "검수 중"으로 시작한다.
- 내부 상태값(approved/rejected/needs_manual_review)을 그대로 노출하지 않는다. 도메인 문구만 쓴다.
- 검수 결과를 클라이언트에서 낙관 확정하지 않는다. 폴링/무효화로 갱신한다.
- 반영 제외/무효 응답에 사유·개선 가이드를 빠뜨리지 않는다.

# 설계 기준

## 제출 즉시 결과를 확정 표시하지 않는다

응답 검수는 비동기다. 제출 직후 "유효/무효"를 바로 보여주지 않고 "검수 중" 상태로 시작한다.

사용자에게 보여줄 상태 표현(도메인 정의 6장 그대로):

```text
의견 제출 완료
검수 중
유효 투표 반영 완료
투표 반영 제외
추가 검수 중
```

## 무효·반영 제외 시 사유와 개선 가이드를 보여준다

단순히 "반영 제외"만 표시하지 않고, 간단한 사유와 다음에 어떻게 하면 되는지 가이드를 함께 보여준다.

```text
선택한 입장과 근거의 연결이 약해 투표에 반영되지 않았습니다.
다음에는 왜 그렇게 생각하는지 구체적인 경험이나 이유를 적어주세요.
```

# 예시

```ts
// 내부 상태값 → 도메인 문구 (노출용 매핑)
const STATUS_LABEL: Record<ResponseStatus, string> = {
  SUBMITTED: "검수 중",
  APPROVED: "유효 투표 반영 완료",
  REJECTED: "투표 반영 제외",
  NEEDS_MANUAL_REVIEW: "추가 검수 중",
};
```

```tsx
function ResponseStatusView({ status, reason }: { status: ResponseStatus; reason?: string }) {
  return (
    <div>
      <span>{STATUS_LABEL[status]}</span>
      {status === "REJECTED" && reason && (
        <p>{reason} 다음에는 구체적인 경험이나 이유를 적어주세요.</p>
      )}
    </div>
  );
}
```

# 구현 가드레일

- 제출 mutation 성공 = "제출 완료"이지 "유효 반영"이 아니다. UI 문구를 구분한다.
- 검수 상태는 서버 상태이므로 TanStack Query 폴링 또는 무효화로 갱신한다. (`02-state-management.md`) 클라이언트에서 결과를 임의로 낙관 확정하지 않는다.
- 상태 표현은 위 도메인 문구 집합만 사용한다. 내부 상태값(approved/rejected/needs_manual_review)을 그대로 노출하지 않는다.
- 반영 제외/무효 응답에는 사유 + 개선 가이드 영역을 함께 렌더한다.
- 보상 상태(pending/confirmed)도 검수 결과에 종속됨을 UI에서 오해 없이 표시한다. (`backend/04-reward-ledger.md`)

# 검증 기준

- 제출 직후 "검수 중"으로 표시되는지 테스트.
- 폴링/무효화로 상태가 "유효 반영" 또는 "반영 제외"로 전이되는지 테스트.
- 반영 제외 시 사유·가이드가 표시되는지 테스트.
