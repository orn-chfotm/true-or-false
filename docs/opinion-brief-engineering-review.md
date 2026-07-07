# Opinion Brief 기술 검토 보고서

작성일: 2026-07-02  
대상 문서: [Opinion Brief 제품 기획서](./opinion-brief-product-plan.md)

## 1. 검토 요약

Opinion Brief 기획은 제품 방향이 비교적 명확하다. 핵심은 일반 투표 서비스가 아니라, 구조화된 의견 요청서인 Opinion Brief를 만들고, 응답 품질 검수와 표본 신뢰 라벨을 거쳐 B2B 리포트로 변환하는 것이다.

기술 관점에서 MVP의 핵심 난점은 화면 구현이 아니다. 아래 4개 시스템을 안정적으로 분리하는 것이 중요하다.

1. Opinion Brief 생성 및 상태 관리
2. 응답자 배정 및 참여 제한
3. AI 기반 응답 품질 검수와 사용자 신뢰 점수
4. 리포트 생성, 보상 확정, 감사 가능한 근거 보관

가장 중요한 결론은 이것이다.

**MVP는 "투표 게시판"이 아니라 "품질 검수 파이프라인이 있는 리포트 생성 시스템"으로 설계해야 한다.**

## 2. 주요 기술 판단

### 2.1 Opinion Brief는 최상위 도메인 모델이어야 한다

제품 문서는 Opinion Brief를 핵심 제품 단위로 정의한다. 특히 제품 기획서 73-85행은 주제, 판단 축, 응답자 조건, 필요한 응답 수, 마감 시간, 응답 품질 기준, 리포트 형식을 Opinion Brief 구성 요소로 제시한다.

기술적으로도 이 선택이 맞다. `Poll`, `Survey`, `Post` 같은 범용 모델에서 시작하면 나중에 광고 카피, 브랜드 인식, 제품 콘셉트, 사회 이슈 같은 템플릿을 억지로 붙이게 된다.

권장 모델명:

- `OpinionBrief`
- `BriefTemplate`
- `BriefQuestion`
- `BriefAudienceRule`
- `BriefResponse`
- `ResponseReview`
- `Report`
- `RewardLedger`
- `UserTrustProfile`

### 2.2 응답 품질 검수는 비동기 파이프라인으로 분리해야 한다

제품 기획서 133-145행은 AI 필터링, 복붙/주제 이탈/근거 부족 필터, 사용자 신뢰 점수, 보상 차등을 MVP 범위로 둔다.

이 로직을 응답 제출 API 안에서 즉시 처리하면 다음 문제가 생긴다.

- AI 응답 지연으로 사용자가 제출 화면에서 오래 기다린다.
- AI 장애가 전체 응답 제출 장애로 번진다.
- 품질 판정 기준을 바꿨을 때 재검수가 어렵다.
- 보상 지급이 잘못 확정될 수 있다.

권장 구조:

```text
사용자 응답 제출
  -> BriefResponse 저장(status = submitted)
  -> ReviewJob 큐 등록
  -> AI/룰 기반 검수 실행
  -> ResponseReview 저장
  -> BriefResponse status = approved/rejected/needs_manual_review
  -> RewardLedger pending/confirmed 기록
  -> Report 집계 대상에 반영
```

### 2.3 리포트는 원본 응답과 분리된 스냅샷이어야 한다

제품 기획서 171-189행은 AE용 리포트가 제안서나 클라이언트 보고서에 바로 붙일 수 있어야 한다고 정의한다.

리포트는 매번 실시간 쿼리로 렌더링하지 말고, 특정 시점의 승인 응답과 요약 결과를 스냅샷으로 저장해야 한다.

이유:

- 응답자가 이후 탈퇴하거나 응답 상태가 바뀌어도 고객에게 전달한 리포트가 변하면 안 된다.
- AI 요약 결과를 재현 가능하게 보관해야 한다.
- 리포트 결제/전달 이후 감사 추적이 가능해야 한다.

권장 모델:

```text
Report
  id
  opinion_brief_id
  status: draft | generating | ready | delivered | archived
  generated_at
  approved_response_count
  excluded_response_count
  audience_snapshot_json
  methodology_note
  summary_json
  risk_signals_json
  representative_quotes_json
  source_response_ids
```

