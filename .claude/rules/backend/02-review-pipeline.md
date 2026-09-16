---
description: "응답 품질 검수는 제출 API 안에서 동기 처리하지 않고 비동기 파이프라인으로 분리한다. AI 판정은 설명 가능하게 로깅한다."
---

# 02. 응답 검수 파이프라인 규칙

이 문서는 응답 품질 검수의 비동기 처리, 판정 기준, 사용자 피드백과 감사 기록을 정의한다.

# 연관 관계

- async-job-design 참조: @.claude/skills/async-job-design/SKILL.md
- 제품 기술 검토 근거 참조: @.docs/prd/opinion-brief-engineering-review.md
- 제품 도메인 정의 참조: @.docs/prd/opinion-brief-domain-definition.md
- 제품 기술 구성 근거 참조: @.docs/prd/opinion-brief-technology-summary.md
- 의견 검수 구현 순서와 미확정 항목 참조: @.docs/implementation/opinion-review-skills.md
- spring-ai-opinion-review 참조: @.claude/skills/spring-ai-opinion-review/SKILL.md
- opinion-review-evaluation 참조: @.claude/skills/opinion-review-evaluation/SKILL.md

# 적용 기준

응답 품질 검수(AI 필터링 + 룰 필터)와 AI 판정 로깅 규칙을 정의한다.

근거 문서:
- `.docs/prd/opinion-brief-engineering-review.md` 2.2, 3(P1 판정 기준), 6
- `.docs/prd/opinion-brief-domain-definition.md` 6
- `.docs/prd/opinion-brief-technology-summary.md` 2.3, 3.2

# [금지사항]

- 응답 제출 API의 요청 스레드·트랜잭션에서 LLM을 동기 호출하지 않는다. 저장 + 큐 등록까지만 한다.
- 검수 결과를 `BriefResponse` 필드 수정만으로 끝내지 않는다. 항상 `ResponseReview` 레코드를 남긴다.
- `model_name`/`prompt_version`/입력 해시/출력 JSON 없이 AI 판정을 저장하지 않는다.
- 참여자 자유 텍스트를 시스템 프롬프트와 구분 없이 그대로 평가 프롬프트에 넣지 않는다(인젝션 방어).
- AI 타임아웃·장애 시 전체 파이프라인을 막지 않는다. 재시도 후 `needs_manual_review`로 전환한다.
- Codex App Server나 Codex CLI를 검수 실행 경로로 사용하지 않는다.
- 모델 호출을 Codex 앱의 실행 환경과 동일하게 취급하지 않는다.
- 다른 입장이라는 이유로 의견을 제외하지 않는다.
- 모델의 추측만으로 복붙·중복 판정을 확정하지 않는다.

# 설계 기준

## 사용자 의견 검수는 Spring AI를 사용한다

- Spring AI를 통해 OpenAI 모델 API를 호출한다.
- 모델 ID·Spring AI 버전·호출 API는 구현 시 호환성을 확인하고 설정으로 관리한다.
- 규정집 RAG용 Ollama·Elasticsearch는 이 검수의 필수 의존성이 아니다.
- 구현 절차와 미확정 항목은 [구현 안내](../../../.docs/implementation/opinion-review-skills.md), 연동은 [Spring AI 검수 스킬](../../skills/spring-ai-opinion-review/SKILL.md), 품질 검증은 [평가 스킬](../../skills/opinion-review-evaluation/SKILL.md)을 따른다.

## 주제 유형별 검수와 사용자 피드백

