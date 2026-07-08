---
description: "프론트엔드는 requester/participant/admin 3개 표면으로 분리하고, 각 표면의 인증·권한 경계와 접근 데이터를 섞지 않는다."
---

# 01. 앱 표면 분리 규칙

Opinion Brief 프론트엔드를 세 사용자군 표면으로 나누는 규칙이다. 백엔드 API 경계(`.claude/rules/backend/*`, `backend-api-design` 스킬)와 대칭이다.

근거 문서:
- `.docs/prd/opinion-brief-engineering-review.md` 4.1, 5, 9.1
- `.docs/prd/opinion-brief-technology-summary.md` 3.1, 5

## 금지 규칙 (하지 말 것)

- ❌ 한 페이지/라우트에 다른 표면(requester/participant/admin) 기능을 섞지 않는다.
- ❌ 역할 확인 없는 공용 레이아웃에 관리자 기능을 넣지 않는다.
- ❌ 참여자 화면에 다른 참여자의 원문 응답을 렌더하지 않는다.
- ❌ 클라이언트에서 `brief_id`/응답 id를 조작해 타 사용자 리소스를 요청하는 경로를 만들지 않는다.

## 설계 기준

### 세 표면을 분리한다

- Requester (AE/기획자): Brief 생성, 자신의 Brief·리포트 조회
- Participant (참여자): 참여 가능한 Brief, 자신의 응답·보상 조회
- Admin (운영자): 검수 콘솔, 리포트 편집·승인, 보상 조정

한 화면/라우트에 서로 다른 사용자군 기능을 섞지 않는다. Next.js에서는 라우트 그룹(예: `(requester)`, `(participant)`, `(admin)`)이나 별도 앱 경계로 분리한다.

### 권한 경계는 UI에서도 지킨다

- 각 표면은 자신의 역할 토큰으로만 접근한다.
- 클라이언트에서 `brief_id`/응답 id를 조작해 타 사용자 데이터를 요청하는 흐름을 만들지 않는다. (서버가 최종 차단하지만, UI도 남의 리소스로 가는 링크·요청을 만들지 않는다)

## 예시

```text
app/
  (requester)/    # 요청자 표면
    layout.tsx
    briefs/page.tsx
  (participant)/  # 참여자 표면
    layout.tsx
  (admin)/        # 관리자 표면
    layout.tsx
```

```tsx
// app/(admin)/layout.tsx — 표면별 레이아웃에서 역할 가드
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role !== "ADMIN") redirect("/"); // 관리자 표면은 관리자만
  return <AdminShell>{children}</AdminShell>;
}
```

## 구현 가드레일

- 라우팅 단에서 역할별 표면을 나눈다. 역할 확인 없는 공용 레이아웃에 관리자 기능을 넣지 않는다.
- 참여자 화면은 다른 참여자의 원문 응답을 렌더하지 않는다.
- 요청자 화면은 다른 요청자의 Brief/리포트로 가는 경로를 노출하지 않는다.
- 인증 상태·역할은 서버 상태로 취급한다. (`02-state-management.md`)

## 검증 기준

- 역할 없는 사용자가 관리자/요청자 라우트에 접근 시 차단되는지 테스트.
- 참여자 뷰 응답 DTO에 타인 식별 정보가 없는지 확인.
