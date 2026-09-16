#!/usr/bin/env node
// PreToolUse 훅: .ai-prompts/ 내부 파일에 대한 Edit/Write/NotebookEdit을 차단한다.
// 근거: .claude/rules/harness/10-review-logging.md, CLAUDE.md "하네스 submodule" 절의
// "`.ai-prompts/` 내부 파일은 이 프로젝트의 작업 산출물로 수정하지 않는다" 규칙을
// 프롬프트 준수가 아니라 harness 레벨에서 강제한다.

let raw = "";
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // 입력을 파싱할 수 없으면 차단하지 않는다.
  }

  const filePath = input?.tool_input?.file_path || "";
  const normalized = String(filePath).replace(/\\/g, "/");

  const isAiPrompts =
    normalized === ".ai-prompts" ||
    normalized.startsWith(".ai-prompts/") ||
    normalized.includes("/.ai-prompts/");

  if (isAiPrompts) {
    process.stderr.write(
      ".ai-prompts는 별도 git submodule(하네스 원본)이라 이 프로젝트의 작업 산출물로 수정하지 않습니다.\n" +
        "하네스 문서를 고쳐야 하면 별도 작업으로 분리하거나, Claude용 사본인 .claude/rules/harness/ 쪽을 수정하세요.\n"
    );
    process.exit(2); // exit 2 = 도구 호출 차단, stderr가 Claude에게 피드백으로 전달됨
  }

  process.exit(0);
});