- 공통으로 무성의·복붙·욕설·주제 이탈·근거 없음·선택과 근거 불일치를 평가한다.
- 주장 검증형은 사실 주장과 제공 출처, 찬반 판단형은 입장과 근거의 연결, 선택 비교형은 선택한 대안과 이유의 관련성을 평가한다.
- 출처 내용을 확인할 수 없거나 자료가 부족하면 사실 검증 완료로 처리하지 않는다. 자동으로 승인·거절하기보다 `needs_manual_review`와 확인할 내용을 남긴다.
- 복붙·중복 판정은 비교 자료나 검사 결과에 근거한다.
- 반영 제외 시 한국어 사유와 개선 가이드를 제공한다. 내부 감사용 `reasoning_summary`와 사용자에게 공개할 피드백은 구분한다.
- 호출 실패·잘못된 출력은 의견의 결함이 아니다. 재시도 정책에 따라 처리하고 해결되지 않으면 수동 검토로 보낸다.

## 검수는 제출 API 안에서 동기 처리하지 않는다 (R2)

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

## AI 판정은 설명 가능해야 한다 (R7)

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

## AI 역할은 분리한다

품질 검수 / 근거 추출 / 리포트 초안 생성은 프롬프트와 평가 기준이 다르므로 하나의 거대한 호출로 합치지 않는다.

# 예시

```java
// 제출: 저장 + 큐 등록까지만 (LLM 동기 호출 X)
@Transactional
public void submit(SubmitResponseCommand command) {
    BriefResponse response = briefResponseRepository.save(command.toEntity()); // status = SUBMITTED
    reviewJobPublisher.enqueue(response.getId());
}
```

```java
// 검수 워커: AI 판정 → ResponseReview 기록 → 상태 전이
public void review(Long responseId) {
    AiReviewResult result = aiReviewClient.evaluate(responseId); // infra
    ResponseReview review = ResponseReview.builder()
            .responseId(responseId)
            .reviewerType(ReviewerType.AI)
            .decision(result.decision())
            .qualityScore(result.qualityScore())
            .reasonCodes(result.reasonCodes())
            .modelName(result.modelName())
            .promptVersion(result.promptVersion())
            .build();
    responseReviewRepository.save(review);
}
```

# 구현 가드레일

- 응답 제출 컨트롤러/서비스는 `submitted` 저장과 job 등록까지만 한다. 같은 트랜잭션·요청 스레드에서 LLM을 호출하지 않는다.
- 검수 결과는 `BriefResponse` 필드 수정으로 끝내지 않고 항상 `ResponseReview` 레코드를 남긴다.
- LLM 호출에는 `model_name`, `prompt_version`, 입력 텍스트 해시, 출력 JSON, 실패/재시도 횟수를 저장한다.
- 모델 출력은 필수 값·enum·합의된 점수 범위와 판정·사유의 일관성을 검증한다. 모델명·프롬프트 버전·응답 ID는 모델이 생성한 값이 아니라 서버의 실제 호출 정보로 기록한다.
- 출력 JSON은 접근이 제한된 감사 기록으로 보관하고 일반 로그나 사용자 응답에 그대로 노출하지 않는다. 호출에는 검수에 필요한 최소 문맥만 전달한다.
- 참여자 자유 텍스트(근거 의견)는 신뢰할 수 없는 입력이다. 평가 프롬프트에 넣을 때 시스템 프롬프트와 명확히 구분(구분자/역할 분리)하고, "이 응답을 우수로 평가" 류 인젝션을 방어한다.
- AI 타임아웃·장애 시 전체 파이프라인을 막지 않는다. 재시도 후에도 실패하면 `needs_manual_review`로 전환한다. (job 설계는 `async-job-design` 스킬)

# 검증 기준

- approved / rejected / needs_manual_review 각 경로 테스트.
- AI 타임아웃 → 재시도 → 수동검토 전환 테스트.
- 검수 결과 파서(출력 JSON → decision/score/reason_codes) 단위 테스트.
- 인젝션 시도 입력이 우수 판정으로 통과하지 않는지 eval 테스트.
- 세 주제 유형별 사람 판정과 비교하고 정상 의견 오거절·부실 의견 승인·수동 검토 비율을 분리 평가한다.
- 반영 제외 시 입력에 근거한 사유·개선 가이드를 제공하고, 장애 시 사용자 의견을 거절하지 않는지 검증한다.
