---
description: "FE는 FSD(Feature-Sliced Design). 레이어는 app>pages>widgets>features>entities>shared 순서 고정, 의존은 위에서 아래로만, slice는 index.ts public API로만 노출, 레이어 복수형·slice 소문자 kebab-case."
---

# 00. FSD 구조 정책 (Feature-Sliced Design)

이 문서는 프론트엔드 FSD 레이어, slice 배치, 의존 방향, 네이밍과 공개 API를 정의한다.

# 연관 관계

- TypeScript DTO · API 통신 규칙 참조: @.claude/rules/frontend/typescript/01-dto-types.md
- 앱 표면 분리 규칙 참조: @.claude/rules/frontend/01-app-surfaces.md

# 적용 기준

Opinion Brief 프론트엔드의 레이어 경계·의존·세그먼트·네이밍·Public API 정책이다. 이 문서가 나머지 frontend 룰(`01`~`05`)의 코드 배치 기준이다. 스택은 React / Next.js / Node.js.

# [금지사항]

- 하위 레이어가 상위 레이어를 import하지 않는다. (예: `entities`가 `features`/`pages`를, `shared`가 어떤 상위 레이어도 참조 금지)
- 같은 레이어의 다른 slice를 직접 import하지 않는다.
- 외부 slice에서 slice 내부 경로를 직접 deep import하지 않는다. 반드시 대상 slice의 `index.ts`(public API)로만 접근한다.
- `shared`에 도메인 지식(특정 엔티티/기능 로직)을 넣지 않는다.
- slice 폴더명을 PascalCase로 만들지 않는다. 소문자 kebab-case로 둔다.
- slice 내부 공통 유틸 폴더명을 `utils`로 쓰지 않는다. `lib`을 쓴다.
- group 폴더 자체에서 barrel export를 만들지 않는다. 외부 import는 leaf slice의 public API를 사용한다.
- 3단계 이상의 slice 중첩은 금지한다.

# 설계 기준

## 레이어 (순서 고정)

```text
src/
  app/        # 앱 초기화, 라우팅, 전역 Provider, 전역 스타일
  pages/      # 라우트 단위 화면 (하위 레이어 조합)
  widgets/    # 독립적인 큰 UI 블록 (feature/entity 조합)
  features/   # 사용자 행동/비즈니스 액션 단위 기능
  entities/   # 도메인 모델 (User, Report, Response ...)
  shared/     # 도메인 독립 공통 코드 (ui, api client, lib, config)
```

## 의존 규칙 — 위에서 아래로만 (절대 규칙)

```text
app → pages → widgets → features → entities → shared
```

**이것은 절대 규칙이다.** 상위 레이어가 하위 레이어를 사용하는 것은 가능하지만, **하위 레이어가 상위 레이어를 참조하는 것은 절대 금지한다.** (예: `entities`가 `features`/`widgets`/`pages`를, `shared`가 어떤 상위 레이어도 참조 불가)

- `app`: 모든 레이어 사용 가능
- `pages`: widgets / features / entities / shared 사용 가능
- `widgets`: features / entities / shared 사용 가능
- `features`: entities / shared 사용 가능
- `entities`: shared만 사용 가능
- `shared`: 다른 레이어를 참조하면 안 됨

## 레이어 역할

- **app** — 앱 부트스트랩. routes, providers, 전역 styles, app-level store 설정. 비즈니스 로직 최소화.
- **pages** — 라우트에 대응되는 화면. widgets/features/entities를 조합. 재사용보다 페이지 구성 목적. 페이지 전용 상태는 `model`, 전용 하위 컴포넌트는 `ui`.
- **widgets** — 페이지를 구성하는 독립적인 큰 블록(Header, Sidebar, ReportView 등). 여러 feature/entity 조합. 비즈니스 action 자체는 feature로 분리.
- **features** — 사용자 액션 단위 기능(submit-response, create-brief, reserve-slot 등). 하나의 명확한 action 담당. entity를 사용해 기능 수행.
- **entities** — 서비스 핵심 도메인 모델(opinion-brief, response, report ...). model/types/api/ui 포함 가능. feature를 참조하면 안 됨.
- **shared** — 도메인 독립 공통 코드(Button, Modal, api client, config, hooks, cn, formatDate 등).

## slice 세그먼트와 조합

각 slice(도메인)는 내부를 세그먼트로 책임을 나누고, 세그먼트끼리 조합한다. `entities`/`features`/`widgets` slice 모두 이 구조를 따른다.

```text
features/auth/login/
  api/            # 서버 통신 (login-api.ts)
  model/          # 상태·로직 훅 (use-login-form.ts)
  ui/             # 컴포넌트 (login-form.tsx)
  lib/            # slice 전용 유틸 (선택)
  types.ts        # 요청/응답 타입 (LoginRequest, LoginResponse)
  index.ts        # public API
```

- 책임 분리: `api` 서버 통신, `model` 상태·로직, `ui` 컴포넌트, `lib` slice 전용 유틸.
- **조합(의존) 방향은 slice 내부에서도 `ui → model → api → shared`로 흐른다.** `ui`는 `model` 훅을 사용하고, `model`은 `api`를 호출하며, `api`는 `shared`의 공통 `request`를 쓴다(`typescript/01-dto-types.md`).
- 타입은 성격에 따라 분리한다. API DTO·외부 계약 타입은 slice 루트 `types.ts`, 내부 상태·뷰모델 타입은 `model/types.ts`에 둔다.
- 외부에는 `index.ts`로만 노출한다. slice 내부 세그먼트끼리는 상대 경로 import를 허용한다.

## slice 깊이

기본 slice는 레이어 바로 아래에 둔다.

