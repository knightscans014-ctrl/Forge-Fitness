// APK version check for sideloaded distribution (UptoDown / website etc).
// Fetches a small latest.json from your site; if a newer version exists,
// prompts the user to update from your website.

import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// Point this at a JSON file you host on your website:
//   { "version": "0.1.1", "apkUrl": "https://your-site.com/forge.apk" }
// Set EXPO_PUBLIC_VERSION_MANIFEST_URL in .env. When unset, the update check
// is skipped entirely rather than hammering a placeholder domain.
const VERSION_MANIFEST_URL = process.env.EXPO_PUBLIC_VERSION_MANIFEST_URL || '';

export interface VersionInfo {
  version: string;
  apkUrl: string;
  notes?: string;
}

export async function checkForUpdate(): Promise<VersionInfo | null> {
  if (!VERSION_MANIFEST_URL) return null; // not configured -> no update check
  try {
    const res = await fetch(VERSION_MANIFEST_URL, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) return null;
    const info: VersionInfo = await res.json();
    const current = Constants.expoConfig?.version || '0.1.0';
    return compareVersions(info.version, current) > 0 ? info : null;
  } catch {
    return null;
  }
}

export async function openUpdate(info: VersionInfo): Promise<void> {
  try {
    await Linking.openURL(info.apkUrl);
  } catch {
    // ignore
  }
}

// Simple semver compare.
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}
