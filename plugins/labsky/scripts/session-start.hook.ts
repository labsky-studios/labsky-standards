// ? SessionStart: what every session of a Labsky project starts from.
// ?   1. The standard's index, with absolute paths to its docs (a plugin cannot ship a CLAUDE.md).
// ?   2. The client's and the project's memory from labsky-vault, when the project's CLAUDE.md names them.
// ?   3. A live map of the project's packages and features, so agents navigate without listing folders.
// ? Never blocks and never fails the session: every part is optional and degrades to a one-line note.
// ? Runs on Node 24+ with native type stripping: erasable TypeScript only, no imports beyond node:*.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const VAULT_REPO = "labsky-studios/labsky-vault";
const MAP_MAX_LINES = 40;

type HookInput = { cwd?: string };

function readInput(): HookInput {
	try {
		return JSON.parse(readFileSync(0, "utf-8"));
	} catch {
		return {};
	}
}

function standardIndex(): string {
	const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? "";
	const docsDir = join(pluginRoot, "docs").replaceAll("\\", "/");
	return readFileSync(join(pluginRoot, "docs", "INDEX.md"), "utf-8").replaceAll("{{DOCS}}", docsDir);
}

// ── Project memory ───────────────────────────────────────────────────────────

function projectField(claudeMd: string, field: string): string | undefined {
	const match = claudeMd.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*\`?([^\`\\s]+)\`?`));
	return match?.[1];
}

/** A vault file, from the local clone when LABSKY_VAULT_DIR is set, otherwise through `gh api`. */
function vaultFile(path: string): { text: string; where: string } | undefined {
	const localDir = process.env.LABSKY_VAULT_DIR;
	if (localDir) {
		const file = join(localDir, path);
		if (existsSync(file)) return { text: readFileSync(file, "utf-8"), where: file.replaceAll("\\", "/") };
		return undefined;
	}
	try {
		const text = execFileSync(
			"gh",
			["api", `repos/${VAULT_REPO}/contents/${path}`, "-H", "Accept: application/vnd.github.raw"],
			{ encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], timeout: 8000 },
		);
		return { text, where: `${VAULT_REPO}/${path}` };
	} catch {
		return undefined;
	}
}

function projectMemory(projectDir: string): string | undefined {
	const claudeMdPath = join(projectDir, "CLAUDE.md");
	if (!existsSync(claudeMdPath)) return undefined;
	const claudeMd = readFileSync(claudeMdPath, "utf-8");
	const client = projectField(claudeMd, "Client");
	const memory = projectField(claudeMd, "Memory");
	if (!client && !memory) return undefined;

	const paths = [client ? `clients/${client}/INDEX.md` : undefined, memory ? `${memory.replace(/\/$/, "")}/INDEX.md` : undefined]
		.filter((path): path is string => Boolean(path))
		.filter((path, index, all) => all.indexOf(path) === index);

	const loaded = paths.map((path) => ({ path, file: vaultFile(path) }));
	const found = loaded.filter((entry) => entry.file);
	const source = process.env.LABSKY_VAULT_DIR
		? `the local vault clone at ${process.env.LABSKY_VAULT_DIR.replaceAll("\\", "/")}`
		: `GitHub (\`gh api repos/${VAULT_REPO}/contents/<path> -H 'Accept: application/vnd.github.raw'\`)`;

	if (found.length === 0) {
		return `## Project memory\n\nThis project's memory lives in \`${VAULT_REPO}\` (${paths.join(", ")}), but it could not be read from ${source}. Ask the user before assuming any business, brand or product fact.`;
	}

	const sections = found.map((entry) => `### ${entry.path}\n\n${entry.file?.text.trim()}\n`);
	const missing = loaded.filter((entry) => !entry.file).map((entry) => entry.path);
	return [
		"## Project memory",
		"",
		`Business decisions, brand, product and content rules for this project, from \`${VAULT_REPO}\` (read through ${source}). They bind like the project's CLAUDE.md. Read the files they link only when the task needs them. Record new business or brand decisions with \`/labsky:decide\`, never in auto memory.`,
		"",
		...sections,
		...(missing.length > 0 ? ["", `Not found in the vault: ${missing.join(", ")}.`] : []),
	].join("\n");
}

