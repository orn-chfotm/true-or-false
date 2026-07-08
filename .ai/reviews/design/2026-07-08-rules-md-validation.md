---
description: ".claude/rules · skills 전체 md 검증 결과 기록. 반영 완료 9건과 사용자 결정 대기 4건을 관리한다."
---

# Review Log — 룰/스킬 md 전체 검증

- 날짜: 2026-07-08
- 작업: `.claude/rules`(31개) + `.claude/skills`(9개) 전체 검증 (import 무결성, 상호참조, 섹션 구성, 내용 교차 검토)
- 작성 역할: PL (검증), 사용자 (승인)
- 검증 결과 요약: import 31/31 정상, 금지 규칙·예시 코드 전 파일 보유, 발견 13건 중 9건 반영 완료, 4건 사용자 결정 대기

---

## 반영 완료 (9건)

- [x] **P1-1** 슬롯 예약 예시 레이스 컨디션 — `backend/05-participation-slot.md`
  - 심각도: error (예시가 자체 금지 규칙 위반)
  - 조치: count→save 예시를 **DB 조건부 UPDATE 카운터**(영향 행 0=마감, 사용자 선택 a)로 교체. 유니크 충돌 시 점유 반환. "유니크=중복만 방지, 총원 초과 못 막음" 금지 규칙 추가. Redis INCR은 트래픽 증가 시 대체로 명시.
  - 상태: resolved

- [x] **P1-2** 하네스 참조 경로 오류 — `backend/spring/02-service.md`, `frontend/02-state-management.md`
  - 심각도: error (참조 불능)
  - 조치: `docs/10-technical/...` → `.ai-prompts/docs/10-technical/...`
  - 상태: resolved

- [x] **P2-4** API 설계 스킬 `/v1` 누락 — `.claude/skills/backend-api-design/SKILL.md`
  - 조치: 전 엔드포인트 `/v1` prefix, requester/participant=`user-api`·admin=`admin-api` 모듈 표기
  - 상태: resolved

- [x] **P2-5** 401/403 핸들러 Map 수동 조립 — `backend/security/02-filter-chain.md`, `backend/exception/01-error-code.md`
  - 조치: `CommonErrorCode.UNAUTHORIZED` 추가. EntryPoint가 **ErrorCode에서 status·message를 가져와 `FailResponse` record 직렬화** (custom Exception의 ErrorCode → status/message 원칙과 동일 소스). "Map 수동 조립 금지" 금지 규칙 추가.
  - 상태: resolved

- [x] **P2-6** 스킬·config의 bare 파일명 참조 (12곳) — skills 5개, `backend/config/01-build-config.md`
  - 조치: `.claude/rules/...` 전체 경로(config는 `../00-module-structure.md`)로 교체. 재검사 미해석 참조 0.
  - 상태: resolved

- [x] **P2-7** 요청자/참여자 역할 매핑 — `backend/security/04-authorization.md`, `backend-api-design` 스킬
  - 결정: **요청자/참여자는 별도 역할이 아니다. 둘 다 `ROLE_USER`**(사용자가 요청자가 될 수 있음, 권한은 계정당 하나). 구분은 소유권·도메인 검증(IDOR 방지, 슬롯 보유 여부).
  - 상태: resolved

- [x] **P3-8** JJWT 숫자 클레임 타입 함정 — `backend/security/03-jwt-provider.md`
  - 조치: `claims.get("userId", Long.class)` → `((Number) claims.get("userId")).longValue()`
  - 상태: resolved

- [x] **P3-11** 검증 에러 응답의 입력 원값 노출 — `backend/exception/01-error-code.md`
  - 결정: `ValidationError`에서 `rejectedValue` 제거. **field(어떤 값이 제약됐는지) + message(검증 메시지)만** 전달. 응답 JSON 예시 추가. "입력 원값 미포함" 금지 규칙 추가.
  - 상태: resolved

- [x] **P3-13** refresh 쿠키 SameSite와 배포 전제 — `backend/security/01-jwt.md`
  - 결정: **FE/BE 별도 서버 배포(cross-origin), BE가 CORS로 FE origin 명시 허용.** SameSite 기준: 같은 등록 도메인 서브도메인이면 `Strict`, 서로 다른 도메인이면 `SameSite=None; Secure` 필수.
  - 상태: resolved

