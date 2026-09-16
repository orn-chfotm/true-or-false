---
description: "선착순/무작위 참여 슬롯은 원자적으로 예약하고, reserved 상태에서만 응답 제출을 허용한다."
---

# 05. 참여 슬롯 동시성 규칙

이 문서는 참여 슬롯의 원자적 예약, 제출 자격, 만료와 마감 조건을 정의한다.

# 연관 관계

- async-job-design 참조: @.claude/skills/async-job-design/SKILL.md
- 제품 기술 검토 근거 참조: @.docs/prd/opinion-brief-engineering-review.md
- 제품 기술 구성 근거 참조: @.docs/prd/opinion-brief-technology-summary.md
- 제품 도메인 정의 참조: @.docs/prd/opinion-brief-domain-definition.md

# 적용 기준

참여자 배정, 선착순 참여, 마감 조건의 동시성 규칙을 정의한다.

근거 문서:
- `.docs/prd/opinion-brief-engineering-review.md` P1(동시성), 4.3, 8.1
- `.docs/prd/opinion-brief-technology-summary.md` 2.2
- `.docs/prd/opinion-brief-domain-definition.md` 5, 8

# [금지사항]

- 슬롯 없는 직접 제출 경로를 만들지 않는다. `reserved` 상태(미만료)에서만 제출을 허용한다.
- 슬롯을 비원자적으로 차감하지 않는다(count 조회 후 save 금지). 초과 점유는 DB 조건부 UPDATE 카운터 또는 Redis `INCR`로 막는다.
- 유니크 제약만으로 초과 점유를 막았다고 판단하지 않는다. `(opinion_brief_id, user_id)` 유니크는 **중복 예약**만 막고 총원 초과는 못 막는다.
- Brief당 사용자 중복 응답을 허용하지 않는다.
- 종료 조건 없는 무제한 누적형 투표를 만들지 않는다(인원 + 시간 혼합형).

# 설계 기준

## 응답 권한과 슬롯 점유를 분리한다 (R5)

선착순/무작위 선정은 전형적인 레이스 컨디션 지점이다. 100명 제한인데 동시에 130명이 제출하거나, 마감 직전 중복 참여가 생길 수 있다. 응답 권한(슬롯)을 먼저 점유하고, 제출은 점유된 슬롯에서만 허용한다.

권장 모델:

```text
BriefParticipantSlot
  id
  opinion_brief_id
  user_id
  source: random_invite | first_come | manual_target
  status: invited | reserved | submitted | expired | cancelled
  reserved_at
  expires_at
```

## 목표 승인 수와 슬롯 수를 분리한다

승인 응답 100개가 목표라면, 예상 탈락률을 감안해 실제 제출 슬롯은 120~150개까지 운영한다.

# 예시

```java
// 초과 점유 방지: DB 조건부 UPDATE 카운터 (영향 행 0 = 마감)
// UPDATE opinion_brief SET reserved_slot_count = reserved_slot_count + 1
//  WHERE id = :briefId AND reserved_slot_count < max_slots
// ※ count 조회 후 save하는 방식은 레이스 컨디션으로 초과 모집이 발생하므로 금지
@Transactional
public BriefParticipantSlot reserve(Long briefId, Long userId) {
    int updated = briefSlotCounterRepository.tryOccupy(briefId); // 조건부 UPDATE, 원자적
    if (updated == 0) {
        throw new SlotSoldOutException(briefId); // 잔여 슬롯 없음
    }
    try {
        // 중복 예약 방지: (opinion_brief_id, user_id) 유니크 제약
        return slotRepository.save(BriefParticipantSlot.reserve(briefId, userId)); // status = RESERVED
    } catch (DataIntegrityViolationException e) {
        briefSlotCounterRepository.release(briefId); // 점유 반환
        throw new AlreadyReservedException(briefId, userId);
    }
}

// 제출은 reserved(미만료) 슬롯에서만
@Transactional
public void submit(Long slotId, Long userId, SubmitResponseCommand command) {
    BriefParticipantSlot slot = slotRepository.findReservableSlot(slotId, userId)
            .orElseThrow(() -> new SlotNotReservableException(slotId));
    slot.markSubmitted();
    // ... 응답 저장 (02-review-pipeline)
}
```

# 구현 가드레일

- 슬롯 예약은 원자적으로 처리한다. 기본은 DB 조건부 UPDATE 카운터(영향 행 0 = 마감)이고, 트래픽이 커지면 Redis 원자 카운터(`INCR`)로 대체한다. 중복 예약은 `(opinion_brief_id, user_id)` 유니크 제약으로 막는다.
- 응답 제출은 슬롯이 `reserved`이고 만료되지 않았을 때만 허용한다. 슬롯 없는 직접 제출 경로를 만들지 않는다.
- 만료 슬롯(`expires_at` 경과)은 스케줄러로 `expired` 처리하고, 잔여 슬롯으로 되돌린다. (job 설계는 `async-job-design` 스킬)
- (opinion_brief_id, user_id) 단위로 Brief당 1회 응답을 보장한다.
- 마감은 인원 + 시간 혼합형이다. 목표 승인 수 도달 시 조기 종료, 마감 시각 도달 시 최소 승인 수 충족 여부로 확정.

# 검증 기준

- 동시 예약 요청에서 목표 슬롯을 초과 점유하지 않는지 테스트.
- 만료된 슬롯으로 제출 시 실패하는지 테스트.
- 두 탭 동시 제출 등 중복 제출 방지 테스트.
