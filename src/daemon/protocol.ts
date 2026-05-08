import type { Mode, Platform } from "../types.ts";

export interface Target {
  deviceId: string;
  platform: Platform;
  mode: Mode;
  bundle?: string;
  pid?: number;
  name?: string;
}

export interface SessionInfo extends Target {
  id: string;
  key: string;
  state: "opening" | "ready" | "detached" | "closing";
  refs: number;
  createdAt: number;
  lastUsed: number;
  lifecycle?: string;
}

export type Request =
  | { id: number; method: "ping"; params?: {} }
  | { id: number; method: "shutdown"; params?: {} }
  | { id: number; method: "session.list"; params?: {} }
  | { id: number; method: "session.open"; params: { target: Target; replace?: boolean } }
  | { id: number; method: "session.close"; params: { id: string } }
  | { id: number; method: "session.gc"; params?: {} }
  | {
      id: number;
      method: "rpc";
      params: {
        target?: Target;
        session?: string;
        replace?: boolean;
        ns: string;
        method: string;
        args: unknown[];
      };
    };

export type Response =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

export interface Manifest {
  version: 1;
  pid: number;
  endpoint: string;
  label: string;
  project: string;
  startedAt: number;
}

export function stringify(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (item instanceof ArrayBuffer) {
      return {
        type: "bytes",
        data: Buffer.from(item).toString("base64"),
      };
    }
    if (ArrayBuffer.isView(item)) {
      return {
        type: "bytes",
        data: Buffer.from(item.buffer, item.byteOffset, item.byteLength).toString("base64"),
      };
    }
    return item;
  });
}
