import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { paths, readManifest, stale } from "./run.ts";
import { stringify, type Request, type Response } from "./protocol.ts";

type Params = Omit<Request, "id">;

let nextId = 1;

function entryArgs(args: string[]): string[] {
  const entry = process.argv[1];
  const commands = new Set(["daemon", "rpc", "session"]);
  if (entry && !entry.startsWith("-") && !commands.has(entry)) {
    return [entry, ...args];
  }
  return args;
}

function connect(endpoint: string): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(endpoint);
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function send<T>(endpoint: string, msg: Params): Promise<T> {
  const socket = await connect(endpoint);
  const id = nextId++;
  const req = { id, ...msg } as Request;

  return new Promise<T>((resolve, reject) => {
    let buf = "";

    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buf += chunk;
      const idx = buf.indexOf("\n");
      if (idx === -1) return;

      const line = buf.slice(0, idx);
      socket.end();

      try {
        const res = JSON.parse(line) as Response;
        if (res.id !== id) {
          reject(new Error("daemon returned mismatched response id"));
        } else if (res.ok) {
          resolve(res.result as T);
        } else {
          reject(new Error(res.error));
        }
      } catch (e) {
        reject(e);
      }
    });
    socket.on("error", reject);
    socket.write(stringify(req) + "\n");
  });
}

async function ping(endpoint: string): Promise<boolean> {
  try {
    await send(endpoint, { method: "ping", params: {} });
    return true;
  } catch {
    return false;
  }
}

function spawnDaemon(label: string, extra: string[]) {
  const args = entryArgs(["daemon", "--label", label, ...extra]);
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, IGF_DAEMON: "1" },
  });
  child.unref();
}

export interface ClientOpts {
  label?: string;
  project?: string;
  frida?: string;
}

export async function endpoint(opts: ClientOpts = {}): Promise<string> {
  const label = opts.label ?? "default";
  const extra: string[] = [];
  if (opts.project) extra.push("--project", path.resolve(opts.project));
  if (opts.frida) extra.push("--frida", opts.frida);

  const known = await readManifest(label);
  if (known && (await ping(known.endpoint))) return known.endpoint;

  await stale(label);
  spawnDaemon(label, extra);

  for (let i = 0; i < 100; i++) {
    const manifest = await readManifest(label);
    if (manifest && (await ping(manifest.endpoint))) return manifest.endpoint;
    await sleep(50);
  }

  const p = paths(label);
  throw new Error(`daemon did not start at ${p.endpoint}`);
}

export async function call<T>(msg: Params, opts: ClientOpts = {}): Promise<T> {
  return send<T>(await endpoint(opts), msg);
}

export async function callKnown<T>(msg: Params, opts: ClientOpts = {}): Promise<T> {
  const label = opts.label ?? "default";
  const known = await readManifest(label);
  if (!known) throw new Error(`daemon ${label} is not running`);
  return send<T>(known.endpoint, msg);
}
