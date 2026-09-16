---
description: 규정집 RAG에서 Spring AI와 Ollama qwen3:8b를 연동하고 markdown system prompt와 Elasticsearch context를 주입할 때 사용한다. OpenAI 기반 사용자 의견 검수에는 적용하지 않는다.
paths:
  - "back-end/**/*"
---

# 스킬: Spring AI Ollama 연동

백엔드에서 Spring AI와 Ollama `qwen3:8b`를 연동할 때 따르는 절차.

사용자 의견 검수는 [spring-ai-opinion-review](../../../../.claude/skills/spring-ai-opinion-review/SKILL.md)를 사용한다. 아래 Ollama·RAG 기본값은 규정집 작업에만 적용한다.

## 규칙

- AI 모델명은 설정 파일에서 관리한다.
- 기본 모델은 Ollama `qwen3:8b`를 사용한다.
- Prompt markdown은 resources에서 읽어 system prompt로 주입한다.
- LLM 호출 adapter는 `infra.ai`에 둔다.
- Domain service는 AI 구현체가 아니라 port/interface에 의존한다.
- RAG context는 Elasticsearch vector 검색 결과를 사용해 주입한다.
- Elasticsearch 연동은 `infra.vectordb` adapter에 둔다.
- 검색 결과가 비어 있으면 일반 지식으로 답변하지 않는다.
- Chat 처리는 async job 기반으로 설계한다.

## 권장 설정 키

```yaml
app:
  ai:
    provider: ollama
    model: qwen3:8b
    prompt-path: classpath:prompts/default-chat-system-prompt.md
  vector-db:
    provider: elasticsearch
```
