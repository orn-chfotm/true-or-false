---
name: frontend-fsd-slice
description: "FSD 레이어에 새 slice(entity/feature/widget/page)를 규칙에 맞게 생성하는 절차. 세그먼트·public API·네이밍·의존 방향을 지켜 배치한다."
---

# frontend-fsd-slice

새 slice를 FSD 정책(`.claude/rules/frontend/00-architecture.md`)에 맞게 추가하는 절차다.

## 절차

1. **레이어 결정** — 만들려는 것이 무엇인지로 레이어를 고른다.
   - 도메인 객체 → `entities`
   - 사용자 액션 단위 기능 → `features`
   - 페이지 구성용 큰 UI 블록 → `widgets`
   - 라우트 화면 → `pages`
   - 도메인 독립 공통 → `shared`
2. **slice 이름** — 소문자 kebab-case로 짓는다(`submit-response`, `report-view`). 기능군이 커지는 경우 `features/auth/login`처럼 group + leaf slice 2단계를 허용하되, public API와 세그먼트는 leaf slice에 둔다.
3. **세그먼트 생성** — 필요한 것만 만든다.
   - `ui/` 컴포넌트, `model/` 상태·로직, `api/` 서버 통신, `lib/` slice 전용 유틸
   - API DTO·외부 계약 타입은 slice 루트 `types.ts`, 내부 상태·뷰모델 타입은 `model/types.ts`
4. **public API** — `index.ts`에서 외부에 노출할 것만 export한다.
5. **의존 방향 확인** — 하위 레이어만 참조하는지, 같은 레이어 다른 slice를 직접 참조하지 않는지 확인한다. 같은 slice 내부 세그먼트끼리는 상대 경로 import를 쓴다.

## 예시

```text
features/submit-response/
  api/        submitResponseApi.ts
  model/      useSubmitResponse.ts
  ui/         ResponseForm.tsx
  types.ts    SubmitResponseRequest, SubmitResponseResponse
  index.ts    // export { ResponseForm }, { useSubmitResponse }
```

## 금지 규칙 (하지 말 것)

- ❌ 하위/동일 레이어를 잘못 참조하지 않는다(의존 방향 위→아래만).
- ❌ 외부에 slice 내부를 deep import로 노출하지 않는다. `index.ts`로만.
- ❌ group 폴더에 barrel export를 만들지 않는다. public API는 leaf slice에 둔다.
- ❌ slice를 3단계 이상 중첩하지 않는다.
- ❌ 폴더명을 PascalCase로 만들지 않는다(소문자 kebab-case).
- ❌ 공통 유틸을 `utils`로 만들지 않는다(`lib`).
- ❌ `shared` slice에 도메인 지식을 넣지 않는다.

## 산출물

```md
## 생성한 slice

- 레이어/이름:
- 세그먼트:
- public API(export):
- 의존 확인:
```
