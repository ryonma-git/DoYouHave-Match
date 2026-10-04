// The old total-attempt count cannot distinguish successes from failures.
// Start a separate failure-only counter so old successful logins do not lock teachers out.
const COOKIE = 'dyhm_teacher_failures_v2';
const SESSION = 'dyhm_teacher_access_v1';
const LIMIT = 5;
const PASS_DIGEST = '09c2a7bba8d858ad8cdcef6f5376da964432a866098797690c22fd25468a560f';

function parseCount(value) {
  if (value === null || value === undefined) return 0;
  return /^\d+$/.test(value) ? Math.min(LIMIT, Number(value)) : LIMIT;
}
export function failureCount() {
  const value = document.cookie.split('; ').find(part => part.startsWith(`${COOKIE}=`))?.split('=')[1];
  let backup = null;
  try { backup = localStorage.getItem(COOKIE); } catch { /* Cookies remain the primary counter. */ }
  return Math.max(parseCount(value), parseCount(backup));
}
export function canAttempt() { return failureCount() < LIMIT; }
export function revokeAccess() { try { sessionStorage.removeItem(SESSION); } catch { /* Already inaccessible. */ } }
export function hasAccess() {
  try { return Number(sessionStorage.getItem(SESSION)) > Date.now(); } catch { return false; }
}
export async function unlock(passcode) {
  revokeAccess();
  if (!canAttempt()) return false;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passcode));
    const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    // Re-read after hashing so simultaneous submissions do not overwrite failures.
    const count = failureCount();
    if (count >= LIMIT) return false;
    if (hex !== PASS_DIGEST) {
      const path = new URL('./', location.href).pathname;
      document.cookie = `${COOKIE}=${count + 1}; Path=${path}; Max-Age=31536000; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
      try { localStorage.setItem(COOKIE, String(count + 1)); } catch { /* Cookie may still be usable. */ }
      return false;
    }
    // Successful logins neither consume nor reset the remaining failure allowance.
    sessionStorage.setItem(SESSION, String(Date.now() + 30 * 60 * 1000));
    return hasAccess();
  } catch { return false; }
}
