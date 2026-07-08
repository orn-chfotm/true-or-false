---
name: backend-domain-review
description: "Opinion Brief 백엔드 엔티티/상태전이 설계가 도메인 룰(01~06)을 위반하지 않는지 점검하는 절차. 새 엔티티·상태·연관을 추가하거나 리뷰할 때 사용한다."
---

# backend-domain-review

Opinion Brief 백엔드의 도메인 모델(엔티티, 상태 전이, 연관)이 `.claude/rules/backend/01~06`을 지키는지 점검하는 절차다.

## 언제 사용하나

- 새 엔티티/상태값/연관을 추가할 때
- 기존 엔티티 구조를 바꿀 때
- 엔티티 설계 PR을 리뷰할 때

## 절차

1. 대상 엔티티와 관련 룰 파일을 매핑한다.
   - 도메인/상태/신뢰점수 → `.claude/rules/backend/01-domain-model.md`
   - 검수/AI 로깅 → `.claude/rules/backend/02-review-pipeline.md`
   - 리포트 → `.claude/rules/backend/03-report-snapshot.md`
   - 보상 → `.claude/rules/backend/04-reward-ledger.md`
   - 슬롯/동시성 → `.claude/rules/backend/05-participation-slot.md`
   - 개인정보 → `.claude/rules/backend/06-privacy.md`
2. 아래 체크리스트로 위반을 찾는다.
3. 위반이 있으면 룰 위반 항목과 수정 방향을 정리한다.
4. 룰에 없는 새 상태 전이·모델이 필요하면, 임의로 추가하지 말고 해당 룰 문서에 먼저 반영을 제안한다.

## 체크리스트

- [ ] 최상위가 `OpinionBrief`인가? 범용 `Poll/Survey/Post`로 시작하지 않았는가?
- [ ] 상태값이 enum이고, 전이가 정의된 경로만 따르는가?
- [ ] 신뢰점수를 리포트/집계에서 스냅샷으로 참조하는가?
- [ ] 검수 결과가 `ResponseReview`로 남고 model_name/prompt_version/reason_codes를 저장하는가?
- [ ] 리포트가 `*_json` 스냅샷으로 고정되는가? 실시간 재집계가 아닌가?
- [ ] 포인트를 잔액 직접 수정이 아니라 `RewardLedger`로 처리하는가?
- [ ] 응답 제출이 `reserved` 슬롯에서만 가능한가?
- [ ] 프로필이 버킷 값으로 저장되고, 리포트 원문이 마스킹되는가?

## 산출물

```md
## 도메인 리뷰 결과

- 대상 엔티티/변경:
- 관련 룰:
- 위반 항목:
- 수정 방향:
- 룰 문서 갱신 필요 여부:
```
