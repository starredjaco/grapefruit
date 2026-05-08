import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

import env from "../lib/env.ts";
import type { Manifest } from "./protocol.ts";

const VERSION = 1;

function cleanLabel(label: string): string {
  return label.replace(/[^A-Za-z0-9_.-]/g, "_") || "default";
}

function userKey(): string {
  if (process.platform !== "win32" && process.getuid) {
    return String(process.getuid());
  }

  const user = os.userInfo().username || process.env.USERNAME || "user";
  return createHash("sha256").update(user).digest("hex").slice(0, 12);
}

export function paths(label = "default") {
  const name = cleanLabel(label);
  const user = userKey();
  const dir = path.join(os.tmpdir(), `igf-${user}`, name);
  const pipe = `\\\\.\\pipe\\igf-${user}-${name}`;
  const sock = path.join(dir, "igfd.sock");
  const endpoint = process.platform === "win32" ? pipe : sock;

  return {
    label: name,
    dir,
    endpoint,
    manifest: path.join(dir, "igfd.json"),
    pid: path.join(dir, "igfd.pid"),
    sock,
  };
}

export async function writeManifest(label = "default"): Promise<Manifest> {
  const p = paths(label);
  await fs.mkdir(p.dir, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") {
    await fs.chmod(p.dir, 0o700).catch(() => {});
  }

  const manifest: Manifest = {
    version: VERSION,
    pid: process.pid,
    endpoint: p.endpoint,
    label: p.label,
    project: env.workdir,
    startedAt: Date.now(),
  };

  await fs.writeFile(p.pid, `${process.pid}\n`, "utf8");
  const tmp = `${p.manifest}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(manifest, null, 2), "utf8");
  await fs.rename(tmp, p.manifest);

  return manifest;
}

export async function readManifest(label = "default"): Promise<Manifest | null> {
  try {
    const text = await fs.readFile(paths(label).manifest, "utf8");
    const manifest = JSON.parse(text) as Manifest;
    if (manifest.version !== VERSION) return null;
    return manifest;
  } catch {
    return null;
  }
}

export async function stale(label = "default") {
  const p = paths(label);
  await Promise.all([
    fs.rm(p.manifest, { force: true }),
    fs.rm(p.pid, { force: true }),
    process.platform === "win32" ? Promise.resolve() : fs.rm(p.sock, { force: true }),
  ]);
}
