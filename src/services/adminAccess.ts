// Stealth admin access control.
//
// This layer is OBFUSCATION, NOT SECURITY. Anything shipped in the APK can be
// read with hbctool/apktool, so treat the code below as a way to keep the admin
// panel hidden from casual users -- never as the thing that protects it.
//
// The REAL gate is server-side: the admins table has RLS with zero policies,
// and every privileged action goes through a SECURITY DEFINER function that
// calls is_admin(). Even someone who extracts the secret and opens the panel
// cannot approve a payment or grant premium.

// Owner email allowlist. Overridable at build time via
// EXPO_PUBLIC_OWNER_EMAILS (comma-separated) so the value isn't a source-code
// constant. Must match the seeded row in supabase/schema.sql.
// Empty by default. Set EXPO_PUBLIC_OWNER_EMAILS in your .env — if you fork
// this project and leave it unset, isOwnerEmail() fails closed for everyone,
// which is the safe outcome. It deliberately does NOT default to the upstream
// author's address.
const DEFAULT_OWNER_EMAILS: string[] = [];

export const OWNER_EMAILS: string[] = (
  process.env.EXPO_PUBLIC_OWNER_EMAILS
    ? process.env.EXPO_PUBLIC_OWNER_EMAILS.split(',')
    : DEFAULT_OWNER_EMAILS
)
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// The stealth code that reveals the panel. Override with EXPO_PUBLIC_ADMIN_CODE
// at build time. Changing this does NOT change who can actually approve
// payments -- that is enforced by the server.
// No usable default: this repository is public, so a hardcoded fallback would
// be a globally known code. An unset value yields a random per-launch string
// that nobody can type, keeping the panel hidden until you configure it.
export const ADMIN_SECRET: string =
  process.env.EXPO_PUBLIC_ADMIN_CODE ||
  `unset-${Math.random().toString(36).slice(2)}`;

export function isOwnerEmail(email?: string | null): boolean {
  // Fail CLOSED. An empty allowlist previously returned true for everyone,
  // which meant a misconfiguration silently opened the gate to any user.
  if (OWNER_EMAILS.length === 0) return false;
  return !!email && OWNER_EMAILS.includes(email.trim().toLowerCase());
}

// Constant-time-ish comparison so the check can't be timed character by
// character. (Defence in depth; the server is still the real authority.)
export function checkAdminCode(entered: string): boolean {
  const a = entered ?? '';
  const b = ADMIN_SECRET;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
