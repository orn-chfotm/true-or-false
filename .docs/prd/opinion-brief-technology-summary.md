# Opinion Brief 사용 기술 정리

## 1. 목적

이 문서는 `docs/opinion-brief-product-plan.md`의 제품 범위를 기준으로, Opinion Brief MVP에 필요한 기술을 기능별로 분리해 정리한 문서다.

문서에 특정 프레임워크나 클라우드 벤더가 명시되어 있지는 않으므로, 아래 내용은 제품 요구사항에서 도출한 구현 기술 후보와 시스템 구성 요소다.

## 2. 기능별 사용 기술

### 2.1 Opinion Brief 생성

사용자가 광고 카피 검증 리포트와 같은 구조화된 의견 요청서를 생성하는 기능이다.

필요 기술:

- 웹 프론트엔드: Brief 생성 폼, 템플릿 선택, 질문/판단 축/타깃 조건/마감 시간 입력 UI
- 백엔드 API: Brief 생성, 수정, 조회, 상태 관리
- 데이터베이스: Brief, 질문, 판단 축, 타깃 조건, 마감 시간, 필요 응답 수 저장
- 템플릿 시스템: 광고 카피 검증 리포트 등 사전 정의된 Brief 템플릿 관리
- 권한 관리: 의뢰자 계정과 Brief 소유권 관리

주요 데이터:

- Brief
- BriefTemplate
- Question
- TargetCondition
- ReportType
- BriefStatus

### 2.2 참여형 투표 및 의견 제출

참여자가 Brief에 대해 찬성/반대 또는 A/B 선택을 하고, 근거 의견을 제출하는 기능이다.

필요 기술:

- 웹 또는 모바일 웹 UI: 참여자용 응답 화면
- 응답 제출 API: 선택지, 근거 의견, 추가 의견 저장
- 입력 검증: 필수 근거 의견, 최소/최대 문장 수, 중복 제출 제한
- 참여자 식별: 로그인, 소셜 로그인, 휴대폰 인증 또는 익명 식별 토큰
- 참여 제한 로직: 선착순 참여, 타깃 조건 매칭, Brief별 1회 응답 제한
- 알림 시스템: 무작위 선정 알림, 참여 요청 알림

주요 데이터:

- User
- ParticipantProfile
- Response
- ResponseChoice
- ResponseText
- ParticipationLog

### 2.3 응답 품질 시스템

무성의 응답, 복붙, 주제 이탈, 근거 부족, 논리 없는 응답을 걸러내는 MVP 핵심 기능이다.

필요 기술:

- AI 응답 평가: LLM 기반 품질 판정, 주제 적합성 평가, 근거 충분성 평가
- 텍스트 유사도 검사: 복붙, 중복 응답, 반복 문장 탐지
- 규칙 기반 필터: 최소 글자 수, 금칙어, 비정상 반복 패턴, 선택지와 의견 불일치 검사
- 심사 상태 관리: 대기, 승인, 제외, 수동 검토 상태
- 수동 검토 도구: 운영자가 AI 판정을 확인하고 수정할 수 있는 관리자 화면
- 평가 로그 저장: AI 판단 근거, 점수, 제외 사유 기록

주요 데이터:

- QualityReview
- QualityScore
- RejectionReason
- AiEvaluationLog
- ManualReviewLog

### 2.4 사용자 신뢰 점수

사용자의 승인율, 신고 이력, 응답 품질을 기반으로 신뢰 점수를 계산하는 기능이다.

필요 기술:

- 신뢰 점수 계산 로직: 승인율, 제외율, 신고 이력, 우수 응답 이력 반영
- 배치 작업 또는 이벤트 처리: 응답 승인/제외 이후 사용자 점수 갱신
- 가중치 적용: 신뢰 점수가 낮은 응답은 리포트에서 제외하거나 낮은 가중치로 반영
- 신고 시스템: 저품질 응답 또는 부적절 응답 신고

주요 데이터:

- UserTrustScore
- UserQualityHistory
- ReportedResponse
- TrustScoreEvent

### 2.5 표본 신뢰 라벨

리포트에 응답자 구성과 결과의 해석 범위를 명시하는 기능이다.

필요 기술:

