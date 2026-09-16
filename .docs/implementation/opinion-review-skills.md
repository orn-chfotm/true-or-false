# 사용자 의견 검수 구현용 Claude 스킬

이 문서는 Spring AI 기반 사용자 의견 검수를 Claude Code로 구현할 때 읽을 규칙과 스킬을 연결한다. 애플리케이션 구현 완료를 의미하지 않는다.

## 확정한 범위

- 사용자 의견 검수는 Spring AI를 통한 모델 API 호출로 유지한다. Codex App Server를 검수 실행 경로로 도입하지 않는다.
- 현재 선택한 공급자는 OpenAI다. 정확한 모델 ID, API 종류, Spring AI 버전은 구현 전에 확인한다. OpenAI 모델 호출을 Codex 앱 실행과 동일하게 취급하지 않는다.
- 대상은 의견 제출 이후의 품질 판정, 사유·개선 가이드, 수동 검토 전환이다. 주제 생성 검수와 리포트 생성은 별도 작업이다.
- Claude는 구현 도구이며, 서비스에서 의견을 검수하는 모델 공급자와는 별개다.

## 근거 문서와 적용 경계

| 문서 | 이번 작업에서 읽을 내용 |
|---|---|
| [도메인 정의](../prd/opinion-brief-domain-definition.md) 3·6·7·9장 | 세 가지 주제 유형, 검수 기준, 사용자 피드백, 대중 판단과 AI 검토 분리, 보상 조건 |
| [제품 기획](../prd/opinion-brief-product-plan.md) 5.2·5.3장 | 선택과 근거 제출, 저품질 응답 필터 |
| [기술 검토](../prd/opinion-brief-engineering-review.md) 2.2·3·6장 | 비동기 검수, 판정 기록, 구현 검증 |
| [기술 정리](../prd/opinion-brief-technology-summary.md) 2.3·3.2장 | 규칙·유사도·LLM의 역할, 평가 로그와 비용 추적 |
| [검수 파이프라인 규칙](../../.claude/rules/backend/02-review-pipeline.md) | 현재 검수 방식과 상태·감사 기록의 기준 |
| [백엔드 진입점](../../back-end/CLAUDE.md) | 모듈·패키지·서비스 배치 |

기술 정리의 WebClient 직접 연동은 이전 후보안이다. 사용자 의견 검수에는 이번에 확정한 Spring AI 연동을 적용한다. 규정집 RAG의 Ollama·Elasticsearch 요구를 의견 검수의 필수 의존성으로 가져오지 않는다.

`back-end/` 구현 시 기존 경계대로 모듈명은 `api-user`·`api-admin`, 흐름 조합은 `api-*` service, 외부 AI 구현은 `infra.ai`, JPA 구현은 `infra.persistence`를 따른다. Opinion Brief의 검수 정책은 루트 도메인 규칙에서 읽는다. 루트 스킬의 `user-api`·`admin-api` 모듈명이나 `/v1` 예시 URL을 그대로 복사하지 말고 백엔드 URL 규칙과 대조한다. 최종 경로가 정해지지 않은 API는 계약 단계에서 확인한다.

## 사용할 스킬

새 스킬 두 개는 프로젝트 루트 `.claude/skills/`에 둔다. 기존 스킬은 해당 작업이 필요할 때만 읽는다.

| 작업 | 스킬 | 확인할 결과 |
|---|---|---|
| 프로젝트 골격이 없을 때 | [gradle-multi-project-structure](../../back-end/.claude/skills/gradle-multi-project-structure/SKILL.md) | 실행 모듈 분리와 단방향 의존 |
| 응답·검수 상태 설계 | [backend-domain-review](../../.claude/skills/backend-domain-review/SKILL.md) | `BriefResponse`·`ResponseReview`와 허용 상태 전이 |
| 검수·작업 이력 저장 | [flyway-migration](../../.claude/skills/flyway-migration/SKILL.md) | 검수 이력·작업 상태·중복 처리 제약 |
| 제출 후 검수 실행 | [async-job-design](../../.claude/skills/async-job-design/SKILL.md) | 작업 복구·재시도·타임아웃·멱등성·수동 전환 |
| Spring AI 연동과 프롬프트 | [spring-ai-opinion-review](../../.claude/skills/spring-ai-opinion-review/SKILL.md) — 신규 | 입력·출력 계약, 유형별 평가, 호출·파싱 실패 처리 |
| 모델·프롬프트 평가 | [opinion-review-evaluation](../../.claude/skills/opinion-review-evaluation/SKILL.md) — 신규 | 사람 기준과 비교한 오거절·누락·피드백 품질 |
| 제출·조회·관리자 검수 API | [api-module-implementation](../../back-end/.claude/skills/api-module-implementation/SKILL.md), [backend-api-design](../../.claude/skills/backend-api-design/SKILL.md) | 백엔드 배치 규칙, 본인 응답 접근, 관리자 권한·감사 기록 |
| 참여자 검수 상태·피드백 UI | [frontend-async-status](../../.claude/skills/frontend-async-status/SKILL.md) | 검수 중·반영 완료·반영 제외·추가 검수 중, 사유·가이드 |

