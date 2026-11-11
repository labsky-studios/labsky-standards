// ? PreToolUse(Bash): blocks commands the standard never lets an agent run.
// ? Reads the tool call as JSON on stdin. Exit 2 blocks (stderr goes back to Claude); exit 0 allows.
// ? Runs on Node 24+ with native type stripping: erasable TypeScript only, no imports beyond node:*.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type ToolCall = {
	cwd?: string;
	tool_input: {
		command?: string;
	};
};

const PROTECTED = /^(refs\/heads\/)?(main|staging|dev)$/;

function block(reason: string): never {
	process.stderr.write(`BLOCKED by the Labsky standard: ${reason}\n`);
	process.exit(2);
}

function currentBranch(cwd: string | undefined): string {
	try {
		return execFileSync("git", ["branch", "--show-current"], {
			cwd,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return "";
	}
}

function prBase(args: string[], cwd: string | undefined): string {
	try {
		return execFileSync("gh", ["pr", "view", ...args, "--json", "baseRefName", "-q", ".baseRefName"], {
			cwd,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return "";
	}
}

const input: ToolCall = JSON.parse(readFileSync(0, "utf-8"));
const command = input.tool_input.command ?? "";
const cwd = input.cwd;

// Each segment of a chained command is checked on its own.
const segments = command
	.split(/&&|\|\||;|\n/)
	.map((segment) => segment.trim())
	.filter(Boolean);

for (const segment of segments) {
	const words = segment.split(/\s+/);

	// ── Destructive filesystem operations ──────────────────────────────────────
	if (/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--no-preserve-root)\b/.test(segment)) {
		block("recursive forced deletions are not permitted. Delete the specific files, or ask a human.");
	}
	if (/\btruncate\s+(-s|--size)\s*0/.test(segment)) {
		block("destructive truncation is not permitted.");
	}

	// ── Git: protected branches ────────────────────────────────────────────────
	if (/^git\s+push\b/.test(segment)) {
		if (/\s(--force|-f)(\s|$)/.test(segment) || /\s\+\S+/.test(segment)) {
			block("force push is not permitted. Use --force-with-lease on your own feature branch if you must.");
		}
		const positional = words.slice(2).filter((word) => !word.startsWith("-"));
		const refspecs = positional.slice(1);
		const targets = refspecs.length > 0 ? refspecs.map((spec) => spec.split(":").pop() ?? spec) : [currentBranch(cwd)];
		if (targets.some((target) => PROTECTED.test(target))) {
			block("direct push to main, staging or dev is not permitted. Push a feature branch and open a PR.");
		}
	}

	if (/^git\s+(commit|merge|rebase|cherry-pick|revert)\b/.test(segment) && PROTECTED.test(currentBranch(cwd))) {
		block(`'${words[1]}' on a protected branch (${currentBranch(cwd)}) is not permitted. Work on a feature branch.`);
	}

	if (/^git\s+commit\b/.test(segment) && /\s(--no-verify|-n)(\s|$)/.test(segment)) {
		block("bypassing Husky hooks with --no-verify is not permitted.");
	}

	// ── GitHub: production is always merged by a human ─────────────────────────
	if (/^gh\s+pr\s+merge\b/.test(segment)) {
		const target = words.slice(3).filter((word) => !word.startsWith("-"));
		if (prBase(target, cwd) !== "dev") {
			block("agents only merge PRs into dev. staging and main are promoted by the CI bot and approved by a human.");
		}
	}

	// ── Deploys, remote data and secrets go through CI or a human ──────────────
	if (/\b(wrangler\s+(deploy|versions\s+deploy|pages\s+deploy)|opennextjs-cloudflare\s+deploy)\b/.test(segment)) {
		block("deploys run in CI (.github/workflows). Push a branch instead.");
	}
	if (/^pnpm\b.*\s(run\s+)?deploy(:[\w:-]+)?(\s|$)/.test(segment) || /\bNODE_ENV=production\b.*\bpayload\s+migrate\b/.test(segment)) {
		block("the project's deploy scripts and production migrations run in CI. Push a branch instead.");
	}
	if (/\bwrangler\s+d1\s+(migrations\s+apply|execute)\b/.test(segment) && /--remote\b/.test(segment)) {
		block("remote D1 migrations and queries run in CI or by a human, never from an agent session.");
	}
	if (/\bwrangler\s+(secret|r2\s+bucket\s+delete|d1\s+delete|delete)\b/.test(segment)) {
		block("secrets and destructive Cloudflare operations are handled by a human.");
	}

	// ── Package management ─────────────────────────────────────────────────────
	if (/^(npm\s+(install|i|add|ci)\b|yarn(\s|$)|npx\s)/.test(segment)) {
		block("only pnpm is permitted. Use pnpm install, pnpm add -D or pnpm dlx.");
	}
	if (/^pnpm\s+add\b/.test(segment) && !/\s(-D|--save-dev)(\s|$)/.test(segment)) {
		block(
			"adding a runtime dependency needs a human to confirm it belongs to the approved stack. Use pnpm add -D for dev dependencies.",
		);
	}

	// ── Secrets ────────────────────────────────────────────────────────────────
	if (/(AUTH_TOKEN|API_KEY|SECRET|PASSWORD|PRIVATE_KEY)\s*=\s*["']?[^"'\s$]{8,}/i.test(segment)) {
		block("a literal secret was detected in the command. Read it from the environment instead.");
	}

	// ── Critical config files edited through the shell ─────────────────────────
	if (
		/(tsconfig\.json|biome\.json|vite\.config\.(ts|js)|package\.json|wrangler\.jsonc?)/.test(segment) &&
		/\bsed\s+-i|\bawk\b.*>/.test(segment)
	) {
		block("edit critical config files with the Edit tool, not shell rewrites.");
	}
}

process.exit(0);