- 프로필 데이터 수집: 성별, 연령대, 지역, 직업군, 관심사 또는 소비 카테고리
- 집계 로직: 성별 분포, 연령대 분포, 지역 분포, 타깃 조건 충족률 계산
- 응답 상태 집계: 승인된 응답 수, 제외된 응답 수 계산
- 리포트 주석 템플릿: 대표 표본 조사가 아니라 빠른 반응 스냅샷임을 명시
- 개인정보 보호: 리포트에는 개인 식별 정보가 노출되지 않도록 익명화

주요 데이터:

- DemographicSnapshot
- TargetMatchRate
- ApprovedResponseCount
- ExcludedResponseCount
- MethodologyNote

### 2.6 AE용 리포트 템플릿

광고대행사 AE가 클라이언트 제안서나 보고서에 바로 활용할 수 있는 리포트를 생성하는 기능이다.

필요 기술:

- 리포트 생성 엔진: 핵심 요약, 점수, 비율, 주요 근거, 대표 원문 응답 구성
- AI 요약: 긍정/부정 반응의 주요 근거 요약, 위험 표현 탐지, 카피 수정 제안 생성
- 통계 집계: 찬성/반대 비율, A/B 선택 비율, 설득력 점수, 논란 리스크 점수 산출
- 원문 인용 관리: 대표 응답 선별, 개인정보 제거, 품질 통과 응답만 사용
- 문서 출력: 웹 리포트, PDF, 공유 링크, 복사 가능한 제안서용 요약

주요 데이터:

- Report
- ReportSection
- ReportMetric
- RepresentativeQuote
- CopySuggestion
- RiskSignal

### 2.7 보상 경제

참여자에게 기본 포인트와 우수 근거 보너스를 지급하고, 리포트 판매금 기반의 단위 경제를 관리하는 기능이다.

필요 기술:

- 포인트 지갑: 사용자별 포인트 잔액, 적립, 차감, 정산 이력 관리
- 보상 규칙 엔진: 기본 참여 보상, 승인 응답 보상, 우수 근거 보너스 지급
- 결제 시스템: B2B 리포트 구매 결제, 영수증, 환불, 세금계산서 또는 결제 내역
- 정산 관리: 리포트 판매가, 총 사용자 보상비, AI 비용, 수수료, 마진 추적
- 부정 참여 방지: 다계정, 반복 응답, 보상 악용 탐지

주요 데이터:

- Payment
- PointWallet
- PointTransaction
- RewardRule
- BonusReward
- UnitEconomics

### 2.8 알림 및 마감 관리

24시간 안에 필요한 승인 응답 수를 모으기 위한 운영 기능이다.

필요 기술:

- 작업 스케줄러: Brief 마감 시간 관리, 리마인드 발송, 자동 종료
- 알림 채널: 이메일, 문자, 카카오 알림톡, 푸시 또는 웹 알림
- 참여자 매칭: 타깃 조건에 맞는 참여자 선정
- 진행률 모니터링: 목표 응답 수 대비 승인 응답 수 추적
- 부족 응답 대응: 참여자 추가 모집, 알림 재발송

주요 데이터:

- Notification
- NotificationDeliveryLog
- BriefDeadline
- RecruitmentBatch
- ResponseProgress

### 2.9 관리자 및 운영 도구

MVP 운영자가 품질 검수, 리포트 확인, 보상 지급, 고객 요청을 관리하기 위한 기능이다.

필요 기술:

- 관리자 대시보드: Brief 현황, 응답 현황, 품질 검수 현황, 보상 현황 확인
- 수동 검수 UI: AI가 애매하다고 판단한 응답 검토
- 리포트 편집 UI: 최종 리포트 문구, 대표 응답, 카피 제안 수정
- 고객 관리: 의뢰자, 결제 상태, 리포트 전달 상태 관리
- 감사 로그: 운영자 수정, 승인, 보상 지급 이력 기록

주요 데이터:

- AdminUser
- AdminAuditLog
- ManualOverride
- CustomerAccount
- DeliveryStatus

## 3. 공통 시스템 기술

### 3.1 애플리케이션 구조

권장 구성:

