import { spawnSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const bun = process.execPath;

function run(cmd: string[], cwd = root) {
  const [command, ...args] = cmd;
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status) {
    throw new Error(`${cmd.join(" ")} exited with code ${result.status}`);
  }
}

function tool(name: string) {
  const resolved =
    Bun.which(process.platform === "win32" ? `${name}.exe` : name) ??
    Bun.which(name);
  if (resolved) return resolved;

  throw new Error(`Unable to find ${name} on PATH`);
}

function prebuild(pkg: string) {
  run(
    [
      tool("node"),
      join(root, "node_modules", "prebuild-install", "bin.js"),
      "-r",
      "napi",
    ],
    join(root, "node_modules", pkg),
  );
}

// ensure submodules are initialized
run(["git", "submodule", "update", "--init", "--recursive"]);

// all workspace dependencies
run([bun, "install"]);
prebuild("frida");
prebuild("frida16");
run([bun, "install"], join(root, "agent"));
run([bun, "install"], join(root, "gui"));

// radare2 WASM runtime
run([bun, "scripts/fetch-r2-wasm.ts"]);

// r2hermes WASM (hbc decompiler)
const wasmDist = "externals/radare/r2hermes.wasm/dist";
const hbc = join(root, "externals", "radare", "r2hermes.wasm");
try {
  run([bun, "run", "setup"], hbc);
  run([bun, "run", "build"], hbc);
  await mkdir(join(root, "gui", "public"), { recursive: true });
  await copyFile(
    join(root, wasmDist, "hbc.wasm"),
    join(root, "gui", "public", "hbc.wasm"),
  );
} catch {
  console.warn("\nwasi-sdk not available — skipping r2hermes WASM build.");
  console.warn("The HBC decompiler will not work until you build it:");
  console.warn("  cd externals/radare/r2hermes.wasm && bun run setup && bun run build\n");
}
