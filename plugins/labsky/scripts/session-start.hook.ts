// ? SessionStart: loads the Labsky standard's index into the session, with absolute paths to its docs.
// ? A plugin cannot ship a CLAUDE.md, so this hook is what makes every session start from the standard.
// ? Runs on Node 24+ with native type stripping: erasable TypeScript only, no imports beyond node:*.

import { readFileSync } from "node:fs";
import { join } from "node:path";

try {
	const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? "";
	const docsDir = join(pluginRoot, "docs").replaceAll("\\", "/");
	const index = readFileSync(join(pluginRoot, "docs", "INDEX.md"), "utf-8").replaceAll("{{DOCS}}", docsDir);

	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "SessionStart",
				additionalContext: index,
			},
		}),
	);
} catch {
	// Without the index the session still works; the agents read the docs by path.
}

process.exit(0);
