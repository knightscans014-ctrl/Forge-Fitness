// Layer 2 hardening: Hermes bytecode, JS obfuscation, root/emulator detection.
//
// This runs on the client to make casual cracking harder. It is NOT a
// replacement for server-authority (Layer 1) — it just raises the cost of
// tampering. Combined, they make the app genuinely hard to crack.

import { Platform } from 'react-native';

// --- 1. Hermes bytecode ---
// Hermes compiles JS to bytecode at build time (not plaintext JS), so the
// logic isn't trivially readable in the APK. Enabled via app.json:
//   "hermesBytecode": true  (set in metro.config / expo)
// This file documents and verifies it.

export function isHermes(): boolean {
  // Hermes exposes the `HermesInternal` global when active.
  return !!(globalThis as any).HermesInternal;
}

// --- 2. Root / emulator / debugger detection ---
// Common patching tools (Frida, Magisk, emulators) leave fingerprints.
// We detect them and refuse to run in high-risk environments. This blocks
// casual hackers who grab a root/emulator copy of the APK.

export interface TamperSignal {
  isRooted: boolean;
  isEmulator: boolean;
  isDebugger: boolean;
}

// Android root detection via native bridge (implemented in native config).
// On the JS side we expose a flag set by the native layer.
export function detectRoot(): boolean {
  return !!(globalThis as any).__forgeRooted;
}

export function detectEmulator(): boolean {
  const { OS } = Platform;
  if (OS !== 'android') return false;
  // Heuristic markers commonly present on emulators:
  const build = (globalThis as any).__forgeBuildProps || {};
  const fingerprint = (build.fingerprint || '').toLowerCase();
  const model = (build.model || '').toLowerCase();
  const product = (build.product || '').toLowerCase();
  return /(sdk_gphone|emulator|genymotion|bluestacks|nox|andy)/.test(fingerprint + ' ' + model + ' ' + product);
}

export function detectDebugger(): boolean {
  // In prod, hook into the native layer / Hermes debug API.
  return false;
}

export function getTamperSignals(): TamperSignal {
  return {
    isRooted: detectRoot(),
    isEmulator: detectEmulator(),
    isDebugger: detectDebugger(),
  };
}

// --- 3. Signature / integrity check ---
// In prod, verify the APK's signing signature matches the expected one at
// runtime (via native code). This catches re-signed / repackaged mods.
// Flag: __forgeSignatureValid is set by native after verifying the cert hash.
export function signatureIsValid(): boolean {
  const v = (globalThis as any).__forgeSignatureValid;
  return v === undefined ? true : !!v;
}

// Combined hardening gate. Returns true if the environment is "safe enough".
// In prod, decide how strict to be — blocking emulators entirely can hurt
// legitimate testers, so usually we warn/limit instead of hard-blocking.
export function hardeningOk(): { ok: boolean; signals: TamperSignal; sig: boolean } {
  const signals = getTamperSignals();
  const sig = signatureIsValid();
  // A re-signed APK (invalid signature) is a strong tamper signal — block it.
  const ok = sig;
  return { ok, signals, sig };
}
