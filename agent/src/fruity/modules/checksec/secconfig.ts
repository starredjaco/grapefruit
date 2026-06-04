// https://developer.apple.com/documentation/os/os_security_config_t

const HARDENED_HEAP = 0x1;
const TPRO = 0x2;
const MTE = 0x4;
const SCRIPT_RESTRICTIONS = 0x40;
const GUARD_OBJECTS = 0x100;

export interface SecurityConfig {
  // security-critical settings for system memory allocator
  hardenedHeap: boolean;
  // Trusted Path Read-Only
  tpro: boolean;
  // Memory Tagging Extension (ARM)
  mte: boolean;
  // script execution restrictions
  scriptRestrictions: boolean;
  // Guard Objects protection
  guardObjects: boolean;
  raw: string;
}

function parse(value: UInt64): SecurityConfig {
  const v = value.toNumber();
  return {
    hardenedHeap: !!(v & HARDENED_HEAP),
    tpro: !!(v & TPRO),
    mte: !!(v & MTE),
    scriptRestrictions: !!(v & SCRIPT_RESTRICTIONS),
    guardObjects: !!(v & GUARD_OBJECTS),
    raw: "0x" + value.toString(16),
  };
}

let fn: NativeFunction<UInt64, []> | null | undefined;

function get(): NativeFunction<UInt64, []> | null {
  if (fn !== undefined) return fn;

  const addr = Process.findModuleByName(
    "libsystem_platform.dylib",
  )?.findExportByName("os_security_config_get");
  fn = addr ? new NativeFunction(addr, "uint64", []) : null;
  return fn;
}

export function securityConfig(): SecurityConfig | null {
  const f = get();
  if (!f) return null;
  return parse(f());
}
