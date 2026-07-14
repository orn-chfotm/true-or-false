@.ai-prompts/CLAUDE.md

# 프로젝트 규칙

## Claude Adapter Boundary

- `.claude/rules/`는 프로젝트 공통 정책이면 커밋한다.
- `.claude/skills/`는 프로젝트 공통 절차이면 커밋한다.
- `.claude/settings.json`은 공유 가능한 기본값만 둔다.
- `.claude/settings.local.json`은 개인 로컬 설정이므로 커밋하지 않는다.
- `.claude/agents/`는 역할이 팀 공통으로 합의된 경우에만 둔다.

## Back-end

Back-end 작업을 지시받으면 `back-end/CLAUDE.md`를 먼저 읽고, 그 안에서 연결된 상세 md 규칙을 따른다.

@back-end/CLAUDE.md

## Front-end

Front-end 작업을 지시받으면 `front-end/CLAUDE.md`를 먼저 읽고, 그 안에서 연결된 상세 md 규칙을 따른다.

@front-end/CLAUDE.md