- 프론트엔드: Next.js 기반 의뢰자용 웹, 참여자용 웹, 관리자 웹
- UI 구현: React 기반 컴포넌트
- 백엔드: Java/Spring Boot 기반 REST API
- 데이터베이스: 관계형 데이터베이스 중심 설계
- 비동기 작업: AI 평가, 리포트 생성, 알림 발송, 점수 갱신
- 파일 저장소: PDF 리포트, 첨부 자료, 내보내기 파일 저장

### 3.2 AI/LLM 기술

주요 사용처:

- 응답 품질 평가
- 주제 이탈 판단
- 근거 충분성 판단
- 긍정/부정 근거 요약
- 논란 리스크 신호 추출
- 카피 수정 제안 생성
- 리포트 초안 생성

필요한 보조 기술:

- 프롬프트 템플릿 관리
- AI 평가 결과 로그
- 재평가 기능
- 비용 추적
- 사람이 검토할 수 있는 판정 근거 저장

### 3.3 데이터 및 분석 기술

주요 사용처:

- 응답 분포 집계
- 승인/제외 응답 수 집계
- 타깃 조건 충족률 계산
- 설득력 점수 및 논란 리스크 점수 산출
- 사용자 신뢰 점수 산출
- 리포트 단위 경제 분석

필요 기술:

- SQL 기반 집계
- 이벤트 로그
- 배치 처리
- 대시보드
- 리포트용 스냅샷 테이블

### 3.4 보안 및 개인정보 보호

필요 기술:

- 사용자 인증 및 권한 관리
- 개인정보 암호화 또는 접근 제한
- 리포트 내 개인 식별 정보 제거
- 관리자 접근 로그
- 결제 정보 보호
- 약관, 개인정보 처리방침, 리워드 정책 관리

### 3.5 인프라 및 운영

필요 기술:

- 클라우드 호스팅
- 데이터베이스 백업
- 큐/워커 기반 비동기 처리
- 모니터링 및 에러 추적
- 배포 자동화
- AI 비용 및 결제 비용 모니터링

## 4. MVP 우선순위별 기술 구분

### 4.1 MVP 필수

- Brief 생성 및 템플릿 관리
- 참여자 응답 제출
- AI 기반 응답 품질 필터링
- 사용자 신뢰 점수의 최소 버전
- 응답자 구성 및 표본 신뢰 라벨
- AE용 리포트 생성
- 포인트 보상 기록
- 관리자 검수 화면
- 24시간 마감 및 진행률 관리

### 4.2 MVP 이후 고도화

- 고도화된 통계 가중치
- 대규모 패널 앱 인프라
- 완전 자동 광고 수익 공유
- 복잡한 커뮤니티 토론 기능
- 정치/여론조사용 대표 표본 설계
- 고급 부정 참여 탐지
- 리포트 템플릿 마켓 또는 무제한 템플릿 생성

## 5. 종합 사용 기술

Opinion Brief MVP에 필요한 종합 기술은 아래와 같다.

- 프론트엔드 기술: 의뢰자용 Brief 생성 UI, 참여자용 응답 UI, 관리자 검수 UI, 리포트 조회 UI
- 백엔드 API 기술: Brief 관리, 응답 제출, 품질 검수, 리포트 생성, 보상 지급, 결제 관리
- 관계형 데이터베이스: Brief, 사용자, 응답, 품질 평가, 신뢰 점수, 리포트, 결제, 보상 데이터 저장
- AI/LLM 기술: 응답 품질 필터링, 근거 요약, 논란 리스크 탐지, 카피 수정 제안, 리포트 초안 생성
- 비동기 작업 기술: AI 평가, 알림 발송, 마감 처리, 신뢰 점수 갱신, 리포트 생성
- 알림 기술: 참여자 모집, 무작위 선정 알림, 마감 리마인드
- 결제 및 포인트 기술: B2B 리포트 결제, 참여자 보상, 우수 응답 보너스, 정산 관리
- 데이터 분석 기술: 응답 분포, 타깃 조건 충족률, 승인/제외 비율, 설득력 점수, 논란 리스크 점수 산출
- 문서 출력 기술: 웹 리포트, PDF 리포트, 공유 링크, 제안서용 요약 내보내기
- 보안 및 개인정보 보호 기술: 인증, 권한, 개인정보 보호, 익명화, 감사 로그
- 운영 기술: 관리자 대시보드, 수동 검수, 모니터링, 비용 추적, 배포 자동화

