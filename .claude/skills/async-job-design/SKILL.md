---
name: async-job-design
description: "검수/리포트/보상/슬롯만료 등 비동기 job을 큐·재시도·타임아웃·수동전환 폴백까지 포함해 설계하는 절차. 마감 시간이 걸린 백그라운드 작업을 만들 때 사용한다."
---

# async-job-design

24시간 마감이 걸린 상품에서 안전하게 동작하는 비동기 job을 설계하는 절차다.

근거:
- `.docs/prd/opinion-brief-engineering-review.md` 2.2, 8.1
- `.docs/prd/opinion-brief-technology-summary.md` 3.1, 6.4
- 내구성 유의: `@Async`/Spring Events는 인메모리라 재시작·배포 중 작업이 유실될 수 있다. 마감 걸린 작업은 DB 상태 추적 + 재시도가 필요하다.

## 언제 사용하나

- 검수/리포트/보상/슬롯만료 등 백그라운드 job을 새로 만들 때
- 기존 job에 재시도·타임아웃·폴백을 추가하거나 리뷰할 때
- 마감 시간이 걸린 비동기 처리를 설계할 때

## 금지 규칙 (하지 말 것)

- ❌ 마감이 걸린 작업을 순수 인메모리(`@Async`/Spring Events)만으로 처리하지 않는다. 재시작·배포 중 유실된다. DB 상태 추적 + 재시도를 둔다.
- ❌ 요청 스레드·트랜잭션 안에서 LLM 등 외부 호출을 동기로 처리하지 않는다. (`.claude/rules/backend/02-review-pipeline.md`)
- ❌ 타임아웃·폴백 없는 AI 호출을 만들지 않는다. 재시도 후에도 실패하면 `needs_manual_review` 같은 수동 경로로 전환한다.
- ❌ 멱등 키 없이 job을 설계하지 않는다. 중복 실행 시 보상 이중 지급·중복 집계가 생긴다.

## 대상 job

- 응답 품질 검수 (`.claude/rules/backend/02-review-pipeline.md`)
- 리포트 초안 생성 (`.claude/rules/backend/03-report-snapshot.md`)
- 보상 확정 (`.claude/rules/backend/04-reward-ledger.md`)
- 슬롯 만료 처리 (`.claude/rules/backend/05-participation-slot.md`)
- 알림 발송·마감 리마인드

## 설계 원칙

- **상태를 DB로 추적한다.** 순수 인메모리(`@Async`/Spring Events)만으로 마감 걸린 작업을 처리하지 않는다. 최소한 job 상태 테이블 + 재시도 카운트를 둔다.
- **재시도·타임아웃·폴백을 명시한다.** AI 호출은 타임아웃을 걸고, 재시도 후에도 실패하면 `needs_manual_review` 같은 수동 경로로 전환한다.
- **멱등하게 설계한다.** 같은 job이 중복 실행돼도 보상 이중 지급·중복 집계가 없어야 한다.
- **성능 목표를 지킨다.** 검수: 승인 응답 100개 기준 10분 이내. 리포트 초안: 승인 충족 후 15분 이내.

## 절차

1. job의 입력·출력·성공 조건·실패 조건을 정의한다.
2. 상태 테이블 스키마(status, retry_count, last_error, updated_at)를 잡는다.
3. 타임아웃·최대 재시도·폴백 경로를 정한다.
4. 멱등 키를 정한다. (예: response_id + job_type)
5. 실패·재시도·수동전환 테스트를 작성한다.

## 체크리스트

- [ ] job 상태가 DB로 추적되는가? 재시작 시 유실되지 않는가?
- [ ] 타임아웃·재시도·수동전환 폴백이 있는가?
- [ ] 중복 실행에 멱등한가?
- [ ] 성능 목표(검수 10분/리포트 15분)를 만족하는가?
- [ ] 작업량 증가 시 RabbitMQ/Kafka 전환 지점을 문서화했는가?

## 산출물

```md
## 비동기 job 설계

- job:
- 입력/출력:
- 상태 모델:
- 타임아웃/재시도/폴백:
- 멱등 키:
- 검증:
```
