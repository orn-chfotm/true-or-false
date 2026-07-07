---
description: "백엔드는 user-api/admin-api/domain/infra/core 멀티 모듈 DDD 구조다. domain에 entity·dto·service·포트를 두고, DB 접근 구현은 /infra/persistence에 둔다."
---

# 00. 모듈 구조 규칙 (멀티 모듈 DDD)

Opinion Brief 백엔드의 모듈 경계와 배치 규칙이다. 이 문서가 나머지 backend 룰(`01`~`06`)의 코드 배치 기준이 된다.

## 설계 기준

### 멀티 모듈 구성

웹 서비스를 하나의 시스템으로 보고, 외부 시스템(DB·AWS·SMTP)은 경계를 분리한다.

| 모듈 | 책임 | 무엇을 두나 |
|---|---|---|
| `user-api` | 사용자(요청자/참여자) 요청 진입점 | Controller, 라우팅, 사용자용 요청/응답 매핑 |
| `admin-api` | 관리자 요청 진입점 | Controller, 라우팅, 관리자용 요청/응답 매핑 |
| `domain` | DDD 핵심. 실제 비즈니스 로직 | 도메인별 패키지: `dto`, `service`, `entity`, 영속 **포트 interface** |
| `infra` | 외부 시스템 격리 | `persistence`(실제 DB 접근 구현), `aws`, `smtp`, LLM 클라이언트 |
| `core` | 공통 규칙 | jwt, 공통 보안, 공통 예외, 유틸 등 전 모듈 공유 요소 |

`service`는 별도 모듈이 아니라 `domain` 안에 있다.

### domain 모듈 내부 (DDD)

하나의 도메인(애그리거트) 안에 dto·service·entity·영속 포트가 함께 존재한다.

```text
domain/
  opinionbrief/
    dto/                          # 도메인 DTO
    service/                      # 비즈니스 로직
    entity/                       # JPA Entity (단일·공유)
    OpinionBriefRepository.java   # 영속 포트 interface (도메인이 사용하는 계약)
    OpinionBriefCustomRepository.java  # QueryDSL 커스텀 쿼리 포트 interface
  response/
  report/
  reward/
  participantslot/
  ...
```

- **Entity와 DTO는 `domain`에 둔다.** Entity는 영속성 모델이므로 요청 주체(사용자/관리자)와 무관하게 단일·공유다. 도메인 DTO도 `domain`에 두고, 사용자/관리자 표현이 달라야 하면 각 api 모듈의 요청/응답 모델로 분화한다.
- 도메인은 **영속 포트 interface**만 알고, 실제 DB 접근 구현은 모른다.

### infra/persistence 모듈 내부 (DB 접근 통로)

`/infra/persistence`는 domain에서 정제된 최종 요청을 DB로 전달하는 통로다. 실제 DB 접근(JPA/QueryDSL) 구현을 둔다.

```text
infra/
  persistence/
    opinionbrief/
      OpinionBriefCustomRepositoryImpl.java  # QueryDSL 구현 (implements OpinionBriefCustomRepository)
      # JPA 연결·매핑 등 실제 DB 접근 코드
  aws/
  smtp/
```

- 기본 CRUD는 `[Domain]Repository extends JpaRepository`로 처리한다.
- 커스텀 쿼리(QueryDSL)는 **기본 `JpaRepository` interface와 분리**해 `[Domain]CustomRepository`(포트 interface) + `[Domain]CustomRepositoryImpl`(구현)로 만든다.
- 포트 interface는 `domain`에, 실제 DB 접근 구현은 `/infra/persistence`에 둔다.

### 의존 방향

```text
컴파일 의존:   user-api / admin-api  ->  domain  <-  infra(persistence)
호출/데이터 흐름: domain.service -> 영속 포트 -> /infra/persistence 구현 -> DB
core: 전 모듈 공유
```

- `user-api` / `admin-api`는 `domain`에 의존한다. Controller가 `infra`를 직접 호출하지 않는다.
- `infra`는 `domain`에 의존한다(도메인 영속 포트를 구현, Entity 참조).
- **`domain`은 `infra`를 import하지 않는다.** 자신의 영속 포트 interface에만 의존하므로 순환이 없다.
- 데이터 흐름상으로는 domain의 정제된 요청이 `/infra/persistence`를 통해 DB로 전달된다.
- 실행 모듈(`user-api`, `admin-api`)이 런타임에 `domain` + `infra` + `core`를 조립한다.
- `core`는 어느 모듈에서나 참조할 수 있다.

## 기존 룰의 모듈 배치 매핑

| 관심사(룰) | 주 배치 |
|---|---|
| 도메인 모델·상태전이 (`01`) | `domain`(entity, service) |
| 검수 파이프라인·LLM 로깅 (`02`) | 오케스트레이션 `domain/service`, LLM 클라이언트 `infra`, Controller `*-api` |
| 리포트 스냅샷 (`03`) | 생성 로직 `domain/service`, Report entity `domain`, DB 접근 `infra/persistence` |
| 보상 원장 (`04`) | 원장 로직 `domain/service`, RewardLedger entity `domain`, DB 접근 `infra/persistence` |
| 슬롯 동시성 (`05`) | 예약 로직 `domain/service`, Slot entity `domain`, 유니크 제약·QueryDSL `infra/persistence`, Redis 카운터 `infra` |
| 개인정보 (`06`) | 마스킹·집계 `domain/service`, DB 접근 `infra/persistence`, 응답 DTO `domain`(공용)/`*-api`(표현) |

## 구현 가드레일

- Controller(`user-api`/`admin-api`)에 비즈니스 로직을 넣지 않는다. 매핑과 위임만 한다.
- `domain`은 `infra`를 import하지 않는다. 영속은 포트 interface로만 참조한다.
- Entity를 `*-api`나 `infra`에 정의하지 않는다. `domain`에 단일로 둔다.
- Entity를 API 응답으로 직렬화하지 않는다. 항상 DTO로 변환한다.
- 외부 시스템 SDK(DB/AWS/SMTP/LLM) 접근은 `infra`에만 존재한다. DB 접근은 `/infra/persistence`에 둔다.
- QueryDSL 커스텀 쿼리는 `[Domain]CustomRepository`(포트 interface, `domain`) + `Impl`(`infra/persistence`)로 분리한다. 기본 `JpaRepository`와 섞지 않는다.
- `core`에 도메인 로직이나 특정 유스케이스를 넣지 않는다. 공통 규칙만 둔다.

## 검증 기준

- 모듈 의존이 `*-api -> domain`, `infra -> domain`, `모두 -> core` 방향을 지키고 `domain -> infra` 역방향이 없는지 확인.
- API 응답에 Entity가 직렬화되어 나가지 않는지 확인.
- 외부 시스템 호출이 `infra` 밖에서 일어나지 않는지 확인.
- QueryDSL 구현이 `/infra/persistence`에, 포트 interface가 `domain`에 있는지 확인.