### 2.4 보상은 포인트 잔액 직접 수정이 아니라 원장 방식이어야 한다

제품 기획서 191-208행은 리포트 판매금 기반 보상과 광고 수익 보너스를 함께 언급한다.

보상은 단순히 `user.points += 1000`처럼 처리하면 안 된다. 품질 검수, 보너스, 환수, 중복 제출, 광고 보너스, 상품권 교환이 모두 엮이기 때문에 원장 방식이 필요하다.

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

## 3. 주요 발견 사항

### P1. 응답 품질 시스템의 판정 기준이 아직 데이터 구조로 내려오지 않았다

근거: 제품 기획서 137-143행은 AI 필터링, 신뢰 점수, 보상 차등을 요구하지만, 어떤 입력값으로 어떤 판정 결과를 저장할지 아직 정의하지 않는다.

Confidence: 8/10

리스크:

- AI가 응답을 제외했다는 사실만 남고, 왜 제외했는지 설명할 수 없다.
- 고객이 리포트 신뢰도를 물었을 때 근거를 보여주기 어렵다.
- 보상 이의제기나 악용 대응이 어렵다.

권장:

`ResponseReview`를 별도 모델로 만들고, 최소한 아래 필드를 둔다.

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

### P1. 응답자 배정/선착순/마감 조건의 동시성 설계가 필요하다

근거: 제품 기획서 126-131행은 무작위 선정 알림, 선착순 참여, 포인트 보상을 참여 유도 방식으로 둔다.

Confidence: 8/10

리스크:

- 100명 제한인데 동시에 130명이 제출할 수 있다.
- 선착순 마감 직전 중복 참여가 생길 수 있다.
- 응답 제출은 성공했는데 보상 대상에서 제외되는 사용자 경험이 생길 수 있다.

권장:

`BriefParticipantSlot` 또는 `BriefInvitation` 모델을 두고, 응답 권한과 슬롯 점유를 분리한다.

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

응답 제출은 슬롯이 `reserved` 상태일 때만 허용한다. 승인 응답 100개를 목표로 하되, 실제 제출 슬롯은 예상 탈락률을 감안해 120-150개까지 운영할 수 있게 설계한다.

### P1. 개인정보와 민감 프로파일 수집 범위를 먼저 제한해야 한다

근거: 제품 기획서 151-160행은 성별, 연령대, 지역, 직업군, 관심사/소비 카테고리 등 응답자 구성 라벨을 요구한다.

Confidence: 8/10

리스크:

- 표본 신뢰 라벨을 만들기 위해 과도한 개인정보를 수집할 수 있다.
- 정치/사회 이슈로 확장할 경우 민감 정보와 의견 데이터가 결합된다.
- B2B 고객에게 제공되는 리포트에 개인 식별 가능성이 남을 수 있다.

권장:

MVP에서는 응답자 원본 프로필과 리포트 제공용 집계 라벨을 분리한다.

- 개인 단위 데이터는 내부 저장소에만 보관한다.
- 리포트에는 집계된 분포와 익명 원문만 제공한다.
- 원문 응답은 식별 가능 표현을 마스킹한다.
- 정치/사회 이슈 템플릿은 MVP에서 비활성화한다.

### P2. 리포트 생성은 사람이 수정할 수 있는 단계가 필요하다

근거: 제품 기획서 171-189행은 카피 수정 제안, 위험 표현, 대표 원문 응답까지 포함한 클라이언트용 리포트를 요구한다.

Confidence: 7/10

리스크:

- AI 요약이 과장되거나 원문과 다른 결론을 낼 수 있다.
- 광고대행사 고객에게 전달되는 리포트 품질이 매번 흔들릴 수 있다.
- 초기에는 50만 원 가격대에 맞는 리포트 품질을 자동화만으로 보장하기 어렵다.

권장:

MVP 리포트 상태에 `draft`, `review_required`, `ready`, `delivered`를 둔다. 초기에는 관리자 검수 후 전달하고, 반복 패턴이 쌓인 뒤 자동화를 늘린다.