---

## 사용자 결정 대기 (4건, 보류)

재개 시 이 파일을 보고 항목별로 선택지를 답하면 된다. (예: "P2-3 a, P3-9 a, P3-10 b, P3-12 진행")

- [ ] **P2-3** 엔티티 예시 상속 불일치
  - 심각도: improvement
  - 위치: `backend/java/01-dto-response.md`, `backend/jpa/01-association-fetch.md`(상속 없음) vs `backend/jpa/02-base-time-entity.md`(`extends BaseTimeEntity`) vs `backend/jpa/03-soft-delete.md`(`extends BaseEntity`)
  - 내용: 실제 최종 상속 계층은 `BaseTimeEntity ← BaseEntity ← 엔티티`인데, 같은 `OpinionBrief` 예시가 4개 파일에서 제각각. AI가 새 엔티티 생성 시 어느 예시를 따를지 모호 → 감사 필드/soft delete 누락 위험.
  - 선택지:
    - (a) `jpa/03`에 상속 다이어그램 추가 + 나머지 3곳 예시에 `// 예시 간략화 — 실제는 BaseEntity 상속(jpa/03)` 주석 (수정 작음, 추천)
    - (b) 4개 파일 예시를 전부 `extends BaseEntity`로 통일 (가장 명확하나 jpa/02에서 설명 순서 어색)
  - 상태: deferred / 사용자 승인 필요

- [ ] **P3-9** FE refresh 호출의 인터셉터 재진입
  - 심각도: improvement
  - 위치: `frontend/typescript/02-api-client-auth.md` (응답 인터셉터)
  - 내용: refresh를 같은 `client`로 호출 → (1) 만료된 access가 Authorization으로 불필요하게 붙음, (2) refresh 자체가 401이면 인터셉터 재진입으로 refresh가 한 번 더 나감(무한 루프는 아님).
  - 선택지:
    - (a) refresh 전용 bare axios 인스턴스(인터셉터 없음, withCredentials만) — 실무 관례, 추천
    - (b) 응답 인터셉터에서 refresh 경로면 재시도 스킵 — 인스턴스 하나 유지, 경로 문자열 비교 필요
  - 상태: deferred / 사용자 승인 필요

- [ ] **P3-10** admin 레이아웃 가드 예시의 기술 오류
  - 심각도: error (예시 코드가 빌드 불가 패턴)
  - 위치: `frontend/01-app-surfaces.md` (예시)
  - 내용: `app/(admin)/layout.tsx`는 서버 컴포넌트라 `useAuth()` 훅 사용 불가. access token이 클라이언트 메모리에 있어 서버 컴포넌트는 role을 알 수 없음.
  - 선택지:
    - (a) 예시에 `"use client"` 붙여 클라이언트 가드로 명시 — 한 줄 수정, 토큰 구조와 일치. 단점: 클라이언트 로드 후 리다이렉트(깜빡임)
    - (b) Next 미들웨어에서 refresh 쿠키 존재로 1차 가드 + 클라 role 검증 2차 — 견고·UX 좋음. 별도 룰(예: `frontend/06-auth-guard.md`) 신설 필요
  - 상태: deferred / 사용자 승인 필요

- [ ] **P3-12** 보상 원장 예시 "멱등" 주석 불일치
  - 심각도: improvement
  - 위치: `backend/04-reward-ledger.md` (예시)
  - 내용: `save(ledger); // 멱등` 주석과 달리 유니크 충돌 시 `DataIntegrityViolationException`이 발생(500). 검수 job 재시도 시 실제로 밟히는 경로.
  - 제안(단일): 슬롯 예약(05)과 같은 catch 패턴으로 충돌 시 "이미 지급됨" 무시 처리 예시로 교체 — 진행 여부만 결정
  - 상태: deferred / 사용자 승인 필요

---

## 참고

- 검증 자동화: CLAUDE.md import 해석, 룰 내부 상대 참조 해석, 금지 규칙/예시 코드 섹션 유무를 스크립트로 확인함. 재검증 시 같은 방식 사용 가능.
- 관련 원칙(메모리 저장됨): 룰 md에는 금지 규칙 섹션 + 예시 코드 포함.
