---
description: 사용자가 승인한 작업 단위를 PA로 실행한다 (승인 없이 사용하지 않는다)
argument-hint: "[승인된 작업 단위]"
---

# /pa-run

이 명령은 사용자가 승인한 작업 단위를 PA에게 전달하고 실행 결과를 보고하는 진입점이다.

# 연관 관계

- PA 역할 참조: @.claude/rules/harness/roles/04-pa.md
- 오류 처리 참조: @.claude/rules/harness/09-error-handling.md

# 실행 전 확인

- 사용자가 해당 작업을 명시적으로 승인했는지 확인한다. 승인이 없으면 먼저 승인을 요청한다.
- 작업 범위가 `.claude/rules/harness/roles/04-pa.md`의 PA 작업 경계 안에 있는지 확인한다.

# 실행과 보고

승인이 확인되면 `pa` subagent(Agent tool, subagent_type: "pa")를 사용한다. 완료 후 `.claude/rules/harness/roles/04-pa.md`의 "PA 실행 결과" 형식으로 보고한다.

# [금지사항]

- 사용자 승인이 없으면 subagent를 호출하지 않는다.
- subagent가 작업 범위를 직접 확장하게 하지 않는다. 범위 밖 변경이 필요하면 `.claude/rules/harness/09-error-handling.md`의 절차에 따라 에스컬레이션하도록 지시한다.