### P2. 신뢰 점수는 실시간 점수가 아니라 버전 있는 산출물이어야 한다

근거: 제품 기획서 141-143행은 사용자 신뢰 점수와 리포트 가중치를 언급한다.

Confidence: 7/10

리스크:

- 신뢰 점수 계산식이 바뀌면 과거 리포트의 결과가 달라질 수 있다.
- 사용자가 점수 하락 이유를 물었을 때 설명하기 어렵다.
- 악용 방지 로직이 비즈니스 지표와 섞인다.

권장:

`UserTrustProfile`에는 현재 점수를 두되, 리포트 반영 시점에는 `trust_score_snapshot`을 응답/리포트에 복사해 보관한다.

## 4. 권장 아키텍처

### 4.1 시스템 구성

```text
+-------------------+       +--------------------+
| Requester Web App |       | Participant Web App |
| AE / planner      |       | public respondent   |
+---------+---------+       +----------+---------+
          |                            |
          v                            v
+------------------------------------------------+
|                 API Backend                    |
| Auth, Briefs, Responses, Rewards, Reports      |
+---------+------------------+-------------------+
          |                  |
          v                  v
+------------------+   +-------------------------+
| Relational DB    |   | Background Job Queue    |
| Postgres         |   | review/report/reward    |
+------------------+   +-----------+-------------+
                                   |
                                   v
                       +-------------------------+
                       | AI Review/Summary Layer |
                       | quality + report draft  |
                       +-----------+-------------+
                                   |
                                   v
                       +-------------------------+
                       | Admin Review Console    |
                       | approve report delivery |
                       +-------------------------+
```

### 4.2 핵심 상태 흐름

```text
OpinionBrief
  draft
    -> open
    -> collecting
    -> reviewing
    -> report_generating
    -> ready
    -> delivered
    -> archived

BriefResponse
  submitted
    -> reviewing
    -> approved
    -> rejected
    -> needs_manual_review

RewardLedger
  pending
    -> confirmed
    -> paid_out
    -> cancelled
```

### 4.3 핵심 데이터 모델

```text
User
  id
  role: requester | participant | admin
  email/phone
  created_at

ParticipantProfile
  user_id
  gender_bucket
  age_bucket
  region_bucket
  job_bucket
  interest_tags
  consent_version

OpinionBrief
  id
  requester_id
  template_id
  title
  prompt
  decision_axes_json
  target_rules_json
  required_approved_count
  max_slots
  deadline_at
  status

BriefParticipantSlot
  id
  opinion_brief_id
  user_id
  source
  status
  reserved_at
  expires_at

BriefResponse
  id
  opinion_brief_id
  participant_slot_id
  user_id
  choice
  reason_text
  status
  trust_score_snapshot
  submitted_at

ResponseReview
  id
  response_id
  decision
  quality_score
  reason_codes_json
  reviewer_type
  model_name
  prompt_version
  reviewed_at

Report
  id
  opinion_brief_id
  status
  summary_json
  audience_snapshot_json
  representative_quotes_json
  methodology_note
  generated_at
  delivered_at

RewardLedger
  id
  user_id
  response_id
  type
  status
  amount
  reason
  created_at
```

## 5. API 및 백엔드 경계

MVP API는 세 사용자군을 분리해서 설계한다.

### Requester API

```text
POST   /briefs
GET    /briefs
GET    /briefs/:id
POST   /briefs/:id/open
GET    /briefs/:id/report
POST   /briefs/:id/report/deliver
```

### Participant API

```text
GET    /available-briefs
POST   /briefs/:id/reserve-slot
POST   /briefs/:id/responses
GET    /me/rewards
GET    /me/trust-profile
```

### Admin API

```text
GET    /admin/reviews/pending
POST   /admin/responses/:id/review
POST   /admin/reports/:id/approve
POST   /admin/rewards/:id/adjust
```

관리자 API는 MVP에서 중요하다. 초기에는 리포트 품질과 응답 품질을 완전 자동화하지 말고, 사람이 개입할 수 있는 안전장치를 둬야 한다.

## 6. AI/LLM 통합 설계

