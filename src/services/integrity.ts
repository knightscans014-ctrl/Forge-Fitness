// Play Integrity API — device + app integrity verification.
//
// WHY SERVER-SIDE: The integrity verdict must be verified on YOUR server, not
// trusted from the client (a modded APK would just lie about being "genuine").
// Flow:
//   1. App requests an integrity token from the native Play Integrity module.
//   2. App sends that token to your backend (Supabase Edge Function).
//   3. Backend calls Google's Play Integrity API to verify the token.
//   4. Backend returns the verdict + a signed "OK to run" flag.
//   5. App only proceeds if the backend confirms integrity.
//
// Setup (free):
//   - Enable the Play Integrity API in Google Cloud Console (no cost).
//   - In build.gradle, add: implementation 'com.google.android.play:integrity:1.4.0'
//   - Create a Supabase Edge Function `verify-integrity` that calls Google.
//   - Put your service account key env var on the backend ONLY.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nativeIntegrity: any = null;

// Bridge to the native Play Integrity module. Set via a native module / config plugin.
export function initIntegrity(native: any): void {
  nativeIntegrity = native;
}

// Request an integrity token from the native layer.
export async function requestIntegrityToken(requestHash?: string): Promise<string | null> {
  if (!nativeIntegrity) return null;
  try {
    const token = await nativeIntegrity.requestIntegrityToken(requestHash);
    return token;
  } catch {
    return null;
  }
}

export interface IntegrityVerdict {
  ok: boolean;
  deviceIntegrity: string;      // MEETS_DEVICE_INTEGRITY / not
  appIntegrity: string;         // PLAY_RECOGNIZED / UNRECOGNIZED_VERSION
  accountDetails: string;
  requestHash: string;
}

// Verify the token against your backend. Returns a server-confirmed verdict.
export async function verifyIntegrity(integrityToken: string): Promise<IntegrityVerdict | null> {
  try {
    // In prod: supabase.functions.invoke('verify-integrity', { body: { token: integrityToken } })
    // The edge function calls Google, verifies, and returns the verdict.
    const res = await fetch('https://YOUR-SUPABASE-PROJECT.functions.supabase.co/verify-integrity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: integrityToken }),
    });
    if (!res.ok) return null;
    const verdict = await res.json();
    return verdict;
  } catch {
    return null;
  }
}

// High-level gate used at startup.
// Returns:
//   true  -> server confirms genuine install (safe to run)
//   false -> integrity configured but device/app NOT genuine (block)
//   null  -> integrity not configured (e.g. dev) -> do NOT block
export async function isDeviceGenuine(): Promise<boolean | null> {
  if (!nativeIntegrity) return null; // not configured -> don't block
  const token = await requestIntegrityToken();
  if (!token) return false; // integrity module present but no token -> block
  const verdict = await verifyIntegrity(token);
  if (!verdict) return false;
  return (
    verdict.ok &&
    verdict.deviceIntegrity === 'MEETS_DEVICE_INTEGRITY' &&
    verdict.appIntegrity === 'PLAY_RECOGNIZED'
  );
}
