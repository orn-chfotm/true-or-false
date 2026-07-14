---
name: gradle-multi-project-structure
description: 백엔드 Gradle 멀티 모듈 구조, api-admin/api-user 개별 build/run, core/domain/infra 모듈 경계를 만들거나 변경할 때 사용한다.
when_to_use: settings.gradle, build.gradle, 하위 프로젝트 생성, 의존 방향, 모듈 분리, api-admin/api-user 애플리케이션 빌드 구성을 다룰 때 사용한다.
paths:
  - "back-end/**/*"
  - "settings.gradle"
  - "build.gradle"
  - "**/*.gradle"
---

# 스킬: Gradle 멀티 모듈 구조

## 참조

- 규칙: `back-end/.claude/rules/gradle-module-boundary-rules.md`
- 문서: `back-end/docs/backend/01-multi-module.md`
- Core 기준: `back-end/docs/backend/02-core-module.md`

## 절차

1. 대상 모듈이 `core`, `domain`, `infra`, `api-admin`, `api-user` 중 무엇인지 확인한다.
2. `settings.gradle`에 모듈을 등록한다.
3. `api-admin`과 `api-user`가 각각 build/run 가능한 application module인지 확인한다.
4. `core`, `domain`, `infra`는 library module로 유지한다.
5. 의존 방향이 허용 방향을 벗어나지 않게 설정한다.
6. `api-member` 명칭이 남아 있으면 `api-user` 기준으로 정리한다.

## 체크리스트

- `api-admin`과 `api-user`가 각각 app server로 실행 가능하다.
- `domain`이 `infra`에 의존하지 않는다.
- `core`가 다른 프로젝트 모듈에 의존하지 않는다.
- `api-member` 명칭이 남아 있지 않다.
