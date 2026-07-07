---
name: frontend-form-build
description: "Zod 스키마 + React Hook Form으로 Brief 생성/응답 제출 폼을 만드는 절차. 새 입력 폼을 추가할 때 사용한다."
---

# frontend-form-build

RHF + Zod로 입력 폼을 만드는 절차다.

근거: `.claude/rules/frontend/03-forms-validation.md`

## 절차

1. 폼이 어떤 데이터를 서버에 보내는지 확인하고, 대응 API 계약을 본다. (`backend-api-design`)
2. Zod 스키마를 먼저 작성한다. 이 스키마를 타입 소스로 재사용한다.
3. RHF `useForm`에 zodResolver를 연결한다.
4. 도메인 검증 규칙을 스키마에 넣는다.
   - 응답 폼: 선택 필수 + 근거 의견 필수(1~3문장, 최소/최대 길이)
   - Brief 폼: 마감 과거 금지, 필요 승인 수 양수
5. mutation 진행 중 제출 버튼 비활성화로 이중 제출을 막는다.
6. 서버 검증 실패 응답을 폼 에러로 매핑한다.

## 체크리스트

- [ ] Zod 스키마 하나가 검증 + 타입 소스인가?
- [ ] 근거 의견 필수·길이 범위가 스키마에 있는가?
- [ ] 마감 과거/음수 승인 수가 막히는가?
- [ ] 제출 중 버튼 비활성화로 이중 제출을 막는가?
- [ ] 개인정보 입력 주의 안내가 있는가?

## 산출물

```md
## 폼 구현

- 폼:
- Zod 스키마:
- 검증 규칙:
- 대응 API:
- 이중 제출 방지:
```