보상 연계는 [보상 원장 규칙](../../.claude/rules/backend/04-reward-ledger.md), 모델 입력과 사용자 응답의 개인정보 처리는 [개인정보 규칙](../../.claude/rules/backend/06-privacy.md)을 함께 확인한다. 검수 구현을 위해 결제·리포트·규정집 RAG 전체를 구현하지 않는다.

## 구현 순서와 완료 기준

1. **입출력·평가 기준 확정**: 주제 유형, 질문, 선택지, 근거, 제공 자료를 입력으로 정의한다. 판정 enum·점수 의미·사유·사용자 가이드 계약과 사람 판정 사례를 먼저 만든다.
2. **저장·비동기 처리**: 응답과 검수 작업을 유실 없이 저장한다. 외부 호출 동안 DB 트랜잭션을 유지하지 않는다. 재시작 복구와 동일 작업 중복 실행을 검증한다.
3. **Spring AI adapter**: 프롬프트와 사용자 입력을 분리하고 구조화된 결과를 검증한다. 승인·거절·수동 검토, API 실패·잘못된 출력 경로를 테스트한다.
4. **결과 반영**: `ResponseReview` 기록과 상태 반영을 일관되게 처리한다. 제출만으로 유효 집계·보상 확정을 하지 않고, 중복 완료가 이중 반영되지 않는지 확인한다.
5. **API·UI 연결**: 본인 조회와 관리자 검수 권한을 검증한다. 거절 사유·개선 가이드를 제공하고 장애를 사용자 의견의 결함으로 표시하지 않는다.
6. **품질 평가**: 고정된 평가 세트로 모델·프롬프트별 결과를 비교한다. 합의한 통과 기준을 만족했는지, 실행하지 못한 평가가 무엇인지 기록한다.

현재 저장소에는 애플리케이션 소스·빌드 도구가 없다. 스캐폴딩 후 실제 존재하는 명령만 실행하고, 문서 검증을 구현 테스트나 모델 품질 평가 통과로 보고하지 않는다.

## 구현 전에 확인할 결정

| 항목 | 확인할 내용 |
|---|---|
| 모델·호출 설정 | 실제 모델 ID, Spring AI·Spring Boot 호환 버전, 지원 API와 구조화 출력 방식 |
| 평가 정책 | 점수 범위·의미, 승인·거절·수동 검토 기준, 유형별 평가 통과 기준 |
| 출처 확인 | 주장 검증형에서 제공하는 자료의 범위와 URL 본문 수집 여부. URL만 보고 출처 내용을 읽었다고 판단하지 않음 |
| 운영 한도 | 타임아웃, 재시도 횟수·간격, 처리량·비용 한도. 기존 100건/10분 목표의 이번 범위 적용 여부 |
| 수동·재검수 | 관리자 판정 후 늦은 AI 응답 처리, 재검수 식별·이력, 이미 반영한 집계·보상 조정 정책 |

사전 결정이 필요한 항목은 추정값을 제품 정책으로 확정하지 않는다. 해당 구현에 들어가기 전에 확인하며, 독립적인 문서·계약 정리는 진행할 수 있다.

## Claude에서 사용

프로젝트 루트에서 Claude Code를 실행하고 필요한 스킬을 호출한다.

```text
/spring-ai-opinion-review
이 안내 문서와 검수 파이프라인 규칙을 읽고, 미확정 항목을 확인한 뒤 사용자 의견 검수를 구현해줘.

/opinion-review-evaluation
구현한 검수의 세 가지 주제 유형과 장애 경로를 검증하고, 모델·프롬프트 평가 결과를 정리해줘.
```

형식은 [Claude Skills 공식 문서](https://code.claude.com/docs/en/skills)와 [CLAUDE.md·rules 공식 문서](https://code.claude.com/docs/en/memory), 저장소의 [스킬·규칙 템플릿](../../.claude/rules/harness/12-skill-rule-template.md)을 따른다. 스킬 본문은 필요할 때 읽고, 공통 불변식은 규칙 문서에 둔다.
