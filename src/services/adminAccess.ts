// Stealth admin access control.
//
// Admin is never visibly exposed. Access requires BOTH:
//   1. A secret code (the app owner knows it), AND
//   2. Optional: the signed-in email matching the owner allowlist.
//
// The UI provides an invisible long-press gate; this module holds the secret
// comparison + owner checks so the trigger can't be found by casual inspection.

// Owner email allowlist (REPLACE with your email). Empty array = any logged-in
// user who knows the code could open admin — set this for real security.
export const OWNER_EMAILS: string[] = ['your-owner-email@example.com'];

// The secret admin code. CHANGE THIS to something only you know.
export const ADMIN_SECRET = 'REDACTED-OLD-ADMIN-CODE';

export function isOwnerEmail(email?: string | null): boolean {
  if (OWNER_EMAILS.length === 0) return true; // dev mode: no email lock
  return !!email && OWNER_EMAILS.includes(email.toLowerCase());
}

export function checkAdminCode(entered: string): boolean {
  return entered === ADMIN_SECRET;
}
