# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@.claude/rules/harness/00-role-model.md
@.claude/rules/harness/roles/01-pm.md
@.claude/rules/harness/roles/02-cto.md
@.claude/rules/harness/roles/03-pl.md
@.claude/rules/harness/roles/04-pa.md
@.claude/rules/harness/01-approval-authority.md
@.claude/rules/harness/02-workflow.md
@.claude/rules/harness/03-task-splitting.md
@.claude/rules/harness/04-plan-structure.md
@.claude/rules/harness/05-communication.md
@.claude/rules/harness/06-code-output.md
@.claude/rules/harness/07-review-process.md
@.claude/rules/harness/08-test-policy.md
@.claude/rules/harness/09-error-handling.md
@.claude/rules/harness/10-review-logging.md
@.claude/rules/harness/11-output-format.md
@.claude/rules/harness/12-skill-rule-template.md
@.claude/rules/harness/technical/01-naming.md
@.claude/rules/harness/technical/02-spring.md
@.claude/rules/harness/technical/03-javascript.md

# 프로젝트 규칙

## 작업 언어

모든 작업 내용을 한국어로 진행한다.

- 사용자에게 하는 설명, 계획, 승인 요청, 완료 보고는 한국어로 쓴다.
- md 문서, 코드 주석, 커밋 메시지, PR 본문, 리뷰 로그도 한국어로 쓴다.
- 코드 식별자(클래스명, 메서드명, 변수명, 파일명)와 API 경로는 영어를 유지한다.
- 사용자에게 노출되는 UI 문구와 예외 message는 한국어로 쓴다.

## AI 실행 규칙

모든 AI 실행 규칙(역할 모델, 승인 권한, 업무 흐름, plan 구조, 리뷰·로깅)은 위에서 import한 `.claude/rules/harness/`를 단일 기준으로 따른다. 이 문서들은 `.ai-prompts/docs/`의 AI 프로세스·기술 규칙을 이 프로젝트의 Claude 실행 환경에 맞게 옮겨온 사본이다.

핵심만 요약하면 다음과 같다. 상세는 `.claude/rules/harness/`가 기준이다.

- 역할은 PM → CTO → PL → PA 순으로 나뉘고, 각 단계 산출물마다 사용자 승인을 받는다. `.claude/agents/{pm,cto,pl,pa}.md` subagent로 역할을 호출할 수 있다(PM/CTO는 읽기 전용 도구만 가져 harness가 직접 구현을 막는다).
- **사용자 최종 승인 전에는 파일 생성/수정, 코드 변경, 상태를 바꾸는 명령을 실행하지 않는다.** 계획 수립용 read-only 탐색만 허용한다.
- 한 역할 산출물을 낸 뒤 사용자 확인 없이 다음 역할로 자동 진행하지 않는다.
- 매 작업마다 repository를 풀 스캔하지 않는다. 사용자가 언급한 파일 → 그 파일이 참조하는 문서 → 필요 시 제한 검색 순으로 읽는다.
- 리뷰 로그(error/critical/improvement, AI 설계·피드백 기록)는 `.claude/rules/harness/` 내부가 아니라 이 프로젝트의 `.ai/reviews/<category>/`에 남긴다.
- `dir init` / `claude dir init` 같은 예약 명령은 PM 계획 없이 바로 실행한다. 이 명령은 이관 대상에서 제외했으므로 `.ai-prompts/docs/00-docs/03-agent-dir-init.md`를 단일 기준으로 따른다(이 프로젝트에서 `.ai-prompts`를 직접 참조하는 유일한 경우).

## 역할 Agent와 Command

- 역할별 subagent: `.claude/agents/pm.md`, `cto.md`, `pl.md`, `pa.md`. PM·CTO는 `Read/Glob/Grep`만 가져 실제 구현을 도구 레벨에서 못 하게 막는다. PL은 PA 결과 통합 책임 때문에 `Edit/Write/Bash`도 가진다. PA는 전체 도구를 가진다.
- 단계별 slash command: `/pm-plan`, `/cto-review`, `/pl-plan`, `/pa-run`, `/review-log`. 각 command는 해당 subagent를 호출하고, 실행 뒤 사용자 승인을 기다리며 다음 단계로 자동 진행하지 않는다.
- hook: `.claude/settings.json`의 `PreToolUse` 훅이 `.ai-prompts/` 내부 파일에 대한 Edit/Write/NotebookEdit을 차단한다(`.claude/hooks/guard-ai-prompts.js`).

## Claude Adapter Boundary

- `.claude/rules/`는 프로젝트 공통 정책이면 커밋한다.
- `.claude/skills/`는 프로젝트 공통 절차이면 커밋한다.
- `.claude/settings.json`은 공유 가능한 기본값만 둔다.
- `.claude/settings.local.json`은 개인 로컬 설정이므로 커밋하지 않는다.
- `.claude/agents/`는 역할이 팀 공통으로 합의된 경우에만 둔다.

