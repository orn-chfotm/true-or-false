---
description: 승인된 PM 계획(또는 PL이 올린 기술 쟁점)을 CTO 관점에서 기술 검토한다
argument-hint: "[검토 대상, 비우면 직전 승인된 PM 계획]"
---

# /cto-review

이 명령은 승인된 계획 또는 기술 쟁점을 CTO 검토로 전달하는 진입점이다.

# 연관 관계

- CTO 역할 참조: @.claude/rules/harness/roles/02-cto.md

# 실행 절차

`cto` subagent(Agent tool, subagent_type: "cto")를 사용해 다음 대상을 기술 검토하라: $ARGUMENTS

대상이 비어 있으면 직전에 사용자가 승인한 PM 계획, 또는 PL이 제기한 기술 쟁점을 대상으로 한다. 산출물은 `.claude/rules/harness/roles/02-cto.md`의 형식을 따른다.

검토 결과를 제출한 뒤 사용자 승인을 기다린다.

# [금지사항]

- 사용자 승인 없이 `/pl-plan`으로 자동 진행하지 않는다.
