---
description: "Spring/Spring Boot 프로젝트 공통 기술 규칙과 역할별(PM/CTO/PL/PA) 적용 기준."
---

# Spring 규칙

이 문서는 Spring 공통 계층 책임과 기술 변경에 대한 역할별 검토 관점을 정의한다.

# [금지사항]

- Controller, Service, Repository의 책임을 섞지 않는다.

# 기본 원칙

- 트랜잭션 경계는 Service 계층에서 명확히 검토한다.
- DTO, Entity, Request, Response 모델의 역할을 구분한다.
- 예외 처리 방식은 프로젝트의 기존 패턴을 따른다.
- 테스트는 슬라이스 테스트와 통합 테스트의 목적을 구분한다.

# Agent 적용 기준

CTO는 트랜잭션, 보안, 데이터 정합성, API 계약 변경을 검토한다.

PL은 패키지 구조, 공통 컴포넌트, 테스트 경계를 정리한다.

PA는 지정된 계층과 파일 범위 안에서만 구현한다.