## Back-end

Back-end 작업을 지시받으면 `back-end/CLAUDE.md`를 먼저 읽고, 그 안에서 연결된 상세 md 규칙을 따른다.

@back-end/CLAUDE.md

## 사용자 의견 검수

- 사용자 의견 검수는 **Spring AI → OpenAI 모델 API**로 구현한다. Codex App Server는 도입하지 않는다. 정확한 모델 ID와 호출 설정은 아직 미확정이다.
- 구현 순서·필요 스킬·미확정 항목은 [.docs/implementation/opinion-review-skills.md](.docs/implementation/opinion-review-skills.md)를 먼저 읽는다.
- 연동·프롬프트는 `/spring-ai-opinion-review`, 판정 품질·회귀 검증은 `/opinion-review-evaluation` 스킬을 사용한다.
- 규정집 RAG의 Ollama·Elasticsearch 정책은 사용자 의견 검수에 적용하지 않는다. 제품 정책은 검수 규칙을, `back-end/` 코드 배치는 해당 디렉터리 규칙을 따른다.

## Front-end

Front-end 작업을 지시받으면 `front-end/CLAUDE.md`를 먼저 읽고, 그 안에서 연결된 상세 md 규칙을 따른다.

@front-end/CLAUDE.md

# 리포지토리 현황

이 저장소는 **아직 구현 코드가 없는 사양·규칙 저장소다.** `back-end/`, `front-end/` 어디에도 `settings.gradle`, `package.json`, 소스 파일이 없다.

따라서 지금 시점에 build / lint / test 명령은 존재하지 않는다. 명령을 만들어내지 말고, 스캐폴딩이 필요하면 아래 규칙 문서를 기준으로 계획을 세운 뒤 승인을 받는다.

- Back-end 스캐폴딩 기준: `back-end/docs/backend/01-multi-module.md`, `gradle-multi-project-structure` 스킬
- Front-end 스캐폴딩 기준: `front-end/CLAUDE.md`의 URL Structure, `admin-nextjs-ui` 스킬

빌드 도구가 생기면 그 시점에 이 문서의 명령 섹션을 갱신한다.

## 하네스 submodule

`.ai-prompts`는 별도 저장소(`orn-chfotm/ai-prompts`)를 가리키는 git submodule이다.

Claude는 `.ai-prompts`를 더 이상 직접 import하지 않는다. AI 프로세스·기술 규칙의 실행 기준은 `.claude/rules/harness/` 사본이다. `.ai-prompts`는 다음 용도로만 남아 있다.

- Codex adapter(`AGENTS.md`)가 계속 라이브로 참조하는 원본
- `dir init` / `claude dir init` 등 프로젝트 스캐폴딩 예약 명령의 기준 문서
- 여러 프로젝트에 이식 가능한 하네스의 상류(upstream) 원본 — `.claude/rules/harness/`를 고친 뒤 다른 프로젝트에도 반영하고 싶으면 이 submodule 쪽에 별도로 반영한다

```bash
git submodule update --init --recursive   # 최초 clone 후
git submodule update --remote .ai-prompts # 하네스 최신화 (Codex/향후 이식용)
```

- `.ai-prompts/` 내부 파일은 이 프로젝트의 작업 산출물로 수정하지 않는다. `.claude/settings.json`의 `PreToolUse` 훅이 `.ai-prompts/` 내부 Edit/Write를 차단한다. 하네스 문서를 고쳐야 하면 별도 작업으로 분리한다.
- 프로젝트별 리뷰 로그를 `.ai-prompts/` 안에도, `.claude/rules/harness/` 안에도 누적하지 않는다. 리뷰 로그는 `.ai/reviews/<category>/`에 남긴다.
- `.claude/rules/harness/`와 `.ai-prompts/docs/`는 서로 다른 사본이다. AI 프로세스 규칙을 고치고 싶으면 어느 쪽을 기준으로 바꿀지 먼저 정하고, 필요하면 반대쪽에도 수동으로 반영한다(자동 동기화 없음).

# 규칙 계층 구조

규칙이 세 곳에 나뉘어 있고, **적용 범위가 다르다.**

| 위치 | 범위 | 성격 |
|---|---|---|
| `.claude/rules/harness/` | 전 작업 | AI 협업 프로세스(역할·승인·워크플로우) + naming/spring/javascript 공통 기술 규칙. `.ai-prompts/docs/`를 이관한 Claude용 사본, 이 프로젝트에서 실제로 적용되는 기준 |
| `.ai-prompts/docs/` | Codex, dir init | Codex adapter가 라이브로 참조하는 원본이자 이식 가능한 상류 하네스. Claude는 직접 import하지 않는다(`dir init` 계열 예약 명령 제외) |
| `.claude/rules/{backend,frontend}/`, `.claude/skills/` | 저장소 전역 | Opinion Brief 제품의 도메인·기술 룰 |
| `back-end/.claude/`, `front-end/.claude/` | 해당 디렉터리 하위 | 각 워크스페이스 전용 룰·스킬 (디렉터리 스코프) |

