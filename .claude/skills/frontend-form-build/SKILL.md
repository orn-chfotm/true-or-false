---
name: frontend-form-build
description: "Zod 스키마 + React Hook Form으로 Brief 생성/응답 제출 폼을 FSD features 레이어에 만드는 절차. 새 입력 폼을 추가할 때 사용한다."
---

# frontend-form-build

이 스킬은 React Hook Form과 Zod를 사용해 입력 폼을 구현하는 절차다.

# 연관 관계

- backend-api-design 참조: @.claude/skills/backend-api-design/SKILL.md
- 폼·검증 규칙 참조: @.claude/rules/frontend/03-forms-validation.md
- FSD 구조 정책 (Feature-Sliced Design) 참조: @.claude/rules/frontend/00-architecture.md

# 적용 기준

RHF + Zod로 입력 폼을 만드는 절차다.

근거: `.claude/rules/frontend/03-forms-validation.md`, `.claude/rules/frontend/00-architecture.md`

# 언제 사용하나

- Brief 생성/응답 제출 등 새 입력 폼을 추가할 때
- 기존 폼의 검증 규칙을 추가·변경할 때
- 폼 관련 PR을 리뷰할 때

# [금지사항]

- 폼을 `entities`·`widgets` 등 다른 레이어에 두지 않는다. 사용자 액션 단위인 `features`에 둔다.
- 검증 규칙을 컴포넌트에 흩뿌리지 않는다. Zod 스키마 한 곳(`model`)에 모은다.
- slice 내부를 deep import하지 않는다. `index.ts`로만 접근한다.
- 클라이언트 검증을 서버 검증 대체로 삼지 않는다.
- 제출 진행 중 버튼을 활성 상태로 두어 이중 제출을 허용하지 않는다.

# FSD 배치

- 폼은 사용자 액션이므로 `features` 레이어의 slice에 둔다(예: `features/submit-response`, `features/create-brief`).
- 세그먼트: Zod 스키마·훅은 `model`, 폼 컴포넌트는 `ui`. 외부에는 `index.ts`로만 노출한다.

# 절차

1. 폼이 어떤 데이터를 서버에 보내는지 확인하고, 대응 API 계약을 본다(`backend-api-design`).
2. `features/<action>/model`에 Zod 스키마를 먼저 작성한다. 이 스키마를 타입 소스로 재사용한다.
3. RHF `useForm`에 zodResolver를 연결한다.
4. 도메인 검증 규칙을 스키마에 넣는다.
   - 응답 폼: 선택 필수 + 근거 의견 필수(1~3문장, 최소/최대 길이)
   - Brief 폼: 마감 과거 금지, 필요 승인 수 양수
5. 제출 진행 중 버튼 비활성화로 이중 제출을 막는다.
6. 서버 검증 실패 응답을 폼 에러로 매핑한다.
7. `index.ts`로 폼 컴포넌트/훅만 노출한다.

# 체크리스트

- [ ] `features` 레이어에 배치되고 세그먼트(model/ui)가 올바른가?
- [ ] Zod 스키마 하나가 검증 + 타입 소스인가?
- [ ] 근거 의견 필수·길이 범위가 스키마에 있는가?
- [ ] 마감 과거/음수 승인 수가 막히는가?
- [ ] 제출 중 버튼 비활성화로 이중 제출을 막는가?
- [ ] public API(`index.ts`)로만 노출하는가?

# 산출물

```md
## 폼 구현

- slice(레이어/이름):
- Zod 스키마:
- 검증 규칙:
- 대응 API:
- 이중 제출 방지:
```
