---
description: "응답 품질 검수는 제출 API 안에서 동기 처리하지 않고 비동기 파이프라인으로 분리한다. AI 판정은 설명 가능하게 로깅한다."
---

# 02. 응답 검수 파이프라인 규칙

응답 품질 검수(AI 필터링 + 룰 필터)와 AI 판정 로깅 규칙을 정의한다.

근거 문서:
- `.docs/prd/opinion-brief-engineering-review.md` 2.2, 3(P1 판정 기준), 6
- `.docs/prd/opinion-brief-domain-definition.md` 6
- `.docs/prd/opinion-brief-technology-summary.md` 2.3, 3.2

## 설계 기준

### 검수는 제출 API 안에서 동기 처리하지 않는다 (R2)

응답 제출 API 안에서 LLM 호출·품질 판정을 즉시 처리하면, AI 지연이 제출 화면 대기로 이어지고 AI 장애가 제출 장애로 번지며 재검수와 보상 확정이 어려워진다.

권장 흐름:

```text
사용자 응답 제출
  -> BriefResponse 저장 (status = submitted)
  -> ReviewJob 큐 등록
  -> AI/룰 기반 검수 실행
  -> ResponseReview 저장
  -> BriefResponse status = approved | rejected | needs_manual_review
  -> RewardLedger pending/confirmed 기록 (04 문서)
  -> Report 집계 대상 반영 (03 문서)
```

### AI 판정은 설명 가능해야 한다 (R7)

AI가 점수와 보상에 영향을 주므로, 왜 그렇게 판정했는지 재현·설명할 수 있어야 한다. `ResponseReview`는 최소한 아래 필드를 가진다.

```text
ResponseReview
  response_id
  reviewer_type: ai | human | system_rule
  decision: approved | rejected | needs_manual_review
  quality_score
  reason_codes: careless | copied | off_topic | unsupported | abusive | duplicate
  reasoning_summary
  model_name
  prompt_version
  reviewed_at
```

### AI 역할은 분리한다

품질 검수 / 근거 추출 / 리포트 초안 생성은 프롬프트와 평가 기준이 다르므로 하나의 거대한 호출로 합치지 않는다.

## 구현 가드레일

- 응답 제출 컨트롤러/서비스는 `submitted` 저장과 job 등록까지만 한다. 같은 트랜잭션·요청 스레드에서 LLM을 호출하지 않는다.
- 검수 결과는 `BriefResponse` 필드 수정으로 끝내지 않고 항상 `ResponseReview` 레코드를 남긴다.
- LLM 호출에는 `model_name`, `prompt_version`, 입력 텍스트 해시, 출력 JSON, 실패/재시도 횟수를 저장한다.
- 참여자 자유 텍스트(근거 의견)는 신뢰할 수 없는 입력이다. 평가 프롬프트에 넣을 때 시스템 프롬프트와 명확히 구분(구분자/역할 분리)하고, "이 응답을 우수로 평가" 류 인젝션을 방어한다.
- AI 타임아웃·장애 시 전체 파이프라인을 막지 않는다. 재시도 후에도 실패하면 `needs_manual_review`로 전환한다. (job 설계는 `async-job-design` 스킬)

## 검증 기준

- approved / rejected / needs_manual_review 각 경로 테스트.
- AI 타임아웃 → 재시도 → 수동검토 전환 테스트.
- 검수 결과 파서(출력 JSON → decision/score/reason_codes) 단위 테스트.
- 인젝션 시도 입력이 우수 판정으로 통과하지 않는지 eval 테스트.