`back-end/` 또는 `front-end/` 아래 파일을 작업할 때는 **해당 디렉터리의 룰과 스킬이 우선**한다. 루트 `CLAUDE.md`도 "Back-end 작업을 지시받으면 `back-end/CLAUDE.md`를 먼저 읽는다"고 규정한다.

## 알려진 규칙 충돌

루트 `.claude/rules/`와 `back-end/` 규칙은 **같은 개념에 다른 이름·구조를 쓴다.** 두 곳이 다른 제품 정의에서 출발했기 때문이다.

| 항목 | `.claude/rules/backend/` (Opinion Brief) | `back-end/` (규정집 RAG) |
|---|---|---|
| API 모듈명 | `user-api`, `admin-api` | `api-user`, `api-admin` |
| 비즈니스 흐름 조합 위치 | `domain/service` | `api-*` service |
| 영속 포트 interface 위치 | `domain`에 포트, `infra/persistence`에 구현 | JPA repository를 `infra.persistence`에 두고 API service가 adapter 조합 |
| 외부 연동 | LLM 클라이언트 `infra` | `infra.ai`(Ollama/Spring AI), `infra.vectordb`(Elasticsearch) |

**둘을 섞어 쓰지 않는다.** `back-end/` 코드를 만들 때는 `back-end/` 규칙을, `.docs/prd/`의 Opinion Brief 도메인을 다룰 때는 루트 룰을 기준으로 삼는다. 어느 쪽을 따라야 할지 모호하면 임의로 고르지 말고 사용자에게 확인한다.

# 제품·아키텍처 개요

## 두 제품 라인

- **Opinion Brief** (`.docs/prd/opinion-brief-*.md`, 루트 `.claude/rules/`): 주제에 대한 대중 의견을 구조화 수집 → AI·신뢰점수로 저품질 응답 필터 → AE용 리포트로 판매. 핵심은 "투표 게시판"이 아니라 **품질 검수 파이프라인이 있는 리포트 생성 시스템**이다.
- **규정집 RAG 관리 도구** (`back-end/docs/`, `front-end/`): 규정 PDF 업로드 → 텍스트 추출 job → Elasticsearch vector 색인 → Ollama `qwen3:8b`로 근거 추적 가능한 답변. 관리자 화면은 `/policies`, `/prompts`, `/chat-test`.

## Back-end (`back-end/`)

Java/Spring, Gradle 멀티 모듈, DDD. APP DB PostgreSQL, Vector DB Elasticsearch, AI Ollama `qwen3:8b`, Gradle Groovy DSL.

```text
api-admin -> core, domain, infra    # 관리자 app server (별도 build/run, /api-admin/**)
api-user  -> core, domain, infra    # 사용자 app server (별도 build/run, /api-user/**)
infra     -> core, domain           # DB, S3/file, SMTP, Elasticsearch, Ollama
domain    -> core                   # DDD entity, VO, domain service. 외부 의존 없음
core      -> (no project dependency)
```

`domain`이 `infra`를 참조하지 않는 단방향 의존이 이 구조의 핵심 불변식이다. `api-member` 명칭은 쓰지 않는다.

## Front-end (`front-end/`)

Next.js App Router. 루트 룰(`.claude/rules/frontend/00-architecture.md`)은 FSD를 규정한다: `app → pages → widgets → features → entities → shared` 단방향 의존, slice는 `index.ts` public API로만 노출, deep import 금지.

## 왜 이 구조인가

여러 문서를 읽어야 보이는 설계 의도:

- **비동기 검수 파이프라인**: 응답 제출 API에서 LLM을 동기 호출하지 않는다. 저장 + job 등록까지만 하고, 검수 결과는 `ResponseReview`로 남긴다. FE는 제출 성공을 "유효 반영"이 아닌 "검수 중"으로 표시하고 폴링으로 갱신한다. (`.claude/rules/backend/02`, `frontend/04`)
- **리포트 = 스냅샷**: 생성 시점의 집계·요약을 고정 저장하고, 조회 시 재집계하지 않는다. 전달한 리포트가 이후 데이터 변경으로 흔들리면 안 되기 때문이다. (`backend/03`, `frontend/05`)
- **보상 = 원장**: 잔액 컬럼을 직접 증감하지 않고 `RewardLedger` 이벤트로 기록, 잔액은 합계로 도출한다. (`backend/04`)
- **슬롯 선점 후 제출**: 선착순 초과 모집을 막기 위해 원자적 조건부 UPDATE로 슬롯을 점유한 뒤에만 제출을 허용한다. (`backend/05`)
- **개인정보 버킷화**: 생년월일·상세주소 원본 대신 연령대·지역 버킷으로 저장하고, 리포트 원문은 마스킹한다. (`backend/06`)
