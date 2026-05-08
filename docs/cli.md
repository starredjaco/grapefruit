# CLI and Daemon

The command-line interface is the agent-facing control plane for Grapefruit.
It talks to a local daemon (`igfd`) that owns Frida sessions and recycles them
when they become idle.

There is no MCP layer. AI agents should use the CLI directly.

## Basic Flow

`igf rpc` attaches to an existing daemon session when possible and creates one
when needed:

```sh
igf rpc --device <udid> --platform ios --bundle com.example.app fs.ls /
igf rpc --device <serial> --platform android --bundle com.example.app app.info
igf rpc --device <udid> --platform ios --pid 123 --name backboardd fs.roots
```

The command acquires a short lease, runs one RPC call, then releases the lease.
The daemon keeps the Frida session alive until idle garbage collection closes it.

Use an explicit session id when a caller wants to bind to a specific existing
session:

```sh
igf session ls
igf rpc --session <id> fs.ls /
igf session close <id>
```

Arguments after `namespace.method` are parsed as JSON when they look like JSON.
Plain strings remain strings:

```sh
igf rpc --device <udid> --platform ios --bundle com.example.app fs.ls '"/tmp"'
igf rpc --device <udid> --platform ios --bundle com.example.app geolocation.fake 37.7749 -122.4194
```

Use `--json` for predictable machine output.

## Daemon Labels

Like tmux, multiple daemon instances can be selected by label:

```sh
igf -L default session ls
igf -L audit rpc --device <udid> --platform ios --bundle com.example.app fs.roots
igf -L audit daemon stop
```

If the selected daemon is not running, the CLI starts it automatically.

## Rendezvous Files

The daemon rendezvous lives in the user temp directory. These files are
advisory only; a daemon is considered alive only when the endpoint responds to
the protocol ping.

macOS and Linux:

```text
$TMPDIR/igf-$uid/<label>/
  igfd.sock
  igfd.pid
  igfd.json
```

Windows:

```text
%TEMP%\igf-<user-hash>\<label>\
  igfd.pid
  igfd.json

\\.\pipe\igf-<user-hash>-<label>
```

Durable data such as logs, stores, and pin snapshots still lives under the
project directory (`--project` or `PROJECT_DIR`). Temp files only identify the
running daemon.

## Session Policy

Session keys are stable:

```text
app:<device>:<platform>:<bundle>
daemon:<device>:<platform>:<pid>
```

For app sessions, `igf rpc` reuses the matching key or creates it. On iOS, only
one app session may be active on a device at a time. If a different iOS app
session is active, the daemon closes an idle one before attaching to the new
target. If that session has active references, the command fails unless
`--replace` is passed.

Daemon sessions are independent and do not participate in the iOS app-session
mutex.

Idle sessions are closed automatically:

- app sessions: 10 minutes
- inactive/background app sessions: 2 minutes
- daemon sessions: 30 minutes

The values can be overridden for tests or local workflows:

```sh
IGF_APP_SESSION_TTL_MS=600000
IGF_INACTIVE_SESSION_TTL_MS=120000
IGF_DAEMON_SESSION_TTL_MS=1800000
```
