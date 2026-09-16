---
description: 승인된 PM/CTO 방향으로 PL 개발 계획(작업 경계, 재사용성, PA 분리, 검증 기준)을 작성한다
argument-hint: "[계획 대상, 비우면 직전 승인된 PM/CTO 내용]"
---

# /pl-plan

이 명령은 승인된 PM/CTO 방향을 PL 개발 계획으로 작성하도록 호출하는 진입점이다.

# 연관 관계

- PL 역할 참조: @.claude/rules/harness/roles/03-pl.md
- 작업 분리 기준 참조: @.claude/rules/harness/03-task-splitting.md

# 실행 절차

`pl` subagent(Agent tool, subagent_type: "pl")를 사용해 다음 대상에 대한 PL 개발 계획을 작성하라: $ARGUMENTS

대상이 비어 있으면 직전에 사용자가 승인한 PM 계획/CTO 검토를 기준으로 한다. 산출물은 `.claude/rules/harness/roles/03-pl.md` 형식을 따르고, PA 작업 분리가 필요하면 `.claude/rules/harness/03-task-splitting.md`의 작업 카드 형식을 함께 제시한다.

이 단계에서는 개발 계획을 작성한다. 계획을 제출한 뒤 사용자 승인을 기다린다.

# [금지사항]

- 사용자 승인 전에는 subagent가 Edit/Write/Bash로 실제 파일을 변경하지 않도록 명시한다.
- 사용자 승인 없이 PA 실행으로 자동 진행하지 않는다.
