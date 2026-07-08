---
name: backend-api-design
description: "Opinion Brief 백엔드 API를 requester/participant/admin 3개 사용자군 경계로 설계·리뷰하는 절차. 새 엔드포인트를 추가하거나 권한 경계를 검토할 때 사용한다."
---

# backend-api-design

Opinion Brief API를 세 사용자군으로 분리해 설계·리뷰하는 절차다.

근거: `.docs/prd/opinion-brief-engineering-review.md` 5, 9.1

## 사용자군 경계

MVP API는 세 사용자군을 분리해서 설계한다. 한 컨트롤러에 역할을 섞지 않는다. 경로에는 `/v1` 버전 prefix를 둔다(`.claude/rules/backend/spring/01-controller.md`).

- Requester (AE/기획자): 자신의 Brief와 리포트만 접근 — `user-api` 모듈
- Participant (참여자): 참여 가능한 Brief와 자신의 응답/보상만 접근 — `user-api` 모듈
- Admin (운영자): 검수/리포트/보상 조정 접근 — `admin-api` 모듈

역할은 계정당 하나다: requester/participant는 별도 역할이 아니라 둘 다 `ROLE_USER`이고(사용자가 요청자가 될 수 있다), 구분은 소유권·도메인 검증으로 한다(`.claude/rules/backend/security/04-authorization.md`).

기준 엔드포인트:

```text
# Requester (user-api, ROLE_USER + 소유권 검증)
POST /v1/briefs
GET  /v1/briefs
GET  /v1/briefs/:id
POST /v1/briefs/:id/open
GET  /v1/briefs/:id/report
POST /v1/briefs/:id/report/deliver

# Participant (user-api, ROLE_USER)
GET  /v1/available-briefs
POST /v1/briefs/:id/reserve-slot      # 05 슬롯 규칙
POST /v1/briefs/:id/responses         # 02 검수 파이프라인
GET  /v1/me/rewards                   # 04 원장
GET  /v1/me/trust-profile

# Admin (admin-api, ROLE_ADMIN)
GET  /v1/admin/reviews/pending
POST /v1/admin/responses/:id/review
POST /v1/admin/reports/:id/approve    # 03 리포트 검수
POST /v1/admin/rewards/:id/adjust
```

## 절차

1. 새 엔드포인트가 어느 사용자군에 속하는지 정한다.
2. 관련 룰(슬롯/검수/원장/리포트/개인정보)을 확인해 요청·응답 계약을 잡는다.
3. 권한 경계와 소유권 검증(IDOR 방지)을 명시한다.
4. 응답 DTO에 개인정보/타 사용자 데이터가 새지 않는지 확인한다. (`.claude/rules/backend/06-privacy.md`)

## 체크리스트

- [ ] 엔드포인트가 requester/participant/admin 중 하나에 명확히 속하는가?
- [ ] `brief_id`/응답 id 조작으로 타 사용자 데이터에 접근할 수 없는가?
- [ ] 응답 제출이 슬롯 예약을 전제로 하는가?
- [ ] 관리자 조정 API가 감사 로그를 남기는가?
- [ ] 응답 DTO에 원본 PII가 포함되지 않는가?

## 산출물

```md
## API 설계

- 사용자군:
- 엔드포인트:
- 요청/응답 계약:
- 권한·소유권 검증:
- 관련 룰:
```
