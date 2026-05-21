#! /usr/bin/env bun

import path from "node:path";
import { $ } from "bun";

const fridaModules = ["frida", "frida16"];

const bunTargets: Record<string, [string, string]> = {
  "bun-linux-x64": ["linux", "x64"],
  // "bun-linux-arm64": ["linux", "arm64"],
  "bun-windows-x64": ["win32", "x64"],
  "bun-darwin-x64": ["darwin", "x64"],
  "bun-darwin-arm64": ["darwin", "arm64"],
  // "bun-linux-x64-musl": ["linux", "x64"],
  // "bun-linux-arm64-musl": ["linux", "arm64"],
};

const root = path.join(import.meta.dirname, "..");

function tool(name: string) {
  const resolved =
    Bun.which(process.platform === "win32" ? `${name}.exe` : name) ??
    Bun.which(name);
  if (resolved) return resolved;
  throw new Error(`Unable to find ${name} on PATH`);
}

async function prebuild(
  cwd: string,
  platform: string = process.platform,
  arch: string = process.arch,
) {
  console.log("prebuild", cwd, "for", platform, arch);
  const prebuild = path.join(root, "node_modules", "prebuild-install", "bin.js");
  await $`${tool("node")} ${prebuild} -r napi --arch ${arch} --platform ${platform}`.cwd(
    cwd,
  );
}

async function bunBuild(target?: string) {
  const name = target ? target.replace("bun-", "igf-") : "igf";
  const targetArgs: string[] = [];

  if (target) {
    console.log("build bun binary for:", target);
    targetArgs.push("--target");
    targetArgs.push(target);
  }

  await $`${process.execPath} build ${targetArgs} ${path.join(root, "src", "bin.ts")} ${path.join(root, "assets.tgz")} --compile --outfile ${path.join(root, "build", "Release", name)}`;
}

async function assets() {
  await $`${tool("tar")} cvf ${path.join(root, "assets.tgz")} -C ${root} gui/dist agent/dist drizzle skills`;
}

async function main() {
  console.warn("this script is experimental and not well tested");

  const mode = process.argv[2] ?? "current";
  const cross = mode === "cross";

  if (!["current", "cross"].includes(mode)) {
    console.error("Usage: bun scripts/cross-build.ts [current|cross]");
    process.exit(1);
  }

  await $`${process.execPath} ${path.join(root, "scripts", "fetch-r2-wasm.ts")}`;
  await assets();

  if (cross) {
    for (const [target, [platform, arch]] of Object.entries(bunTargets)) {
      for (const name of fridaModules) {
        const cwd = path.join(root, "node_modules", name);
        await prebuild(cwd, platform, arch);
      }
      await bunBuild(target);
    }

    // Restore prebuilds for host platform
    for (const name of fridaModules) {
      const cwd = path.join(root, "node_modules", name);
      await prebuild(cwd);
    }
  } else {
    for (const name of fridaModules) {
      const cwd = path.join(root, "node_modules", name);
      await prebuild(cwd);
    }
    await bunBuild();
  }
}

main();
