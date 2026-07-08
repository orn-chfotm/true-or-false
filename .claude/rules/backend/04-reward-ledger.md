---
description: "보상은 포인트 잔액 직접 수정이 아니라 원장(ledger) 방식으로 기록한다."
---

# 04. 보상 원장 규칙

포인트 보상 처리 규칙을 정의한다.

근거 문서:
- `.docs/prd/opinion-brief-engineering-review.md` 2.4, 4.3
- `.docs/prd/opinion-brief-domain-definition.md` 9
- `.docs/prd/opinion-brief-product-plan.md` 5.6

## 금지 규칙 (하지 말 것)

- ❌ `user.points += x`처럼 포인트 잔액을 직접 수정하지 않는다. `RewardLedger`에 이벤트로 기록한다.
- ❌ 검수 결과가 확정되기 전에 보상을 `confirmed`로 올리지 않는다.
- ❌ 역방향·건너뛰기 상태 전이를 하지 않는다(`pending → confirmed → paid_out`만).
- ❌ 같은 `(user_id, response_id, type)`에 중복 지급하지 않는다(멱등 보장).

## 설계 기준

### 보상은 원장 방식이다 (R4)

`user.points += 1000` 같은 잔액 직접 수정은 중복 지급, 환수, 보너스, 광고 보너스, 상품권 교환이 얽히면 취약하다. 보상은 원장에 이벤트로 기록하고, 잔액은 원장의 합으로 도출한다.

권장 모델:

```text
RewardLedger
  id
  user_id
  opinion_brief_id
  response_id
  type: participation | quality_bonus | ad_bonus | redemption | adjustment
  status: pending | confirmed | cancelled | paid_out
  amount
  reason
  created_at
  confirmed_at
```

### 보상은 유효한 기여에만 확정된다

제출 자체가 아니라 검수 통과(유효 투표)에 기본 보상을 지급한다. 흐름:

1. 의견 제출 → `pending`
2. AI 검수 실패 → `cancelled` (또는 아주 소량만)
3. AI 검수 통과 → `confirmed` (기본 참여 보상)
4. 주제 결과 확정 → 반영 참여자에게 추가 보상

## 예시

```java
// 잔액 직접 수정 X → 원장에 이벤트 추가
public void confirmParticipation(Long userId, Long responseId) {
    RewardLedger ledger = RewardLedger.builder()
            .userId(userId)
            .responseId(responseId)
            .type(RewardType.PARTICIPATION)
            .status(RewardStatus.CONFIRMED)
            .amount(500)
            .build();
    rewardLedgerRepository.save(ledger); // (user_id, response_id, type) 멱등
}

// 잔액은 원장 합계로 도출
@Transactional(readOnly = true)
public long balanceOf(Long userId) {
    return rewardLedgerRepository.sumConfirmedAmount(userId);
}
```

## 구현 가드레일

- 사용자 포인트 잔액 컬럼을 직접 증감하는 코드를 만들지 않는다. 항상 `RewardLedger` 레코드를 추가한다.
- 잔액 조회는 원장 합계(또는 원장에서 갱신되는 캐시 잔액)로 계산한다.
- 검수 결과가 확정되기 전 보상을 `confirmed`로 올리지 않는다. `pending`으로 두고 검수 파이프라인(`02`) 결과에 따라 전이한다.
- 상태 전이는 `pending -> confirmed | cancelled`, `confirmed -> paid_out`만 허용한다. 역방향/건너뛰기 금지.
- 중복 제출·다계정 보상 악용 방지를 위해 (user_id, response_id, type) 단위 멱등성을 보장한다.

## 검증 기준

- pending/confirmed/cancelled/paid_out 상태 전이 테스트.
- 검수 통과 후에만 confirmed 되는지 테스트.
- 같은 응답에 대한 중복 지급이 멱등 처리되는지 테스트.