## 6. 권장 초기 기술 스택 예시

구체적인 구현 스택은 팀 역량과 기존 코드베이스에 맞춰 선택해야 한다. 백엔드 기준 언어를 Java로 정한다면, MVP 기준으로는 복잡한 마이크로서비스보다 Spring Boot 기반 단일 백엔드와 비동기 워커 구성이 적합하다.

### 6.1 기본 선택

- 프론트엔드 프레임워크: Next.js
- UI 라이브러리: React
- 프론트엔드 언어: TypeScript
- 스타일링: Tailwind CSS 또는 CSS Modules
- 서버 상태 관리: TanStack Query
- 클라이언트 상태 관리: Zustand 또는 React Context
- 폼/검증: React Hook Form, Zod
- 백엔드 언어: Java 21
- 백엔드 프레임워크: Spring Boot
- API 방식: REST API 우선
- 데이터베이스: PostgreSQL
- ORM 및 쿼리: Spring Data JPA, Hibernate, QueryDSL
- 데이터베이스 마이그레이션: Flyway
- 인증/인가: Spring Security, JWT 또는 세션 기반 인증
- 캐시/락/진행률 관리: Redis
- 비동기 처리: Spring Events, `@Async`, Spring Scheduler
- 배치 처리: Spring Batch
- AI 연동: Spring WebClient 기반 LLM API 연동
- 파일 저장소: S3 호환 오브젝트 스토리지
- 결제: 국내 PG 연동 우선, 필요 시 Stripe 검토
- 알림: 이메일, SMS, 카카오 알림톡, 웹 푸시 중 MVP 채널 우선 선택
- 리포트 출력: HTML 리포트 우선, 이후 PDF 생성 추가
- 테스트: JUnit 5, Spring Boot Test, Testcontainers, MockMvc 또는 REST Assured
- 모니터링: Spring Actuator, 애플리케이션 로그, 에러 추적, AI 비용 추적
- 배포: Docker 기반 배포

### 6.2 Java/Spring 기준 권장 조합

- Frontend Framework: Next.js
- UI: React
- Frontend Language: TypeScript
- Styling: Tailwind CSS 또는 CSS Modules
- State/Form: TanStack Query, Zustand, React Hook Form, Zod
- Backend: Java 21, Spring Boot
- Database: PostgreSQL
- ORM/Query: Spring Data JPA, QueryDSL
- Migration: Flyway
- Auth: Spring Security
- Cache/Queue: Redis
- Batch/Worker: Spring Batch, Spring Scheduler, `@Async`
- AI: Spring WebClient 기반 LLM API 연동 모듈
- Storage: S3 호환 오브젝트 스토리지
- Test: JUnit 5, Spring Boot Test, Testcontainers
- Infra: Docker 기반 배포, 이후 클라우드 환경에 맞춰 확장

### 6.3 기능별 핵심 매핑

- Opinion Brief 생성: Spring Boot API, PostgreSQL, JPA, QueryDSL
- 참여자 응답 제출: Spring Boot API, Spring Security, PostgreSQL, Redis
- 응답 품질 검수: LLM API, Spring WebClient, 비동기 처리, AI 평가 로그
- 사용자 신뢰 점수: PostgreSQL, Spring Batch, QueryDSL
- 표본 신뢰 라벨: SQL 집계, QueryDSL, 리포트 스냅샷 테이블
- AE용 리포트 생성: LLM API, HTML 리포트, PDF 생성, S3 저장소
- 보상 경제: PostgreSQL, 포인트 트랜잭션 테이블, 결제 PG 연동
- 알림/마감 관리: Spring Scheduler, 비동기 알림 서비스, Redis
- 관리자 도구: Next.js, React, Spring Boot Admin API, QueryDSL

### 6.4 MVP 이후 검토

- RabbitMQ 또는 Kafka: 작업량이 늘어났을 때 비동기 처리 안정화
- 고급 BI/분석 도구: 리포트 분석과 운영 지표 고도화
- 전문 PDF 렌더링 서버: PDF 품질 요구가 높아졌을 때 도입
- 별도 관리자 백오피스 프레임워크: 운영 기능이 커졌을 때 분리
- 고도화된 부정 참여 탐지 시스템: 다계정, 반복 응답, 보상 악용이 늘어났을 때 도입
