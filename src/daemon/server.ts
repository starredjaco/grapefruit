import fs from "node:fs/promises";
import net from "node:net";

import env from "../lib/env.ts";
import { paths, stale, writeManifest } from "./run.ts";
import { Sessions } from "./sessions.ts";
import { stringify, type Request, type Response } from "./protocol.ts";

const sessions = new Sessions();

function send(socket: net.Socket, res: Response) {
  socket.write(stringify(res) + "\n");
}

async function handle(req: Request): Promise<unknown> {
  switch (req.method) {
    case "ping":
      return { pid: process.pid, project: env.workdir };
    case "shutdown":
      return true;
    case "session.list":
      return sessions.list();
    case "session.open":
      return sessions.open(req.params.target, req.params.replace);
    case "session.close":
      return sessions.close(req.params.id);
    case "session.gc":
      return sessions.gc();
    case "rpc":
      return sessions.rpc(
        {
          target: req.params.target,
          session: req.params.session,
          replace: req.params.replace,
        },
        req.params.ns,
        req.params.method,
        req.params.args,
      );
  }
}

async function onLine(socket: net.Socket, line: string, stop: () => Promise<void>) {
  let req: Request;
  try {
    req = JSON.parse(line) as Request;
  } catch {
    send(socket, { id: 0, ok: false, error: "invalid json" });
    return;
  }

  try {
    send(socket, { id: req.id, ok: true, result: await handle(req) });
    if (req.method === "shutdown") {
      socket.end();
      setTimeout(() => void stop(), 20);
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    send(socket, { id: req.id, ok: false, error });
  }
}

export async function start(label = "default"): Promise<net.Server> {
  const p = paths(label);
  await fs.mkdir(p.dir, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") {
    await fs.rm(p.sock, { force: true });
  }

  async function stop() {
    server.close();
    await sessions.shutdown();
    await stale(label);
  }

  const server = net.createServer((socket) => {
    let buf = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buf += chunk;
      for (;;) {
        const idx = buf.indexOf("\n");
        if (idx === -1) break;
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        void onLine(socket, line, stop);
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(p.endpoint, () => {
      server.off("error", reject);
      resolve();
    });
  });

  await writeManifest(label);
  console.info(`igfd listening at ${p.endpoint}`);
  return server;
}

export async function run(label = "default"): Promise<void> {
  const server = await start(label);

  async function close() {
    server.close();
    await sessions.shutdown();
    await stale(label);
    process.exit(0);
  }

  for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"] as const) {
    process.on(sig, () => void close());
  }
}
