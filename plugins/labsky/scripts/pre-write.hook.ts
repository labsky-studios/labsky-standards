// ? PreToolUse(Write|Edit|MultiEdit): blocks writes to files that are secret, generated or immutable.
// ? Exit 2 blocks (stderr goes back to Claude); exit 0 allows.
// ? Runs on Node 24+ with native type stripping: erasable TypeScript only, no imports beyond node:*.

import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";

type ToolCall = {
	cwd?: string;
	tool_name: string;
	tool_input: {
		file_path?: string;
		path?: string;
	};
};

function block(reason: string): never {
	process.stderr.write(`BLOCKED by the Labsky standard: ${reason}\n`);
	process.exit(2);
}

const input: ToolCall = JSON.parse(readFileSync(0, "utf-8"));
const rawPath = input.tool_input.file_path ?? input.tool_input.path ?? "";
if (!rawPath) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const absolutePath = isAbsolute(rawPath) ? rawPath : resolve(projectDir, rawPath);
const projectPath = relative(projectDir, absolutePath).replaceAll("\\", "/");

// Files outside the project (plans, memory, scratch space) are not governed by the project standard.
if (projectPath.startsWith("..") || isAbsolute(projectPath)) process.exit(0);

const name = basename(projectPath);

// ── Secrets ──────────────────────────────────────────────────────────────────
if (/^\.env(\..+)?$/.test(name) && !/\.example$/.test(name)) {
	block(`'${projectPath}' holds secrets. Document the variable in .env.example and ask a human to set the value.`);
}
if (/^\.dev\.vars(\..+)?$/.test(name)) {
	block(`'${projectPath}' holds Worker secrets for local development. Ask a human to set the value.`);
}

// ── Version control internals ────────────────────────────────────────────────
if (projectPath === ".git" || projectPath.startsWith(".git/")) {
	block("files under .git/ are managed by git.");
}

// ── Generated files: edit their source and regenerate instead ────────────────
const generated: [RegExp, string][] = [
	[/(^|\/)routeTree\.gen\.ts$/, "TanStack Router generates it on dev/build"],
	[/(^|\/)payload-types\.ts$/, "Payload generates it with `payload generate:types`"],
	[/(^|\/)types\/generated\//, "Strapi generates these types"],
	[/(^|\/)(worker-configuration|cloudflare-env)\.d\.ts$/, "`wrangler types` generates it"],
	[/(^|\/)\(payload\)\/admin\/importMap\.js$/, "Payload generates the admin import map"],
	[/(^|\/)pnpm-lock\.yaml$/, "pnpm writes the lockfile; run pnpm install"],
];
for (const [pattern, why] of generated) {
	if (pattern.test(projectPath)) block(`'${projectPath}' is generated: ${why}.`);
}

// ── Migrations are immutable once they exist ─────────────────────────────────
if (/(^|\/)migrations\//.test(projectPath) && existsSync(absolutePath)) {
	block(
		`'${projectPath}' is an existing migration. Migrations that may have run are never edited: create a new one ` +
			"(for Payload: pnpm exec payload migrate:create <name>).",
	);
}

process.exit(0);