AI는 최소 3가지 역할로 분리한다.

1. 응답 품질 검수
2. 응답 클러스터링 및 주요 근거 추출
3. 리포트 초안 생성

각 역할은 프롬프트와 평가 기준이 다르므로 하나의 거대한 AI 호출로 합치지 않는다.

권장 출력 형식:

```json
{
  "decision": "approved",
  "quality_score": 82,
  "reason_codes": [],
  "reasoning_summary": "질문과 직접 관련된 구매 저항 이유를 구체적으로 설명함",
  "safety_flags": []
}
```

필수 저장 항목:

- 사용한 모델명
- 프롬프트 버전
- 입력 텍스트 해시
- 출력 JSON
- 실패/재시도 횟수

이 정보가 있어야 나중에 품질 기준을 바꾸거나 고객 이의제기에 대응할 수 있다.

## 7. 테스트 전략

현재 저장소에는 구현 코드와 테스트 프레임워크가 없다. 따라서 이 보고서는 테스트 요구사항을 선행 정의한다.

### 7.1 테스트 커버리지 다이어그램

```text
CODE PATHS                                      USER FLOWS
[GAP] OpinionBrief 생성                         [GAP] AE가 Brief 생성 후 공개
  |-- 유효한 템플릿                              |-- [E2E] 필수 입력값 검증
  |-- 타깃 조건 누락                             |-- [E2E] 결제 전/후 공개 제한
  |-- 마감 시간이 과거                           |

[GAP] 참여 슬롯 예약                            [GAP] 참여자가 알림/선착순으로 응답
  |-- 슬롯 가능                                  |-- [E2E] 슬롯 예약 후 제출 성공
  |-- 슬롯 마감                                  |-- [E2E] 만료된 슬롯 제출 실패
  |-- 중복 예약                                  |-- [E2E] 두 탭 동시 제출 방지

[GAP] 응답 제출                                 [GAP] 근거 의견 제출
  |-- 찬반 선택                                  |-- [E2E] 빈 근거 거부
  |-- 근거 1-3문장                               |-- [E2E] 너무 긴 응답 처리
  |-- 금칙어/개인정보 포함                       |-- [E2E] 명확한 오류 메시지

[GAP] AI 품질 검수                              [GAP] 관리자 검수
  |-- approved                                   |-- [E2E] needs_manual_review 처리
  |-- rejected                                   |-- [EVAL] 무성의/복붙/주제이탈 판정
  |-- needs_manual_review                        |-- [EVAL] 정상 응답 오탐 방지
  |-- AI timeout                                 |

[GAP] 리포트 생성                               [GAP] AE가 리포트 확인
  |-- 승인 응답 100개 충족                       |-- [E2E] 리포트 ready 상태 확인
  |-- 승인 응답 부족                             |-- [E2E] 샘플 수 부족 주석 표시
  |-- 원문 마스킹                                |-- [E2E] 익명 원문만 표시

[GAP] 보상 확정                                 [GAP] 참여자가 포인트 확인
  |-- 기본 보상 pending -> confirmed             |-- [E2E] 승인 후 보상 반영
  |-- rejected -> cancelled                      |-- [E2E] 탈락 사유 표시
  |-- quality_bonus                              |-- [E2E] 중복 지급 방지
```

### 7.2 필수 테스트 목록

Unit 테스트:

- Opinion Brief 입력값 검증
- 타깃 조건 매칭 로직
- 참여 슬롯 예약 가능 여부
- 응답 품질 판정 결과 파서
- 신뢰 점수 계산
- 보상 원장 상태 전이
- 리포트 집계 계산

Integration 테스트:

- Brief 생성 -> 공개 -> 슬롯 예약 -> 응답 제출 -> AI 검수 -> 보상 pending
- 승인 응답 100개 도달 시 리포트 생성 시작
- AI 검수 실패 시 재시도 후 관리자 검수로 전환
- 리포트 생성 시 응답자 구성 스냅샷 고정

E2E 테스트:

- AE가 Brief를 만들고 리포트 ready 상태까지 확인하는 흐름
- 참여자가 선착순 Brief에 참여하고 보상을 확인하는 흐름
- 슬롯 만료, 중복 제출, 마감 후 제출 실패 흐름
- 관리자 검수 후 리포트 승인 흐름

