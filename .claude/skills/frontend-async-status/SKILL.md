---
name: frontend-async-status
description: "비동기 검수 결과를 반영하는 상태 화면(제출→검수 중→결과)을 FSD 구조로 만드는 절차. 폴링/무효화, 만료·에러 처리를 포함한다."
---

# frontend-async-status

이 스킬은 응답 제출부터 비동기 검수 결과 수신까지의 상태 화면을 구현하는 절차다.

# 연관 관계

- 비동기 검수 상태 UI 규칙 참조: @.claude/rules/frontend/04-async-status-ui.md
- 응답 검수 파이프라인 규칙 참조: @.claude/rules/backend/02-review-pipeline.md
- FSD 구조 정책 (Feature-Sliced Design) 참조: @.claude/rules/frontend/00-architecture.md

# 적용 기준

응답 제출 후 비동기 검수 결과가 도착할 때까지의 상태 화면을 만드는 절차다.

근거: `.claude/rules/frontend/04-async-status-ui.md`, `.claude/rules/backend/02-review-pipeline.md`, `.claude/rules/frontend/00-architecture.md`

# 언제 사용하나

- 응답 제출 → 검수 결과 반영까지의 상태 화면을 만들 때
- 검수 상태 표시·갱신(폴링/무효화) 로직을 추가하거나 바꿀 때
- 만료·마감·에러 상태 처리를 붙일 때

# [금지사항]

- 제출 성공을 "유효 반영"으로 확정 표시하지 않는다. "제출 완료" → "검수 중"으로 시작한다.
- 내부 상태값(approved/rejected/needs_manual_review)을 그대로 노출하지 않는다. 도메인 문구만 쓴다.
- 검수 결과를 클라이언트에서 낙관 확정하지 않는다. 폴링/무효화로 갱신한다.
- 반영 제외/무효에 사유·개선 가이드를 빠뜨리지 않는다.
- 상태 로직을 잘못된 레이어에 두지 않는다(모델은 `entities/response`). slice 내부 deep import 금지.

# FSD 배치

- 응답·검수 상태 모델은 `entities/response`의 `model`·`api`에 둔다.
- 상태 표시 블록은 `widgets/response-status` 또는 관련 `features`에 둔다. 외부에는 `index.ts`로만 노출한다.

# 절차

1. 제출 mutation 성공을 "제출 완료"로 표시한다. "유효 반영"으로 확정하지 않는다.
2. 검수 상태를 `entities/response`의 query로 조회하고, 폴링 또는 `invalidateQueries`로 갱신한다.
3. 내부 상태값을 도메인 문구로 매핑한다.
   - submitted/reviewing → "검수 중"
   - approved → "유효 투표 반영 완료"
   - rejected → "투표 반영 제외"
   - needs_manual_review → "추가 검수 중"
4. 반영 제외/무효에는 사유 + 개선 가이드 영역을 렌더한다.
5. 슬롯 만료·마감 후 제출·네트워크 오류에 명확한 에러 메시지를 준다.
6. 보상 상태(pending/confirmed)가 검수 결과에 종속됨을 표시한다.

# 체크리스트

- [ ] 상태 모델이 `entities/response`에 있고 public API로 노출되는가?
- [ ] 제출 직후 "검수 중"으로 시작하는가?
- [ ] 폴링/무효화로 상태가 전이되는가? 낙관 확정하지 않는가?
- [ ] 도메인 문구만 노출하고 내부 상태값을 숨기는가?
- [ ] 반영 제외 시 사유·가이드가 보이는가?
- [ ] 만료/마감/에러 상황에 명확한 메시지가 있는가?

# 산출물

```md
## 검수 상태 화면

- slice(레이어/이름):
- 상태 매핑:
- 갱신 방식(폴링/무효화):
- 에러·만료 처리:
```
