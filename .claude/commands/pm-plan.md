---
description: PM 계획을 작성한다 (목표/범위/비범위/산출물/승인 지점 정리)
argument-hint: "[정리할 요청 내용]"
---

# /pm-plan

이 명령은 사용자 요청을 PM 계획으로 정리하도록 호출하고 결과를 보고하는 진입점이다.

# 연관 관계

- PM 역할 참조: @.claude/rules/harness/roles/01-pm.md
- 출력 형식 참조: @.claude/rules/harness/11-output-format.md

# 실행 절차

`pm` subagent(Agent tool, subagent_type: "pm")를 사용해 다음 요청에 대한 PM 계획을 작성하라: $ARGUMENTS

대상이 비어 있으면 지금까지의 대화에서 사용자가 요청한 작업을 대상으로 한다.

`.claude/rules/harness/roles/01-pm.md`의 "PM 검토 깊이" 기준에 해당하지 않는 단순 작업이면, subagent를 호출하지 않고 `.claude/rules/harness/11-output-format.md`의 "간소화 보고" 형식으로 직접 답한다.

PM 계획을 제출한 뒤 사용자 승인을 기다린다.

# [금지사항]

- 사용자 승인 없이 `/cto-review`나 `/pl-plan`으로 자동 진행하지 않는다.
