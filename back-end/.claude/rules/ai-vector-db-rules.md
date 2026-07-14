# AI 및 Vector DB 규칙

이 규칙은 AI 연동, RAG 검색, Vector DB 연동 작업에 적용한다.

## AI 모델

- AI 모델은 Ollama `qwen3:8b`를 사용한다.
- Spring AI를 통해 Ollama와 연동한다.
- AI 모델명은 설정 파일에서 관리한다.
- LLM 호출 구현체는 `infra.ai`에 둔다.
- Domain service와 API layer는 Ollama 구현체에 직접 의존하지 않는다.

## Vector DB

- Vector DB는 Elasticsearch를 사용한다.
- Elasticsearch 연동 구현체는 `infra.vectordb`에 둔다.
- RAG context는 Elasticsearch vector 검색 결과를 사용해 구성한다.
- Vector 문서 metadata에는 추적 가능한 규정 문서 식별자를 포함한다.
- API layer는 Elasticsearch client나 query 구현 세부사항을 직접 알면 안 된다.

## 응답 안전성

- Elasticsearch 검색 결과가 비어 있거나 근거가 부족하면 일반 지식으로 답변하지 않는다.
- 답변에는 가능한 경우 규정 코드, 문서 버전, 문서 ID, chunk ID 같은 근거 추적 정보를 포함한다.