Eval 테스트:

- 무성의 응답 필터링
- 복붙 응답 필터링
- 주제 이탈 응답 필터링
- 정상 응답 오탐률 측정
- 논란 리스크 요약이 원문 근거를 과장하지 않는지 평가

## 8. 성능 및 확장성 검토

### 8.1 병목 후보

1. AI 품질 검수
   - 응답 100개를 모두 동기 처리하면 느리다.
   - 큐 기반 비동기 처리와 재시도가 필요하다.

2. 선착순 슬롯 예약
   - 동시 요청이 몰리는 구간이다.
   - DB 트랜잭션 또는 원자적 카운터가 필요하다.

3. 리포트 생성
   - 승인 응답 집계, 원문 마스킹, AI 요약이 섞인다.
   - 리포트 생성 작업은 별도 job으로 실행한다.

4. 사용자 신뢰 점수
   - 매번 실시간 재계산하지 말고 이벤트 기반으로 갱신한다.

### 8.2 권장 성능 목표

MVP 목표:

- Brief 생성 API: p95 500ms 이하
- 슬롯 예약 API: p95 300ms 이하
- 응답 제출 API: p95 500ms 이하, AI 검수는 비동기
- AI 품질 검수: 응답 100개 기준 10분 이내 완료
- 리포트 생성: 승인 응답 충족 후 15분 이내 초안 생성
- 전체 납기: 24시간 이내

## 9. 보안 및 개인정보 검토

### 9.1 인증/권한

역할을 최소 3개로 분리한다.

- 요청자: 자신의 Brief와 리포트만 접근
- 참여자: 참여 가능한 Brief와 자신의 응답/보상만 접근
- 관리자: 검수/리포트/보상 조정 접근

주의할 점:

- `brief_id`를 바꿔 다른 고객의 리포트를 볼 수 없어야 한다.
- 참여자는 다른 참여자의 원문 응답을 볼 수 없어야 한다.
- 관리자 조정 이력은 감사 로그로 남겨야 한다.

### 9.2 개인정보

MVP에서 수집 가능한 프로필은 집계 목적에 필요한 최소 범위로 제한한다.

권장:

- 생년월일 대신 연령대 저장
- 상세 주소 대신 지역 버킷 저장
- 직업명 자유 입력 대신 직업군 선택
- 원문 응답의 이름, 전화번호, 회사명 등은 리포트 생성 전 마스킹
- 동의 버전과 동의 시점을 저장

### 9.3 AI 안전성

AI가 점수와 보상에 영향을 주기 때문에 판정 결과는 설명 가능해야 한다.

권장:

- AI 판정 reason code 저장
- 모델명과 프롬프트 버전 저장
- 수동 재검수 경로 제공
- 보상 확정 전 검수 결과 고정

## 10. 구현 순서

### Phase 0: 샘플 리포트 검증

코드 구현 전, 기획서 315-323행에 따라 AE용 샘플 리포트를 먼저 만든다.

산출물:

- 1페이지 샘플 리포트
- 인터뷰 질문지
- 가격/신뢰/사용처 피드백 기록

### Phase 1: 데이터 모델과 관리자 중심 MVP

목표:

- 실제 자동화보다 데이터 구조와 운영 흐름을 먼저 검증한다.

구현:

- 사용자/역할
- OpinionBrief
- BriefResponse
- ResponseReview
- Report
- RewardLedger
- 관리자 검수 화면

### Phase 2: 참여자 플로우

구현:

- 참여 가능 Brief 목록
- 슬롯 예약
- 응답 제출
- 보상 상태 확인
- 중복/만료/마감 처리

### Phase 3: AI 검수 및 리포트 초안

구현:

- AI 품질 검수 job
- AI 요약 job
- prompt version 관리
- eval 테스트
- 관리자 리포트 승인

### Phase 4: 결제/정산/광고 보너스

구현:

- B2B 리포트 결제
- 보상 확정
- 상품권/교환권 정산
- 광고 보너스는 이벤트성 기능으로 별도 추가