// ── Code map ─────────────────────────────────────────────────────────────────

function dirs(path: string): string[] {
	try {
		return readdirSync(path)
			.filter((name) => !name.startsWith(".") && name !== "node_modules" && statSync(join(path, name)).isDirectory())
			.sort();
	} catch {
		return [];
	}
}

function files(path: string, suffix: RegExp): string[] {
	try {
		return readdirSync(path)
			.filter((name) => suffix.test(name))
			.map((name) => name.replace(suffix, ""))
			.sort();
	} catch {
		return [];
	}
}

function packageMap(root: string, label: string): string[] {
	const lines: string[] = [];
	const src = join(root, "src");
	const features = dirs(join(src, "features"));
	if (features.length > 0) {
		lines.push(`- ${label}src/features/`);
		for (const feature of features) lines.push(`  - ${feature}: ${dirs(join(src, "features", feature)).join(", ") || "(flat)"}`);
	}
	const routes = existsSync(join(src, "routes")) ? readdirSync(join(src, "routes")).filter((name) => !name.startsWith(".")) : [];
	if (routes.length > 0) lines.push(`- ${label}src/routes/: ${routes.sort().join(", ")}`);
	for (const [folder, suffix] of [
		["collections", /\.collection\.ts$/],
		["globals", /\.global\.ts$/],
		["endpoints", /\.endpoint\.ts$/],
		["db/schema", /\.table\.ts$/],
	] as const) {
		const names = files(join(src, folder), suffix);
		if (names.length > 0) lines.push(`- ${label}src/${folder}/: ${names.join(", ")}`);
	}
	const other = dirs(src).filter((name) => !["features", "routes", "collections", "globals", "endpoints", "db", "app"].includes(name));
	if (other.length > 0) lines.push(`- ${label}src/: ${other.map((name) => `${name}/`).join(", ")}`);
	return lines;
}

function codeMap(projectDir: string): string | undefined {
	if (!existsSync(join(projectDir, "package.json"))) return undefined;
	const packages: { root: string; label: string }[] = [{ root: projectDir, label: "" }];
	for (const name of dirs(projectDir)) {
		if (existsSync(join(projectDir, name, "package.json"))) packages.push({ root: join(projectDir, name), label: `${name}/` });
		for (const group of ["apps", "packages"]) {
			if (name === group) {
				for (const sub of dirs(join(projectDir, name))) {
					if (existsSync(join(projectDir, name, sub, "package.json"))) packages.push({ root: join(projectDir, name, sub), label: `${name}/${sub}/` });
				}
			}
		}
	}

	const lines: string[] = [];
	for (const pkg of packages) lines.push(...packageMap(pkg.root, pkg.label));
	if (lines.length === 0) return undefined;
	const shown = lines.slice(0, MAP_MAX_LINES);
	if (lines.length > shown.length) shown.push(`- … ${lines.length - shown.length} more lines; list the folders you need.`);
	const packageList = packages.map((pkg) => (pkg.label ? pkg.label.replace(/\/$/, "") : `${basename(projectDir)} (root)`)).join(", ");
	return ["## Code map", "", `Generated at session start. Packages: ${packageList}.`, "", ...shown].join("\n");
}

// ── Output ───────────────────────────────────────────────────────────────────

const input = readInput();
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const parts: string[] = [];

for (const part of [standardIndex, () => projectMemory(projectDir), () => codeMap(projectDir)]) {
	try {
		const text = part();
		if (text) parts.push(text);
	} catch {
		// Each part is optional; the session works without it.
	}
}

if (parts.length > 0) {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "SessionStart",
				additionalContext: parts.join("\n\n---\n\n"),
			},
		}),
	);
}

process.exit(0);
