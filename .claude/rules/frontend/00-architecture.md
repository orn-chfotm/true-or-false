---
description: "프론트엔드는 FSD(Feature-Sliced Design) 구조다. app/pages/widgets/features/entities/shared 레이어를 상위→하위 단방향으로만 의존한다."
---

# 00. FSD 구조 규칙 (Feature-Sliced Design)

Opinion Brief 프론트엔드의 레이어 경계와 배치 규칙이다. 이 문서가 나머지 frontend 룰(`01`~`05`)의 코드 배치 기준이 된다.

## 설계 기준

### 레이어 (상위 → 하위)

| 레이어 | 책임 |
|---|---|
| `app` | 앱 초기화, 프로바이더, 전역 라우팅, 전역 스타일 |
| `pages` | 라우트 단위 페이지. 표면(requester/participant/admin)별 라우팅 진입점 |
| `widgets` | 여러 feature·entity를 조합한 독립 UI 블록 |
| `features` | 사용자 상호작용/유스케이스 단위 |
| `entities` | 비즈니스 엔티티 단위 |
| `shared` | 재사용 UI 키트, API 클라이언트, 설정, 유틸 |

### import 방향 (단방향)

- 상위 레이어는 하위 레이어만 import한다. 하위가 상위를 import하지 않는다.
- 같은 레이어의 다른 slice를 직접 import하지 않는다. 각 slice의 public API(`index.ts`)로만 참조한다.
- slice 내부는 세그먼트로 나눈다: `ui/`, `model/`(상태·로직), `api/`, `lib/`, `config/`.

### Opinion Brief 매핑

- `entities`: `opinion-brief`, `response`, `report`, `reward`, `participant`, `trust-profile`
- `features`: `create-brief`, `reserve-slot`, `submit-response`, `review-response`(admin), `generate-report`·`deliver-report`, `adjust-reward`
- `widgets`: `report-view`, `brief-form`, `response-status` 등
- `pages`: 세 표면(requester / participant / admin) 라우팅. (`01-app-surfaces.md`)
- `shared`: TanStack Query 클라이언트·설정(`02`), Zod 스키마 공용 요소(`03`), UI 키트

## 기존 룰과의 연결

| 관심사(룰) | 주 배치 |
|---|---|
| 앱 표면 분리 (`01`) | `app` 라우팅 + `pages`의 표면별 그룹 |
| 상태 관리 (`02`) | 서버 상태는 `entities`/`features`의 `api`·`model` 세그먼트 + `shared/api`, 클라이언트 상태는 각 slice `model` |
| 폼·검증 (`03`) | `features`(create-brief, submit-response)의 `model`(Zod)·`ui` |
| 비동기 검수 상태 (`04`) | `response` 엔티티 `model` + `response-status` widget/feature |
| 리포트 뷰 (`05`) | `report` 엔티티 + `report-view` widget/page |

## 구현 가드레일

- 하위 레이어가 상위 레이어를 import하지 않는다. (예: `entities`가 `features`/`pages`를 참조 금지)
- slice 간 직접 참조 대신 public API(`index.ts`)만 사용한다.
- API 호출·서버 상태 로직은 `ui` 컴포넌트가 아니라 `api`·`model` 세그먼트에 둔다. (`02-state-management.md`)
- 표면(requester/participant/admin) 경계를 `pages`/`app`에서 지키고, 한 페이지에 다른 표면 기능을 섞지 않는다. (`01-app-surfaces.md`)
- 공용 요소는 `shared`에 두되, 특정 도메인 지식이 담긴 것은 `entities` 이상으로 올린다.

## 검증 기준

- import 방향이 상위→하위 단방향인지(역방향·동일 레이어 직접 참조 없음) 확인.
- 각 slice가 public API로만 노출되는지 확인.
- 표면별 페이지가 섞이지 않는지 확인.