## 11. NOT in scope

MVP 기술 범위에서 제외한다.

- 전국 대표 표본을 보장하는 통계 엔진
- 정치/여론조사 템플릿
- 완전 자동 리포트 전달
- 자동 광고 수익 분배
- 대규모 패널 앱
- 공개 커뮤니티 토론
- 복잡한 추천/랭킹 시스템
- 실시간 대시보드형 분석 도구

## 12. 구현 작업 목록

- [ ] T1 (P1) 도메인 모델 정의: OpinionBrief, BriefResponse, ResponseReview, Report, RewardLedger
  - 근거: Opinion Brief를 핵심 단위로 유지해야 확장성과 B2B 리포트 품질을 함께 잡을 수 있다.
  - 검증: 모델 단위 테스트와 상태 전이 테스트

- [ ] T2 (P1) 응답 품질 검수 파이프라인 설계
  - 근거: AI 필터링과 신뢰 점수가 MVP 핵심 약속이다.
  - 검증: approved/rejected/needs_manual_review 테스트, AI 실패 재시도 테스트

- [ ] T3 (P1) 참여 슬롯 예약과 동시성 제어 구현
  - 근거: 선착순/무작위 선정 참여에서 중복 제출과 초과 모집이 발생할 수 있다.
  - 검증: 동시 요청 테스트, 만료 슬롯 테스트, 중복 제출 테스트

- [ ] T4 (P1) 리포트 스냅샷 생성 구조 구현
  - 근거: 고객에게 전달한 리포트는 이후 데이터 변경에 영향을 받으면 안 된다.
  - 검증: 리포트 생성 후 원본 응답 상태 변경 시 리포트 불변성 테스트

- [ ] T5 (P1) 보상 원장 구현
  - 근거: 포인트 직접 수정은 중복 지급, 환수, 보너스 처리에 취약하다.
  - 검증: pending/confirmed/cancelled/paid_out 상태 전이 테스트

- [ ] T6 (P2) 개인정보 최소 수집 및 리포트 익명화
  - 근거: 표본 신뢰 라벨과 개인정보 보호를 동시에 만족해야 한다.
  - 검증: 원문 응답 마스킹 테스트, 리포트 집계 라벨 테스트

- [ ] T7 (P2) 관리자 검수 콘솔
  - 근거: 초기 리포트 품질을 완전 자동화만으로 보장하기 어렵다.
  - 검증: 관리자 승인/반려/수정 흐름 E2E 테스트

## 13. 엔지니어링 결론

현재 기획은 구현할 가치가 있지만, 곧바로 일반 투표 사이트를 만들면 실패할 가능성이 높다. 기술적으로는 아래 순서가 가장 안전하다.

1. 샘플 리포트로 구매 의사를 검증한다.
2. Opinion Brief 중심 데이터 모델을 먼저 고정한다.
3. 응답 품질 검수와 보상 원장을 MVP의 핵심으로 둔다.
4. 리포트는 스냅샷으로 생성하고 관리자 검수를 거친다.
5. 광고 수익/정치 여론/공개 커뮤니티는 후순위로 미룬다.

최종 권장 아키텍처는 **Postgres 기반의 일반 웹 애플리케이션 + 비동기 job queue + AI 검수/요약 레이어 + 관리자 검수 콘솔**이다. 처음부터 복잡한 데이터 플랫폼이나 실시간 분석 인프라를 만들 필요는 없다.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | complete | Opinion Brief 핵심 단위, 품질 시스템, 표본 신뢰 라벨, 혼합 보상 모델 결정 |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | issues_open | P1 5개, P2 2개 기술 과제 도출 |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | not_run | UI 설계 전 단계 |

**VERDICT:** Eng Review는 구현 전 필수 아키텍처 과제를 식별했다. 구현은 가능하지만 T1-T5를 MVP 설계에 반영해야 한다.

**UNRESOLVED DECISIONS:**
- 실제 구현 스택은 아직 미정이다.
- AI 검수 모델과 eval 기준은 아직 미정이다.
- 결제/상품권 정산 사업자와 운영 방식은 아직 미정이다.
