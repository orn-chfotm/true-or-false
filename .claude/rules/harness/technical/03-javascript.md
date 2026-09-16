---
description: "JavaScript/TypeScript 프로젝트 공통 기술 규칙과 역할별(PM/CTO/PL/PA) 적용 기준."
---

# JavaScript 규칙

이 문서는 JavaScript·TypeScript 공통 개발 원칙과 역할별 검토 관점을 정의한다.

## 기본 원칙

- 기존 lint, formatter, module 규칙을 우선한다.
- 타입이 있는 프로젝트에서는 `any` 사용을 피하고 의도를 드러낸다.
- 상태 관리, API 호출, UI 컴포넌트 책임을 분리한다.
- 비동기 오류 처리는 호출자와 사용자 경험을 함께 고려한다.
- 테스트 가능성을 해치지 않는 구조를 우선한다.

## Agent 적용 기준

CTO는 상태 관리, 렌더링 성능, API 계약, 빌드 영향도를 검토한다.

PL은 컴포넌트 경계, hook/util 분리, 테스트 범위를 정한다.

PA는 기존 스타일과 타입 규칙을 따른다.
