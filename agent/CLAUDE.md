This folder is the frida agent source code.

## Test a single RPC:

Build the agent first, then load the compiled Frida script:

`bun run build:droid`

`frida -U -F -l dist/droid.js -e 'rpc.exports.invoke("info", "processInfo", [])' -q`

If the RPC returns a Promise, use

`frida -U -F -l dist/droid.js -e 'rpc.exports.invoke("manifest", "xml", []).then(result => console.log(result)).catch(err => console.error(err))' -q`

## Build

`bun run build` can build all agents, types at once. But sometimes you just need
to build a particular agent, for example `bun run build:droid` or `bun run build:fruity`
