// ? PostToolUse: appends one line per Bash or file-write call to <project>/.claude/audit.log.
// ? Never blocks: it always exits 0, even when the log cannot be written.
// ? Runs on Node 24+ with native type stripping: erasable TypeScript only, no imports beyond node:*.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type ToolCall = {
	cwd?: string;
	tool_name?: string;
	tool_input?: {
		command?: string;
		file_path?: string;
		path?: string;
	};
};

try {
	const input: ToolCall = JSON.parse(readFileSync(0, "utf-8"));
	const toolInput = input.tool_input ?? {};
	const summary = (toolInput.command ?? toolInput.file_path ?? toolInput.path ?? "-").replaceAll("\n", " ").slice(0, 200);

	const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
	const logDir = join(projectDir, ".claude");
	mkdirSync(logDir, { recursive: true });
	appendFileSync(
		join(logDir, "audit.log"),
		`${new Date().toISOString()} | ${input.tool_name ?? "unknown"} | ${summary}\n`,
		"utf-8",
	);
} catch {
	// Logging must never interrupt the session.
}

process.exit(0);
