import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";

function skillsDir(): string {
  let dir = import.meta.dirname ?? process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, "skills");
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return "";
}

function skills(dir: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!dir || !fs.existsSync(dir)) return result;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dir, entry.name, "SKILL.md");
    if (fs.existsSync(file)) result.set(entry.name, fs.readFileSync(file, "utf8"));
  }

  return result;
}

function write(target: string, name: string, content: string): string {
  const dir = path.join(target, name);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, "SKILL.md");
  fs.writeFileSync(dest, content, "utf8");
  return dest;
}

export async function run(argv: string[]) {
  const args = parseArgs({
    args: argv,
    options: {
      global: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (args.values.help) {
    console.log(`
igf setup - Install Claude Code skills

Usage:
  igf setup [options]

Installs /igf and /mastg skills for Claude Code into the current
project's .claude/skills/ directory.

Options:
  --global    Install to ~/.claude/skills/ (available in all projects)
  -h, --help  Show this help
`);
    process.exit(0);
  }

  const found = skills(skillsDir());
  if (found.size === 0) {
    console.error("Error: No skills found. The igf installation may be incomplete.");
    process.exit(1);
  }

  const home = process.env.HOME || process.env.USERPROFILE || "";
  const target = args.values.global
    ? path.join(home, ".claude", "skills")
    : path.join(process.cwd(), ".claude", "skills");
  const label = args.values.global ? "~/.claude/skills" : ".claude/skills";

  for (const [name, content] of found) {
    const dest = write(target, name, content);
    console.log(`  /${name} -> ${dest}`);
  }

  console.log(`\n${found.size} skill(s) installed to ${label}`);
  console.log("Use /igf and /mastg in Claude Code.");
}
