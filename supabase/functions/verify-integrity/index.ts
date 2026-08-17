// Supabase Edge Function: verify a Play Integrity token server-side.
//
// Deploy:
//   supabase functions deploy verify-integrity --no-verify-jwt
//
// Required secrets:
//   supabase secrets set GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT='<service account JSON>'
//   supabase secrets set ANDROID_PACKAGE_NAME='com.yourcompany.forge'
//
// This is the ONLY place a Play Integrity verdict is trusted. The client sends
// a token; this function asks Google to decode it and returns the verdict.
//
// The previous version NEVER called Google -- `decoded` was a hardcoded
// all-pass object, so `ok` was always true and the whole integrity gate was
// decorative. This one performs the real exchange and FAILS CLOSED: if the
// service account is missing or Google rejects the token, it returns ok:false.

// Deno runtime (Supabase Edge Functions).
declare const Deno: { env: { get(k: string): string | undefined } };

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/playintegrity';

// --- helpers ---------------------------------------------------------------

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(body);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

/** Mint a Google OAuth access token from the service account (RS256 JWT grant). */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) throw new Error('no access_token from Google');
  return data.access_token as string;
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// A verdict that blocks. Used for every failure path so the gate fails CLOSED.
function denied(reason: string, status = 200): Response {
  return json({
    ok: false,
    deviceIntegrity: 'UNKNOWN',
    appIntegrity: 'UNKNOWN',
    accountDetails: 'UNKNOWN',
    requestHash: '',
    error: reason,
  }, status);
}

// --- handler ---------------------------------------------------------------

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return denied('method not allowed', 405);

  try {
    const body = await req.json().catch(() => null);
    const token = body?.token;
    if (!token || typeof token !== 'string') return denied('missing token', 400);

    const rawSa = Deno.env.get('GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT');
    const packageName = Deno.env.get('ANDROID_PACKAGE_NAME');
    if (!rawSa || !packageName) {
      // Misconfiguration must NOT read as "genuine".
      return denied('integrity verification not configured', 503);
    }

    let sa: ServiceAccount;
    try {
      sa = JSON.parse(rawSa);
    } catch {
      return denied('invalid service account JSON', 503);
    }

    const accessToken = await getAccessToken(sa);

    const gRes = await fetch(
      `https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}:decodeIntegrityToken`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ integrityToken: token }),
      },
    );

    if (!gRes.ok) return denied(`play integrity api ${gRes.status}`, 200);

    const payload = await gRes.json();
    const decoded = payload?.tokenPayloadExternal ?? {};

    const deviceVerdicts: string[] = decoded?.deviceIntegrity?.deviceRecognitionVerdict ?? [];
    const appVerdict: string = decoded?.appIntegrity?.appRecognitionVerdict ?? 'UNKNOWN';
    const licensing: string = decoded?.accountDetails?.appLicensingVerdict ?? 'UNKNOWN';
    const requestPkg: string = decoded?.requestDetails?.requestPackageName ?? '';

    const deviceOk = Array.isArray(deviceVerdicts)
      ? deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY')
      : deviceVerdicts === 'MEETS_DEVICE_INTEGRITY';
    const appOk = appVerdict === 'PLAY_RECOGNIZED';
    // Guard against a token minted for a different app being replayed here.
    const pkgOk = !requestPkg || requestPkg === packageName;

    return json({
      ok: deviceOk && appOk && pkgOk,
      deviceIntegrity: Array.isArray(deviceVerdicts)
        ? (deviceVerdicts[0] ?? 'UNKNOWN')
        : (deviceVerdicts || 'UNKNOWN'),
      appIntegrity: appVerdict,
      accountDetails: licensing,
      requestHash: decoded?.requestDetails?.requestHash ?? '',
    });
  } catch (e) {
    return denied(String(e), 500);
  }
}

// Deno entrypoint.
// @ts-ignore -- available in the Edge runtime.
if (typeof Deno !== 'undefined' && (globalThis as any).Deno?.serve) {
  (globalThis as any).Deno.serve(handler);
}
