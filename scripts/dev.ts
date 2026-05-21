import { join } from "node:path";
import { $ } from "bun";

const root = join(import.meta.dirname, "..");
const agent = join(root, "agent");
const gui = join(root, "gui");

const mode = process.argv[2]; // "all" or "both"
process.env.NODE_ENV = "development";
const env = { ...process.env };

type Pane = {
  name: string;
  cwd: string;
  cmd: string[];
};

const serverPanes: Pane[] = [
  { name: "server", cwd: root, cmd: [process.execPath, "run", "dev"] },
  { name: "gui", cwd: gui, cmd: [process.execPath, "run", "dev"] },
];

const agentPanes: Pane[] = [
  {
    name: "fruity",
    cwd: agent,
    cmd: [process.execPath, "run", "build:fruity", "--", "--watch"],
  },
  {
    name: "droid",
    cwd: agent,
    cmd: [process.execPath, "run", "build:droid", "--", "--watch"],
  },
  {
    name: "transport",
    cwd: agent,
    cmd: [process.execPath, "run", "build:transport", "--", "--watch"],
  },
];

const panes = mode === "both" ? serverPanes : [...agentPanes, ...serverPanes];

async function both() {
  await $`tmux \
    new-session  -c ${root}  bun run dev \; \
    split-window -h -c ${gui} bun run dev \; \
    select-pane -t 0`;
}

async function all() {
  await $`tmux \
    new-session  -c ${agent} bun run build:fruity -- --watch \; \
    split-window -h -c ${agent} bun run build:droid -- --watch \; \
    split-window -h -c ${agent} bun run build:transport -- --watch \; \
    select-layout even-horizontal \; \
    new-window   -c ${root}  bun run dev \; \
    split-window -h -c ${gui} bun run dev \; \
    select-pane -t 0`;
}

function wt(panes: Pane[]) {
  const wt = Bun.which("wt.exe") ?? Bun.which("wt");
  if (!wt) return false;

  const [first, ...rest] = panes;
  const argv = ["-d", first.cwd, ...first.cmd];
  for (const { cwd, cmd } of rest) {
    argv.push(";", "new-tab", "-d", cwd, ...cmd);
  }
  Bun.spawn([wt, ...argv], { env }).unref();
  return true;
}

async function local(panes: Pane[]) {
  console.log("No terminal multiplexer found; running dev processes here.");
  const procs = panes.map((pane) => {
    console.log(`[${pane.name}] ${pane.cmd.join(" ")}`);
    return {
      pane,
      proc: Bun.spawn(pane.cmd, {
        cwd: pane.cwd,
        env,
        stdin: "ignore",
        stdout: "inherit",
        stderr: "inherit",
      }),
    };
  });

  const stop = () => {
    for (const { proc } of procs) proc.kill();
  };

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      stop();
      process.exit(sig === "SIGINT" ? 130 : 143);
    });
  }

  const first = await Promise.race(
    procs.map(async ({ pane, proc }) => ({ pane, code: await proc.exited })),
  );

  stop();
  process.exitCode = first.code;
  console.error(`[${first.pane.name}] exited with code ${first.code}`);
}

if (process.platform === "win32") {
  if (!wt(panes)) await local(panes);
} else if (mode === "both") {
  if (Bun.which("tmux")) await both();
  else await local(panes);
} else {
  if (Bun.which("tmux")) await all();
  else await local(panes);
}
