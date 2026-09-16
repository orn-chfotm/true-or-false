---
description: 리뷰 중 발견한 error/critical/improvement 또는 AI 설계·피드백·개선점을 .ai/reviews/에 기록한다
argument-hint: "[기록할 내용]"
---

# /review-log

이 명령은 지정된 리뷰 내용을 프로젝트 리뷰 로그로 기록하는 진입점이다.

# 연관 관계

- 리뷰 로깅 참조: @.claude/rules/harness/10-review-logging.md

# 실행 절차

`.claude/rules/harness/10-review-logging.md` 기준에 따라 다음 내용을 리뷰 로그로 기록하라: $ARGUMENTS

- 기록 전에 심각도(error/critical/improvement)와 분류(audit/feature/design/feedback)를 먼저 판단해 사용자에게 확인받는다.
- 파일 경로는 `.ai/reviews/<category>/YYYY-MM-DD-{slug}.md` 또는 `.ai/reviews/<category>/<task-id>.md` 형식을 따른다.

# [금지사항]

- critical 항목은 기록 후에도 사용자 승인 없이 resolved로 처리하지 않는다.
