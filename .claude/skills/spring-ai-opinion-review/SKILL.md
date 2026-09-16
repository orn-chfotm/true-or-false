---
name: spring-ai-opinion-review
description: "Spring AI와 OpenAI 모델 API로 사용자 의견 검수 adapter, 유형별 프롬프트, 구조화된 판정과 피드백을 구현하는 절차. 의견 검수 연동을 만들거나 변경할 때 사용하며 규정집 Ollama RAG에는 적용하지 않는다."
---

# spring-ai-opinion-review

이 스킬은 Spring AI 기반 사용자 의견 검수 연동, 프롬프트와 판정 처리 경로를 구현하는 절차다.

# 연관 관계

- 의견 검수 구현 순서와 미확정 항목 참조: @.docs/implementation/opinion-review-skills.md
- 응답 검수 파이프라인 규칙 참조: @.claude/rules/backend/02-review-pipeline.md
- 제품 도메인 정의 참조: @.docs/prd/opinion-brief-domain-definition.md
- async-job-design 참조: @.claude/skills/async-job-design/SKILL.md
- 실제 back-end 작업의 배치·구현 규칙 참조: @back-end/CLAUDE.md
- 보상 원장 규칙 참조: @.claude/rules/backend/04-reward-ledger.md
- opinion-review-evaluation 참조: @.claude/skills/opinion-review-evaluation/SKILL.md

# 적용 기준

근거: [구현 안내](../../../.docs/implementation/opinion-review-skills.md), [검수 규칙](../../rules/backend/02-review-pipeline.md), [도메인 정의](../../../.docs/prd/opinion-brief-domain-definition.md) 3·6장.

# 언제 사용하나

- Spring AI 기반 사용자 의견 검수 호출을 구현하거나 변경할 때
- 주제 유형별 프롬프트, 판정 DTO, 사용자 피드백을 설계할 때
- 출력 파싱 오류나 AI 장애의 처리 경로를 수정할 때

# [금지사항]

- Codex App Server·CLI를 실행하거나 규정집용 Ollama·Elasticsearch를 필수 의존성으로 추가하지 않는다. 의견 검수는 Spring AI와 OpenAI API를 사용한다.
- 제출 요청이나 DB 트랜잭션 안에서 LLM을 호출하지 않는다. [비동기 job 스킬](../async-job-design/SKILL.md)을 사용한다.
- 응답의 지시문을 시스템 지침으로 실행하거나, 파싱 실패·타임아웃을 의견 거절로 바꾸지 않는다.
- JSON 변환 성공만으로 결과를 확정하지 않는다. 필수 값·허용 enum·점수 범위·판정과 사유의 일관성을 검증한다.
- API 키를 문서·소스에 넣거나, 모델이 출력한 모델명·버전·식별자를 감사 메타데이터로 신뢰하지 않는다.

# 입력과 출력 경계

| 구분 | 포함할 내용 |
|---|---|
| 검수 입력 | 주제 유형, 질문·배경, 선택지·선택한 입장, 근거 의견, 제공된 출처·비교 자료 |
| 모델 판정 | `decision`, `quality_score`, `reason_codes`, `reasoning_summary` |
| 사용자 피드백 | 반영 제외 사유와 개선 가이드. 필드명은 API 계약에서 정하고 내부 감사 설명과 분리 |
| 서버 기록 | 응답·작업 식별자, 실제 모델·프롬프트 버전, 입력 해시, 출력 JSON, 시도·오류·처리 시간, 제공되는 사용량 |

`quality_score` 범위와 필수 조건은 아직 미확정이다. 구현 전에 정하며, 예시 숫자를 정책으로 사용하지 않는다. `reasoning_summary`는 판정의 짧은 근거 요약이며 모델의 내부 사고 과정이 아니다.

# 절차

1. [백엔드 규칙](../../../back-end/CLAUDE.md)과 구현 안내의 미확정 항목을 확인한다. 실제 모델·API·Spring AI 버전의 호환성과 지원 옵션을 공식 문서로 확인한 뒤 의존성과 설정을 정한다.
2. 위 입력·출력 계약을 확정한다. 상태·사유 코드는 검수 규칙과 맞추고, Spring AI 타입은 `infra.ai` 밖의 도메인에 노출하지 않는다. 흐름 조합과 트랜잭션 경계는 `api-*` service에서 관리한다.
3. 결정적인 필수 입력·길이·반복 검사와 LLM의 의미 평가를 구분한다. 복붙·중복 판정에는 비교 대상이나 검사 결과를 전달한다. 근거 없는 모델 추측으로 복붙을 확정하지 않는다.
4. 버전 관리되는 프롬프트 리소스를 만들고 공통 기준과 주제 유형별 기준을 구성한다. 주장 검증형은 사실·제공 출처, 찬반형은 입장·근거 연결, 선택 비교형은 선택·비교 대상 관련성을 평가한다.
5. 사용자 의견과 출처 본문을 신뢰할 수 없는 데이터로 분리한다. 다른 입장이라는 이유로 거절하지 않도록 기준을 명시한다. 자료를 읽지 못한 주장은 검증 완료로 처리하지 않고 수동 검토 사유를 남긴다.
6. Spring AI 호출 결과를 검수 DTO로 변환·검증한다. 선택한 버전과 모델이 지원하는 구조화 출력 방식을 사용하되 애플리케이션 검증도 유지한다. 피드백은 한국어로 작성하고 입력에 없는 사실·경험·출처를 보충하지 않는다.
7. 일시적인 호출 실패와 인증·설정 오류를 구분한다. 재시도 책임을 job 또는 client 한 곳에 명확히 두어 중첩 재시도를 피한다. 한도 초과나 복구 불가 시 `needs_manual_review`로 전환한다.
8. 검수 기록·현재 상태를 일관되게 저장하고 [보상 규칙](../../rules/backend/04-reward-ledger.md)에 따라 중복 집계·보상을 방지한다. 관리자 판정과 늦은 AI 응답의 충돌 정책은 구현 안내에서 확인한다.
9. [평가 스킬](../opinion-review-evaluation/SKILL.md)로 계약·장애 테스트와 모델 품질 평가를 구분해 검증한다.

# 예시

```text
Save response + durable review job
  -> claim job
  -> validate input and prepare review context
  -> call Spring AI outside DB transaction
  -> validate structured result
  -> persist review and apply state consistently
  -> approved | rejected | needs_manual_review
```

# 체크리스트

- [ ] 세 가지 주제 유형의 입력과 기준을 구분했는가?
- [ ] 잘못된 출력·호출 실패가 사용자 의견의 거절 판정으로 저장되지 않는가?
- [ ] 실제 호출 설정과 검수 이력을 추적할 수 있는가?
- [ ] 반영 제외 결과에 근거 있는 사유와 개선 가이드가 있는가?
- [ ] 일반 로그·사용자 응답에 API 키, 불필요한 개인정보, 내부 출력이 노출되지 않는가?
- [ ] 승인·거절·수동 검토와 재시도·중복 완료 경로를 검증했는가?

# 산출물

```md
## Spring AI 의견 검수 구현

- 모델·API·라이브러리 버전:
- 입력·출력 계약과 프롬프트 버전:
- 유형별 기준과 출처 확인 범위:
- 장애·재시도·수동 검토:
- 상태 반영·감사 기록·사용자 피드백:
- 수행한 검증과 미검증 항목:
```