```text
features/submit-response/
entities/response/
widgets/report-view/
```

기능군이 커지는 경우에만 group + leaf slice 2단계를 허용한다. public API와 세그먼트는 leaf slice 기준으로 둔다.

```text
features/auth/login/
features/auth/logout/
features/brief/create-brief/
```

- group 폴더(`auth`, `brief`)는 분류용이다. 세그먼트(`api`, `model`, `ui`, `lib`)와 `index.ts`는 leaf slice(`login`, `create-brief`)에 둔다.

## shared 구조

`shared`는 slice가 아니라 도메인 독립 공통 자원 폴더로 구성한다.

```text
shared/
  api/       # 공통 request, client, api-types, api-client-error, http-method (typescript/01-dto-types.md)
  config/    # env 등 설정
  lib/       # cn, formatDate, auth-token 등 유틸
  hooks/     # 공통 훅
  ui/        # Button, Modal 등 공통 컴포넌트
  styles/    # 공통 스타일
  types/     # 공통 타입
```

## 네이밍

- 레이어명은 복수형으로 고정: `pages`, `widgets`, `features`, `entities`, `shared`.
- slice 폴더와 group 폴더는 소문자 kebab-case로 통일: `submit-response`, `layout-header`, `opinion-brief`, `auth`. PascalCase 금지.
- 공통/전용 유틸 폴더는 `lib`(‑ `utils` 지양).

## Public API — index.ts로만 노출

각 slice는 `index.ts`를 통해서만 외부에 노출한다. 외부에서 slice 내부 경로를 직접 import하지 않는다. 같은 slice 내부 세그먼트끼리는 상대 경로 import를 사용한다.

```ts
// 허용
import { ResponseCard } from '@/entities/response';
import { SubmitResponseButton } from '@/features/submit-response';
import { LoginForm } from '@/features/auth/login';
import { ReportView } from '@/widgets/report-view';

// 허용 (같은 slice 내부)
import { loginApi } from '../api/login-api';

// 금지 (deep import)
import { ResponseCard } from '@/entities/response/ui/ResponseCard';
import { responseApi } from '@/entities/response/api/responseApi';
import { loginApi } from '@/features/auth/login/api/login-api';
```

## Next.js 라우팅과 FSD

Next.js는 라우팅 디렉터리(App Router `app/`, 또는 Pages Router `pages/`)를 프레임워크 예약 영역으로 쓴다. 이름이 FSD의 `app`·`pages` 레이어와 겹치므로 다음으로 조정한다.

- FSD 레이어는 `src/` 아래에 둔다. Next.js 라우팅 디렉터리는 프로젝트 루트에 둔다(예: 루트 `app/`, `src/app/`은 FSD app 레이어).
- Next 라우트 파일(`page.tsx`/`route.ts` 등)은 **얇게** 유지한다. 라우팅·데이터 경계만 담고, 화면 구성은 FSD `pages` 레이어의 컴포넌트를 import해 연결한다.
- FSD `app` 레이어(전역 Provider·초기화)는 Next의 root `layout.tsx`(App Router) 또는 `_app`(Pages Router)에서 연결한다.
- Node.js/서버 실행 코드(route handler, server action 등)도 이 경계를 지키고, 하위 레이어가 상위를 참조하지 않는다.

## Opinion Brief 매핑

- `entities`: `opinion-brief`, `response`, `report`, `reward`, `participant`, `trust-profile`
- `features`: `create-brief`, `reserve-slot`, `submit-response`, `review-response`(admin), `generate-report`·`deliver-report`, `adjust-reward`
- `widgets`: `report-view`, `brief-form`, `response-status`
- `pages`: 세 표면(requester / participant / admin) 라우팅 (`01-app-surfaces.md`)
- `shared`: TanStack Query 클라이언트·설정(`02`), 공용 Zod 요소(`03`), UI 키트

## 기존 룰과의 연결

| 관심사(룰) | 주 배치 |
|---|---|
| 앱 표면 분리 (`01`) | `app` 라우팅 + `pages`의 표면별 그룹 |
| 상태 관리 (`02`) | 서버 상태는 `entities`/`features`의 `api`·`model` + `shared/api`, 클라이언트 상태는 각 slice `model` |
| 폼·검증 (`03`) | `features`(create-brief, submit-response)의 `model`(Zod)·`ui` |
| 비동기 검수 상태 (`04`) | `response` 엔티티 `model` + `response-status` widget/feature |
| 리포트 뷰 (`05`) | `report` 엔티티 + `report-view` widget/page |

# 구현 가드레일

- import 방향은 위 의존 규칙(app→shared)을 단방향으로 지킨다. 린트로 강제하는 것을 권장한다(예: eslint-plugin-boundaries).
- 각 slice는 `index.ts` public API로만 노출하고, 외부에서 deep import하지 않는다. 같은 slice 내부는 상대 경로 import를 쓴다.
- 세그먼트는 `ui`/`model`/`api`/`lib`을 쓴다. 공통 유틸은 `lib`을 쓴다.
- 타입은 API DTO·외부 계약 타입은 `types.ts`, 내부 상태·뷰모델 타입은 `model/types.ts`에 둔다.
- 레이어명은 복수형, slice/group 폴더는 소문자 kebab-case.
- 페이지 전용 컴포넌트는 해당 page의 `ui`에 둔다. 재사용 블록은 widget으로 승격한다.
- `shared`에는 도메인 독립 코드만 둔다.

# 검증 기준

- import 방향 위반·같은 레이어 다른 slice 직접 참조·외부 deep import가 없는지(린트) 확인.
- 각 slice가 `index.ts`로만 노출되는지 확인.
- 레이어/slice 네이밍 규칙 준수 확인.
